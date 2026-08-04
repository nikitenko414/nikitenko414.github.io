const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Tracked in git (unlike content-incoming/, which is gitignored local scratch
// space) — this is what the GitHub Action commits to a draft PR for review.
const outRoot = path.join(__dirname, '..', 'telegram-inbox');

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set.');
  process.exit(1);
}
if (ALLOWED.length === 0) {
  console.error('TELEGRAM_ALLOWED_CHAT_IDS is not set — refusing to accept messages from anyone.');
  process.exit(1);
}

function apiCall(method, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.telegram.org/bot${TOKEN}/${method}${qs ? `?${qs}` : ''}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          if (!body.ok) {
            reject(new Error(`Telegram API ${method} failed: ${body.description}`));
            return;
          }
          resolve(body.result);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(filePath, destPath) {
  const url = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${filePath}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync(destPath, Buffer.concat(chunks));
        resolve();
      });
    }).on('error', reject);
  });
}

// Prefer an uncompressed document (full-quality upload) over Telegram's
// re-encoded/downscaled `photo` sizes, since project photos need to stay
// above the site's image-quality bar.
function pickMedia(message) {
  if (message.document && /^image\//.test(message.document.mime_type || '')) {
    return { fileId: message.document.file_id, name: message.document.file_name };
  }
  if (message.document && message.document.mime_type === 'application/pdf') {
    return { fileId: message.document.file_id, name: message.document.file_name || 'plan.pdf' };
  }
  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    return { fileId: largest.file_id, name: null };
  }
  return null;
}

function extFromPath(filePath, fallbackName) {
  const fromPath = path.extname(filePath || '');
  if (fromPath) return fromPath;
  const fromName = path.extname(fallbackName || '');
  return fromName || '.jpg';
}

async function main() {
  const updates = await apiCall('getUpdates', { limit: 100 });
  if (updates.length === 0) {
    console.log('No new updates.');
    return;
  }

  const groups = new Map();
  let maxUpdateId = 0;
  let skipped = 0;

  for (const update of updates) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);
    const message = update.message;
    if (!message) continue;

    const chatId = String(message.chat.id);
    if (!ALLOWED.includes(chatId)) {
      skipped += 1;
      continue;
    }

    const groupKey = message.media_group_id || `msg-${message.message_id}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        from: message.from ? `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() : 'unknown',
        date: new Date(message.date * 1000).toISOString(),
        texts: [],
        media: [],
      });
    }
    const group = groups.get(groupKey);
    if (message.caption) group.texts.push(message.caption);
    // Bare bot commands (/start, /help, ...) aren't content — skip them so
    // a colleague tapping "Start" doesn't create a junk inbox entry.
    if (message.text && !/^\/\w+(@\w+)?\s*$/.test(message.text.trim())) {
      group.texts.push(message.text);
    }

    const media = pickMedia(message);
    if (media) group.media.push(media);
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} message(s) from disallowed chat id(s).`);
  }

  let savedGroups = 0;
  for (const group of groups.values()) {
    if (group.texts.length === 0 && group.media.length === 0) continue;

    const folderName = `${group.date.slice(0, 10)}-${group.key}`;
    const dir = path.join(outRoot, folderName);
    fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });

    let n = 0;
    const files = [];
    for (const media of group.media) {
      n += 1;
      const fileInfo = await apiCall('getFile', { file_id: media.fileId });
      const ext = extFromPath(fileInfo.file_path, media.name);
      const destName = `${n}${ext}`;
      await downloadFile(fileInfo.file_path, path.join(dir, 'raw', destName));
      files.push(destName);
    }

    fs.writeFileSync(
      path.join(dir, 'message.json'),
      JSON.stringify({ from: group.from, date: group.date, text: group.texts.join('\n\n'), files }, null, 2)
    );

    console.log(`Saved ${folderName}: ${files.length} file(s), ${group.texts.length} text chunk(s)`);
    savedGroups += 1;
  }

  // Mark all fetched updates as consumed so the next run doesn't refetch them.
  await apiCall('getUpdates', { offset: maxUpdateId + 1, limit: 1 });

  console.log(savedGroups > 0 ? `Done — ${savedGroups} new item(s).` : 'Done — nothing new from allowed senders.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

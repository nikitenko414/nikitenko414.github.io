const sharp = require('sharp');

async function loadPixels(file) {
  const { data, info } = await sharp(file).resize(2481,1754).raw().greyscale().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function colDarkness(px, x, y0, y1) {
  let sum = 0, n = 0;
  for (let y = y0; y < y1; y++) { sum += 255 - px.data[y * px.width + x]; n++; }
  return sum / n;
}
function rowDarkness(px, y, x0, x1) {
  let sum = 0, n = 0;
  for (let x = x0; x < x1; x++) { sum += 255 - px.data[y * px.width + x]; n++; }
  return sum / n;
}

// Scan a wide x range at step, sampling darkness over [y0Pct,y1Pct], return all local peaks above threshold (as % positions), strongest first.
function scanVWalls(px, x0Pct, x1Pct, y0Pct, y1Pct, threshold = 150, step = 0.2) {
  const y0 = Math.round(y0Pct/100*px.height), y1 = Math.round(y1Pct/100*px.height);
  const pts = [];
  for (let xp = x0Pct; xp <= x1Pct; xp += step) {
    const x = Math.round(xp/100*px.width);
    if (x < 1 || x >= px.width - 1) continue;
    pts.push([xp, colDarkness(px, x, y0, y1)]);
  }
  // find local maxima above threshold, merging adjacent points within 1pt into one peak
  const peaks = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][1] < threshold) continue;
    if (peaks.length && pts[i][0] - peaks[peaks.length-1].pct < 1.0) {
      if (pts[i][1] > peaks[peaks.length-1].darkness) { peaks[peaks.length-1].pct = pts[i][0]; peaks[peaks.length-1].darkness = pts[i][1]; }
    } else {
      peaks.push({ pct: pts[i][0], darkness: pts[i][1] });
    }
  }
  return peaks.sort((a,b) => b.darkness - a.darkness).map(p => ({ pct: p.pct.toFixed(2), darkness: p.darkness.toFixed(0) }));
}
function scanHWalls(px, y0Pct, y1Pct, x0Pct, x1Pct, threshold = 150, step = 0.2) {
  const x0 = Math.round(x0Pct/100*px.width), x1 = Math.round(x1Pct/100*px.width);
  const pts = [];
  for (let yp = y0Pct; yp <= y1Pct; yp += step) {
    const y = Math.round(yp/100*px.height);
    if (y < 1 || y >= px.height - 1) continue;
    pts.push([yp, rowDarkness(px, y, x0, x1)]);
  }
  const peaks = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][1] < threshold) continue;
    if (peaks.length && pts[i][0] - peaks[peaks.length-1].pct < 1.0) {
      if (pts[i][1] > peaks[peaks.length-1].darkness) { peaks[peaks.length-1].pct = pts[i][0]; peaks[peaks.length-1].darkness = pts[i][1]; }
    } else {
      peaks.push({ pct: pts[i][0], darkness: pts[i][1] });
    }
  }
  return peaks.sort((a,b) => b.darkness - a.darkness).map(p => ({ pct: p.pct.toFixed(2), darkness: p.darkness.toFixed(0) }));
}

// Casts a ray outward from (xPct,yPct) in one of 4 directions, sampling a
// narrow perpendicular strip (bandPct wide, centered on the ray) at each
// step, and returns the position (as %) of the first strong wall hit.
// Starting *inside* a known room and walking outward, the first solid dark
// line hit is virtually always that room's real wall — far more reliable
// than guessing a boundary % and checking nearby.
function castRay(px, xPct, yPct, direction, opts = {}) {
  const bandPct = opts.bandPct || 3;
  const threshold = opts.threshold || 150;
  const step = opts.step || 0.15;
  const band = Math.round(bandPct / 100 * (direction === 'left' || direction === 'right' ? px.height : px.width));
  let pct = { left: xPct, right: xPct, up: yPct, down: yPct }[direction];
  const limit = (direction === 'left' || direction === 'up') ? 0 : 100;
  while ((direction === 'left' || direction === 'up') ? pct > limit : pct < limit) {
    pct += (direction === 'left' || direction === 'up') ? -step : step;
    let darkness;
    if (direction === 'left' || direction === 'right') {
      const x = Math.round(pct / 100 * px.width);
      const yC = Math.round(yPct / 100 * px.height);
      darkness = colDarkness(px, x, Math.max(0, Math.round(yC - band / 2)), Math.min(px.height, Math.round(yC + band / 2)));
    } else {
      const y = Math.round(pct / 100 * px.height);
      const xC = Math.round(xPct / 100 * px.width);
      darkness = rowDarkness(px, y, Math.max(0, Math.round(xC - band / 2)), Math.min(px.width, Math.round(xC + band / 2)));
    }
    if (darkness >= threshold) return { pct: Number(pct.toFixed(2)), darkness: Number(darkness.toFixed(0)) };
  }
  return { pct: Number(pct.toFixed(2)), darkness: null, hitEdge: true };
}

// Given a point inside a room (xPct,yPct — away from furniture icons if
// possible), finds all 4 surrounding walls and returns a CSS-ready box.
function findRoomBox(px, xPct, yPct, opts = {}) {
  const left = castRay(px, xPct, yPct, 'left', opts);
  const right = castRay(px, xPct, yPct, 'right', opts);
  const up = castRay(px, xPct, yPct, 'up', opts);
  const down = castRay(px, xPct, yPct, 'down', opts);
  return {
    box: {
      left: left.pct,
      top: up.pct,
      width: Number((right.pct - left.pct).toFixed(2)),
      height: Number((down.pct - up.pct).toFixed(2)),
    },
    walls: { left, right, up, down },
  };
}

module.exports = { loadPixels, scanVWalls, scanHWalls, castRay, findRoomBox, colDarkness, rowDarkness };

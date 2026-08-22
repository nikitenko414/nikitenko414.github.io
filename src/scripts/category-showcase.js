// Full-screen category showcase (homepage only): .category-showcase pins to
// the viewport, and ONE continuous video walks through all 4 categories
// (Будинки -> Інтер'єр -> Ландшафт -> Комерція) as a single unbroken shot —
// not four separate clips cross-dissolving into each other. Scrolling
// forward plays the video forward toward the next category's moment in
// that shot and holds there; scrolling back plays a separately pre-
// reversed copy of the same shot back toward the previous one and holds
// there. This is a deliberate change from an earlier version of this file:
// see below for why.
//
// What this replaces: a version with 4 separate video/photo layers
// stacked on top of each other, cross-fading via opacity as you scrolled
// (Apple-product-page "dissolve" style). That version was measured to
// work correctly end-to-end (checked every way available: direct value
// inspection, a real Chrome session, the deployed site) — but it was
// simply the wrong effect for what was actually wanted here: two images
// blended together mid-transition reads as looking "broken" (two things
// overlapping) if what you actually want is the feeling of one take that
// never cuts. Correctness of the crossfade was never the problem; it was
// building the wrong thing correctly.
//
// The four categories now correspond to four specific timestamps inside
// one combined video file (data-checkpoints, seconds, read from the
// <video>'s own data attribute so this file has no hard-coded numbers
// tied to specific source footage): checkpoint[0] is the first frame
// (Будинки, the house exterior), checkpoint[1] is where the original
// "houses" shot arrives at the interior kitchen (Інтер'єр), checkpoint[2]
// is where the shot that continues out to the pool/garden ends
// (Ландшафт), checkpoint[3] is the end of the shot that continues into
// the commercial building (Комерція). Scrolling from one category to the
// next plays *through* that stretch of footage in real time, then pauses
// exactly on the checkpoint frame — it does not scrub frame-by-frame with
// the scrollbar (that would mean seeking on every scroll tick, which is a
// discrete jump for video, not a smooth scrub — see the "no scroll-
// scrubbing" note below).
(function () {
  var section = document.getElementById('category-showcase');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var video = section.querySelector('.category-showcase-video');
  if (!video) return;

  var forwardSrc = video.dataset.videoForward;
  var reverseSrc = video.dataset.videoReverse;
  var checkpoints = video.dataset.checkpoints.split(',').map(Number);
  var count = checkpoints.length;
  var totalDuration = checkpoints[count - 1];

  var dots = section.querySelectorAll('.category-showcase-dots [data-dot]');
  var contentEl = document.getElementById('showcase-content');
  var kickerEl = document.getElementById('showcase-kicker');
  var titleEl = document.getElementById('showcase-title');
  var descEl = document.getElementById('showcase-desc');
  var ctaEl = document.getElementById('showcase-cta');

  var categories = [
    { kicker: '01 / 04', title: 'Будинки', desc: 'Приватні житлові будинки та вілли, де архітектура підпорядкована світлу, ландшафту й способу життя мешканців.', href: 'houses.html' },
    { kicker: '02 / 04', title: "Інтер'єр", desc: "Інтер'єрні рішення для будинків, квартир і лофтів — там, де завершується архітектура й починається щоденне життя.", href: 'interior.html' },
    { kicker: '03 / 04', title: 'Ландшафтний дизайн', desc: 'Сади, двори та приватні парки, що продовжують архітектуру будинку назовні й працюють у будь-яку пору року.', href: 'landscape.html' },
    { kicker: '04 / 04', title: 'Комерційні приміщення', desc: 'Офіси, шоуруми та бізнес-центри, де простір підтримує роботу команди й формує враження про бренд.', href: 'commercial.html' }
  ];

  var currentActive = -1;
  function applyContent(index) {
    var data = categories[index];
    if (!data) return;
    kickerEl.textContent = data.kicker;
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    ctaEl.href = data.href;
  }
  function setActive(index) {
    if (index === currentActive) return;
    currentActive = index;
    contentEl.classList.add('is-swapping');
    applyContent(index);
    void contentEl.offsetWidth;
    contentEl.classList.remove('is-swapping');
    dots.forEach(function (dot) {
      dot.setAttribute('aria-current', Number(dot.dataset.dot) === index ? 'true' : 'false');
    });
  }
  applyContent(0);

  // --- Single-video playback state -----------------------------------
  // currentTimeForward is "where the walkthrough conceptually is,"
  // expressed as a time in the *forward* file's timeline, regardless of
  // whether the forward or reverse file is the one actually loaded right
  // now (the reverse file's own time is just totalDuration - this).
  var currentTimeForward = 0;
  var activeDirection = 1; // 1 = forward file loaded, -1 = reverse file loaded
  var targetIndex = 0;
  // True whenever the video is deliberately resting at a checkpoint —
  // set right before that intentional pause() and only ever cleared
  // right before the *next* intentional play() starts (in goToIndex), not
  // immediately after pause() returns. That distinction turned out to
  // matter: a video's 'pause' event fires asynchronously, not inline with
  // the pause() call that triggered it, so a flag reset synchronously
  // right after pause() had already flipped back to false by the time the
  // event listener below actually ran — making every checkpoint arrival
  // look like an *unintentional* stop and get auto-resumed, which is what
  // silently carried playback straight through several checkpoints past
  // the intended one (confirmed live: paused() was called correctly at
  // the target time, but the self-heal listener resumed it milliseconds
  // later and it kept playing to the very end of the file). A flag that
  // stays true until something else deliberately clears it survives that
  // delay regardless of exactly when the browser gets around to firing
  // the event.
  var restingAtCheckpoint = false;

  // A scroll gesture (and especially trackpad momentum) is over in well
  // under a second, but the footage between two checkpoints can take
  // several real seconds to play through at native speed — the mismatch
  // between "I stopped scrolling" and "the video is still catching up"
  // reads as the page hesitating or half-responding, not as a deliberate
  // animation. Playing transitions faster than native speed shrinks that
  // gap without needing to touch how much footage exists between
  // checkpoints.
  var PLAYBACK_RATE = 2.2;
  // Будинки <-> Інтер'єр (checkpoints[0] <-> checkpoints[1]) is the
  // establishing shot — the exterior approach into the house — and reads
  // better lingering a bit longer than the faster pace works fine for on
  // the shorter segments after it.
  var SLOW_PLAYBACK_RATE = 1.5;

  function toReverseTime(t) { return totalDuration - t; }

  // Self-heals a video that stops without this file asking it to (buffering
  // stall, background/power throttling, or similar — anything that isn't
  // this file's own intentional pause at a checkpoint).
  video.addEventListener('pause', function () {
    if (restingAtCheckpoint || video.ended) return;
    var playResult = video.play();
    if (playResult && playResult.catch) playResult.catch(function () {});
  });

  // Only one of these can legitimately be "in flight" at a time — a fast
  // scroll can call goToIndex again (with a further target) before the
  // previous target is ever reached, and without this, the *previous*
  // call's listener stayed attached too: both then raced to see whichever
  // target the video's currentTime hit first, occasionally letting the
  // video run all the way past a nearer target while the caption (updated
  // synchronously in goToIndex, not from this listener) had already moved
  // on to a farther one — the two disagreeing is exactly what a fast
  // scroll test surfaced live (caption "Ландшафтний дизайн" while
  // currentTime had already run to the very end of the file).
  var activeMonitor = null;
  function monitorTowards(targetTimeInActiveFile, onArrive) {
    // requestAnimationFrame, not the 'timeupdate' event: timeupdate only
    // fires a handful of times per second (browsers throttle it — real
    // measurement earlier put it around 4/s), so however far the video
    // plays *between* two consecutive timeupdate ticks is how far past
    // the target it can already be before this ever notices. At native
    // 1x speed that overshoot was small enough to land back on the same
    // still-blended crossfade frame it was already showing, so snapping
    // currentTime back read as nothing. At the faster transition speed
    // (see PLAYBACK_RATE) that same tick gap covers more video-time, and
    // the overshoot could land past the *next* crossfade entirely, onto
    // genuinely different footage — confirmed live: scrolling into
    // Інтер'єр, the video correctly ends up holding the interior frame,
    // but the landscape frame it overshot onto flashes on screen for a
    // moment first, before the snap-back. rAF runs on every rendered
    // frame (so up to 60+ times/sec) regardless of playback rate, which
    // keeps the maximum overshoot small enough that the snap-back happens
    // before a wrong frame ever actually gets painted.
    if (activeMonitor !== null) cancelAnimationFrame(activeMonitor);
    function check() {
      if (video.paused) return;
      if (video.currentTime >= targetTimeInActiveFile - 0.02) {
        restingAtCheckpoint = true;
        video.pause();
        video.currentTime = targetTimeInActiveFile;
        activeMonitor = null;
        onArrive();
        return;
      }
      activeMonitor = requestAnimationFrame(check);
    }
    activeMonitor = requestAnimationFrame(check);
  }

  // No scroll-scrubbing on purpose: seeking a <video> on every scroll
  // tick is a discrete jump (no smooth in-between frames), so tying
  // currentTime directly to scroll position reads as stutter, not a
  // scrub. What actually looks smooth is letting the browser play the
  // footage at its own native rate once a direction is decided, and only
  // holding on the checkpoint frame once arrived — the same principle
  // the per-category videos in the previous version of this file used,
  // just spanning one combined shot instead of four separate ones.
  function goToIndex(index) {
    index = Math.max(0, Math.min(count - 1, index));
    targetIndex = index;
    // Re-sync from wherever the video *actually* is right now, not just
    // wherever the last-completed transition left off — a fast scroll can
    // call goToIndex again while a previous transition is still mid-
    // flight (activeMonitor still set), and currentTimeForward would
    // otherwise still reflect the transition *before* that one.
    if (activeMonitor !== null) {
      currentTimeForward = activeDirection === 1 ? video.currentTime : toReverseTime(video.currentTime);
    }
    var targetTimeForward = checkpoints[index];
    if (Math.abs(targetTimeForward - currentTimeForward) < 0.01) {
      setActive(index);
      return;
    }
    var needDirection = targetTimeForward > currentTimeForward ? 1 : -1;
    var wantedSrc = needDirection === 1 ? forwardSrc : reverseSrc;
    if (activeDirection !== needDirection) {
      activeDirection = needDirection;
      video.setAttribute('src', wantedSrc);
      video.load();
      var seekTo = needDirection === 1 ? currentTimeForward : toReverseTime(currentTimeForward);
      video.currentTime = seekTo;
    }
    var targetTimeInActiveFile = needDirection === 1 ? targetTimeForward : toReverseTime(targetTimeForward);
    monitorTowards(targetTimeInActiveFile, function () {
      currentTimeForward = targetTimeForward;
      setActive(index);
    });
    // Clearing this here, right before the intentional play() that's
    // about to start, is what makes it safe against the pause event's
    // async timing (see restingAtCheckpoint's own comment) — by the time
    // any 'pause' event from the *previous* checkpoint arrival could still
    // fire, this is already false, so that stale event no longer matters
    // either way once a new transition has genuinely started.
    restingAtCheckpoint = false;
    // Set on every transition, not once at setup — assigning a new `src`
    // and calling load() (the branch just above, on a direction switch)
    // resets a video element's playbackRate back to 1 in some browsers.
    var isHousesInteriorLeg =
      (index === 1 && Math.abs(currentTimeForward - checkpoints[0]) < 0.1) ||
      (index === 0 && Math.abs(currentTimeForward - checkpoints[1]) < 0.1);
    video.playbackRate = isHousesInteriorLeg ? SLOW_PLAYBACK_RATE : PLAYBACK_RATE;
    var playResult = video.play();
    if (playResult && playResult.catch) playResult.catch(function () {});
    // Deliberately NOT calling setActive(index) here. It used to update
    // the caption to the destination immediately, before the footage
    // arrived — reasonable in principle (like a chapter title changing
    // the instant you jump to that chapter), but real scroll input isn't
    // that clean: trackpad momentum can push the target one category
    // further for a moment and then settle back, and each of those brief
    // overshoots called goToIndex with its own index, which flashed the
    // caption to a category the video was never actually going to stop
    // on (reported live: scrolling Будинки -> Інтер'єр, the video correctly
    // played to and held on the interior frame, but the caption flashed
    // "Ландшафтний дизайн" for a moment first). Only the onArrive callback
    // in monitorTowards calls setActive now, so the caption changes at the
    // same moment the video actually stops — the two can no longer
    // disagree, at the cost of the caption lagging slightly behind a
    // scroll that's still actively moving, same as the video itself does.
  }

  // pin keeps the viewport locked on .category-showcase-sticky for the
  // section's scroll distance (via ScrollTrigger's own spacer element,
  // not CSS position:sticky — see git history for the cross-browser
  // pinning issues that ruled that out). No scrub, no timeline of tweens:
  // the only thing driven by scroll here is *which checkpoint index is
  // currently the target*, via plain rounding of scroll progress — the
  // video's own playback handles all the actual motion.
  // 100vh of scroll per transition (the original figure) was calibrated
  // against the *longest* segment (Будинки -> Інтер'єр, ~6s of footage).
  // The two segments after it are much shorter (~2.8s, ~3s), but get the
  // exact same 100vh — an ordinary scroll flick, especially trackpad
  // momentum, that's perfectly reasonable for triggering one transition
  // can easily cover more than 100vh in a single continuous motion, which
  // means `rounded` can jump straight from 1 to 3 in one onUpdate tick:
  // reported live as the video skipping over Ландшафт and landing on
  // Комерція, never pausing on the one in between. 150vh per transition
  // (vs. 100vh) makes that take a proportionally bigger, less casual
  // scroll motion to happen, on every transition, not just the short
  // ones specifically — there's no equivalent "how much scroll is one
  // flick" number to key a per-transition value off instead.
  var VH_PER_TRANSITION = 150;
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    // A function, not a '+=450%' string — that percentage form resolves
    // against the *trigger element's own* height, not the viewport, and
    // pinning changes what the trigger's height even is (ScrollTrigger
    // inserts a spacer to reserve the scroll distance, so the trigger's
    // height is itself downstream of this same `end` value). Measured
    // this going wrong directly: asking for 450% here produced a pin
    // distance around 50x the viewport height, not 4.5x. A function
    // anchored explicitly to window.innerHeight has no such circularity,
    // and ScrollTrigger already re-calls end() on refresh (e.g. resize)
    // on its own.
    end: function () { return '+=' + (count - 1) * VH_PER_TRANSITION / 100 * window.innerHeight; },
    pin: '.category-showcase-sticky',
    onUpdate: function (self) {
      var position = self.progress * (count - 1);
      var rounded = Math.round(position);
      if (rounded !== targetIndex) goToIndex(rounded);
    }
  });

  // Only ever ask the scroll to move — goToIndex is deliberately NOT
  // also called directly here. It already runs from ScrollTrigger's
  // onUpdate as scrollY animates toward this target, and calling it a
  // second time from here raced against that: two independent calls each
  // reading/writing the same currentTimeForward and video.currentTime a
  // few milliseconds apart, occasionally letting the video run straight
  // past the intended checkpoint before either call's monitor caught up.
  // One source of truth (scroll position) driving one thing that reacts
  // to it (goToIndex) avoids that entirely.
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var index = Number(dot.dataset.dot);
      var trigger = ScrollTrigger.getAll().filter(function (st) { return st.vars.trigger === section; })[0];
      if (!trigger) return;
      var targetProgress = index / (count - 1);
      var targetY = trigger.start + targetProgress * (trigger.end - trigger.start);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });
})();

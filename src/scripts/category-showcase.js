// Full-screen category showcase (homepage only): .category-showcase pins to
// the viewport and, as the user scrolls through it, blends between 4
// full-bleed visuals (Будинки, Інтер'єр, Ландшафт, Комерція) — Apple-
// product-page style, one image genuinely dissolving into the next, not a
// slide/section swap.
//
// This is now driven by GSAP's ScrollTrigger (pin + scrub), not hand-rolled
// scroll math. Three from-scratch versions were tried and dropped first:
//   1. A wheel-intercepted "one notch = one category" stepper, with
//      preventDefault + a forced ~550ms animation + a settle-timer to snap
//      back if a raw scroll stopped mid-transition. Every one of those
//      layers was fighting scroll physics the browser already gets right,
//      and each fix (freeze on direction reversal, "flies to the end" on
//      trackpad momentum, garbled text from stacked setTimeouts) turned out
//      to be the same root problem wearing a new symptom.
//   2. Four real 100vh sections with native CSS scroll-snap — robust
//      (no hand-rolled physics at all), but it read as distinct sections
//      sharpening into focus one after another, not one continuous image
//      flowing into the next, which is the whole point here.
//   3. A plain `scroll` listener + requestAnimationFrame computing a
//      triangular opacity falloff by hand from getBoundingClientRect() —
//      logically correct (verified: it does produce a genuine 50/50 blend
//      mid-transition) but with nothing governing *how much scroll input*
//      one transition spans, an ordinary fast flick could cross an entire
//      transition in a handful of frames, reading as an instant swap
//      instead of a dissolve.
// ScrollTrigger's pin+scrub is the standard tool for exactly this pattern
// (pin a section, scrub a timeline's progress to scroll position) — it
// owns the pin (handles the cross-browser footguns plain `position: sticky`
// has, using a spacer element instead), owns the scroll math, and `scrub`
// takes a smoothing value so scrubbing doesn't jump discontinuously even
// on a fast flick. What's genuinely custom to this project (which video
// plays forward vs. reversed, the self-healing pause listener, the text
// swap) stays as plain JS hooked into ScrollTrigger's onUpdate/onLeave/
// onEnterBack callbacks — GSAP owns the scroll-to-progress mapping, not the
// video/text behavior on top of it.
(function () {
  var section = document.getElementById('category-showcase');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var layers = section.querySelectorAll('.category-showcase-layer');
  var count = layers.length;
  if (!count) return;

  // Each video plays once per crossing into "clear focus" — opacity >=
  // FOCUS_THRESHOLD, not just >0 — forward if scrolled down into it, or a
  // real, separately pre-reversed clip if scrolled up back into it, and
  // holds on whichever frame it ends on. See git history for the two
  // approaches (manual currentTime seeking; a canvas frame sequence) tried
  // and dropped before landing on real forward/reverse <video> files.
  // FOCUS_THRESHOLD = 0.8 balances two failure modes: too low (e.g. any
  // opacity > 0) and a layer starts playing while still faintly
  // double-exposed with its neighbor; too high (e.g. >= 0.95, or "nearest
  // category") and a fast scroll tick can jump clean over the qualifying
  // band and never trigger at all. 0.8 leaves a 0.4-wide qualifying band —
  // wide enough that a single scroll tick has to cover a large fraction of
  // an entire transition to skip over it.
  var FOCUS_THRESHOLD = 0.8;
  var videoLayers = [];
  layers.forEach(function (layerEl, i) {
    var video = layerEl.querySelector('.category-showcase-video');
    if (!video) return;
    var vl = { index: i, video: video, reverseSrc: video.dataset.videoReverse, focused: false };
    videoLayers.push(vl);
    // Self-heals a video that stops without this file asking it to. Live-
    // traced: a <video> can end up paused seconds into a clip with neither
    // an error nor any pause() call from this code (buffering stall,
    // background/power throttling, or an autoplay-policy check landing
    // stricter several ticks into a scroll-driven chain than at page load).
    // 'pause' fires regardless of *why* playback stopped, so checking
    // vl.focused (false only once this code intentionally paused it for
    // having left focus) tells a self-inflicted stop apart from an
    // intentional one or a real end-of-clip.
    video.addEventListener('pause', function () {
      if (!vl.focused || video.ended) return;
      var playResult = video.play();
      if (playResult && playResult.catch) playResult.catch(function () {});
    });
  });

  function playForwardOrReverse(vl, direction) {
    // The <video> already has a <source src=forward> in the markup, so the
    // common case (scrolling down into a layer) needs no src swap or
    // reload — only touch src/.load() when reverse is actually needed, and
    // again when coming back to forward after having used reverse.
    var useReverse = direction < 0 && vl.reverseSrc;
    if (useReverse) {
      if (vl.video.getAttribute('src') !== vl.reverseSrc) {
        vl.video.setAttribute('src', vl.reverseSrc);
        vl.video.load();
      }
    } else if (vl.video.hasAttribute('src')) {
      vl.video.removeAttribute('src');
      vl.video.load();
    }
    vl.video.currentTime = 0;
    // play() rejects if the browser blocks autoplay for some reason (rare
    // given muted+playsinline, but possible pre-interaction on strict
    // mobile browsers) — swallow it rather than surface an unhandled
    // rejection; the poster frame is still a reasonable static fallback.
    var playResult = vl.video.play();
    if (playResult && playResult.catch) playResult.catch(function () {});
  }

  function updateVideoPlayback(opacityByIndex, direction) {
    videoLayers.forEach(function (vl) {
      var isFocused = opacityByIndex[vl.index] >= FOCUS_THRESHOLD;
      if (isFocused && !vl.focused) {
        vl.focused = true;
        playForwardOrReverse(vl, direction);
      } else if (!isFocused && vl.focused) {
        vl.focused = false;
        vl.video.pause();
      }
    });
  }

  var dots = section.querySelectorAll('.category-showcase-dots [data-dot]');
  var contentEl = document.getElementById('showcase-content');
  var kickerEl = document.getElementById('showcase-kicker');
  var titleEl = document.getElementById('showcase-title');
  var descEl = document.getElementById('showcase-desc');
  var ctaEl = document.getElementById('showcase-cta');

  // Order tells a spatial "walk-through" story, not the nav's alphabetical
  // order: approach the house -> step inside -> out into the garden/
  // landscape -> beyond the property line to commercial work.
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

  // Synchronous, single-state swap — no setTimeout, so there's never a
  // backlog of delayed callbacks for a fast scroll to reorder. The opacity
  // dip is a CSS transition (see .category-showcase-content in
  // premium.css) retriggered by the reflow-forcing offsetWidth read below.
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

  // The crossfade itself is a real gsap.timeline(), not opacity computed
  // by hand and poked into inline styles every onUpdate tick. Both report
  // the same progress number, but only a real tween is guaranteed to be
  // the thing actually driving paint: GSAP's own renderer owns these
  // opacity values once they're tweens, batching and scheduling the writes
  // itself, instead of this file re-deriving and re-assigning all 4 every
  // single tick regardless of whether anything visibly needs to change.
  // This is also the pattern GSAP's own crossfade examples use, not a
  // detail specific to this project.
  //
  // Every layer gets the same triangular shape: fade in from 0->1 while
  // position runs from (i-1) to i, fade out 1->0 while it runs from i to
  // (i+1) — layer 0 has no fade-in leg (starts already at opacity 1) and
  // the last layer has no fade-out leg, matching position's fixed 0..
  // count-1 range. Position units double as the timeline's own time units
  // (duration: 1 per leg) — with scrub attached, GSAP maps scroll progress
  // onto timeline.time() directly, so "position" and "timeline time" are
  // the same number.
  gsap.set(layers[0], { opacity: 1 });
  for (var li = 1; li < count; li++) gsap.set(layers[li], { opacity: 0 });

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=' + (count - 1) * 100 + '%',
      pin: '.category-showcase-sticky',
      scrub: 0.3,
      onUpdate: function (self) {
        // Deliberately NOT self.progress here. scrub adds smoothing lag
        // between raw scroll position and how far the timeline (and the
        // opacity tweens riding on it) has actually caught up — but
        // self.progress reports the *raw*, un-lagged scroll position.
        // On a fast real scroll (confirmed via a screen recording: the
        // caption read "Ландшафтний дизайн"/"Комерційні приміщення" while
        // the image on screen was still the commercial building on both),
        // that mismatch is exactly what made the caption/video-focus logic
        // run a beat ahead of whatever the crossfade was actually showing.
        // tl.time() is the timeline's own current position — the same
        // number the opacity tweens are rendering from — so reading
        // position from it instead keeps text and video-triggering
        // perfectly in step with what's visually on screen, lag and all.
        var position = tl ? tl.time() : self.progress * (count - 1);
        var direction = self.direction; // 1 = scrolling down, -1 = scrolling up
        var opacityByIndex = [];
        layers.forEach(function (layer, i) {
          opacityByIndex[i] = gsap.getProperty(layer, 'opacity');
        });
        updateVideoPlayback(opacityByIndex, direction);
        setActive(Math.round(position));
      }
    }
  });
  layers.forEach(function (layer, i) {
    if (i > 0) tl.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'none' }, i - 1);
    if (i < count - 1) tl.to(layer, { opacity: 0, duration: 1, ease: 'none' }, i);
  });

  // ScrollTrigger measures the pin start/end at setup time, based on
  // whatever the page's layout height is *right then*. This section's own
  // height never changes (it's driven by ScrollTrigger's `end` config, not
  // document flow), but content further down the page does keep shifting
  // as web fonts swap in (font-display) and lazy images/posters finish
  // loading and take up their real box — each of those changes the
  // document's total height *after* ScrollTrigger already measured it.
  // ScrollTrigger doesn't know to recheck on its own for that (it reacts
  // to window resize, not arbitrary later layout shifts elsewhere on the
  // page), so a stale measurement is a real, separate way this could look
  // broken beyond anything the crossfade math itself controls: refresh
  // once more once fonts and the full page (images included) have
  // actually finished loading.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  // Dots jump straight to a category's ScrollTrigger position via the
  // browser's own smooth scrolling — no extra GSAP plugin needed for a
  // plain scroll-to-Y.
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

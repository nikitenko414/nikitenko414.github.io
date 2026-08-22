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

  // position runs 0..count-1 (0..3): fully on category i exactly at
  // position === i, blending into its neighbor as position moves away —
  // same triangular falloff for every layer, so every adjacent pair
  // genuinely crossfades rather than one category getting special-cased.
  function applyPosition(position, direction) {
    var opacityByIndex = [];
    layers.forEach(function (layer, i) {
      var opacity = Math.max(0, 1 - Math.abs(position - i));
      opacityByIndex[i] = opacity;
      layer.style.opacity = String(opacity);
      layer.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
    });
    updateVideoPlayback(opacityByIndex, direction);
    setActive(Math.round(position));
  }

  applyContent(0);
  applyPosition(0, 1);

  // pin: true keeps the viewport locked on .category-showcase-sticky for
  // the section's full scroll distance, using a spacer element under the
  // hood rather than plain CSS `position: sticky` (sticky has known
  // cross-browser pinning/flicker edge cases with nested overflow —
  // ScrollTrigger's own pin sidesteps them). scrub maps scroll position to
  // timeline progress directly — no separate rAF/scroll-listener loop to
  // hand-write, and no risk of the crossfade zone being too narrow for an
  // ordinary scroll flick to resolve, since `end` below fixes exactly how
  // much scroll distance the whole 0..3 range spans regardless of scroll
  // speed. scrub: 0.3 (rather than `true`) adds a small smoothing lag so a
  // fast flick still visibly dissolves instead of jumping frames.
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=' + (count - 1) * 100 + '%',
    pin: '.category-showcase-sticky',
    scrub: 0.3,
    onUpdate: function (self) {
      var position = self.progress * (count - 1);
      var direction = self.direction; // 1 = scrolling down, -1 = scrolling up
      applyPosition(position, direction);
    }
  });

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

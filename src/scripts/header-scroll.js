// Header is always position:fixed (see premium.css). This script:
// 1. Measures the header's real rendered height (handles mobile nav-wrap)
//    and exposes it as --header-height so non-hero pages get correct
//    padding-top instead of content hiding under the fixed bar.
// 2. Marks the header transparent-overlay only on pages whose <main> starts
//    with a hero photo (main.has-hero-page, set via template front matter)
//    — everywhere else it keeps its normal solid background from the start.
// 3. On overlay pages, sets --scroll-progress (0 → 1) on every scroll frame
//    as you scroll through the first FADE_DISTANCE px, so the header's
//    background/blur/border-color fade in continuously with scroll position
//    (see .site-header-overlay in premium.css) instead of snapping in at a
//    fixed point — that hard cut is what read as jarring before.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  var isOverlay = !!document.querySelector('main.has-hero-page');
  if (!isOverlay) return;
  header.classList.add('site-header-overlay');

  var FADE_DISTANCE = 160;
  var ticking = false;

  function updateProgress() {
    var progress = Math.min(1, Math.max(0, window.scrollY / FADE_DISTANCE));
    header.style.setProperty('--scroll-progress', progress);
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateProgress();
})();

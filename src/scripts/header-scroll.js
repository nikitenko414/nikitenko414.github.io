// Header is always position:fixed (see premium.css). This script:
// 1. Measures the header's real rendered height (handles mobile nav-wrap)
//    and exposes it as --header-height so non-hero pages get correct
//    padding-top instead of content hiding under the fixed bar.
// 2. Marks the header transparent-overlay only on pages whose <main> starts
//    with a hero photo (main.has-hero-page, set via template front matter)
//    — everywhere else it keeps its normal solid background from the start.
// 3. Toggles .scrolled once you scroll past ~40px, giving it a blurred
//    background so nav stays legible over whatever content is behind it.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  if (document.querySelector('main.has-hero-page')) {
    header.classList.add('site-header-overlay');
  }

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

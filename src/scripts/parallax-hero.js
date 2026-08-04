// Subtle scroll-linked parallax on the hero photo: the image drifts slower
// than the page, capped at 60px so it never reveals past its own edges
// (.hero has overflow:hidden). transform only, rAF-throttled, skipped
// entirely under prefers-reduced-motion.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var img = document.querySelector('.hero-media img');
  if (!img) return;

  var ticking = false;
  function update() {
    var offset = Math.min(window.scrollY * 0.15, 60);
    img.style.transform = 'translateY(' + offset + 'px) scale(1.08)';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
})();

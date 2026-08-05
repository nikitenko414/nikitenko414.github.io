// Floating "back to top" button: hidden until the page has scrolled past
// one viewport height, then fades/lifts in. Click scrolls to #top —
// smooth unless the user prefers reduced motion.
(function () {
  var btn = document.querySelector('.back-to-top');
  if (!btn) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onScroll() {
    btn.classList.toggle('is-visible', window.scrollY > window.innerHeight);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  btn.addEventListener('click', function () {
    var target = document.getElementById('top');
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (target) target.focus({ preventScroll: true });
  });
})();

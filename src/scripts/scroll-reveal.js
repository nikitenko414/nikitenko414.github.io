// Adds .reveal-on-scroll to project/journal cards and fades them in as they
// enter the viewport. Uses only opacity/transform (see premium.css) and does
// nothing if the browser lacks IntersectionObserver or the user prefers
// reduced motion — the CSS fallback already shows everything at full opacity.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var targets = document.querySelectorAll('.project-card, .journal-card, .testimonial-card');
  if (!targets.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(function (el) {
    el.classList.add('reveal-on-scroll');
    observer.observe(el);
  });
})();

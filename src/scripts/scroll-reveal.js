// Adds .reveal-on-scroll to cards/images/headings and fades them in (with a
// slight cascade for items in the same row/grid) as they enter the
// viewport. Uses only opacity/transform (see premium.css) and does nothing
// if the browser lacks IntersectionObserver or the user prefers reduced
// motion — the CSS fallback already shows everything at full opacity.
//
// .article-cover is deliberately excluded — it's the eager/fetchpriority
// LCP image on article pages, and delaying its paint until scroll would
// hurt the exact metric CLAUDE.md budgets (LCP), not just look bad.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var targets = document.querySelectorAll(
    '.project-card, .journal-card, .testimonial-card, .process-item, ' +
    '.article-body > h2, .project-gallery figure, .philosophy-media'
  );
  if (!targets.length) return;

  var groupSelectors = ['.carousel', '.related-grid', '.process-grid', '.testimonials-grid', '.blog-grid', '.project-gallery'];

  function staggerIndex(el) {
    for (var i = 0; i < groupSelectors.length; i++) {
      var parent = el.closest(groupSelectors[i]);
      if (parent) return Array.prototype.indexOf.call(parent.children, el);
    }
    return 0;
  }

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
    var idx = Math.min(Math.max(staggerIndex(el), 0), 5);
    if (idx > 0) el.style.transitionDelay = (idx * 110) + 'ms';
    observer.observe(el);
  });
})();

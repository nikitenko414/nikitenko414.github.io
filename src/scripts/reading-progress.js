// Thin fixed bar showing scroll progress through .article-body (blog posts,
// project pages). No-ops entirely on pages without one. Tracks scroll
// position 1:1 via transform: scaleX() — no CSS transition, since a lagged
// progress indicator would feel wrong; this isn't the kind of decorative
// motion prefers-reduced-motion is meant to suppress.
(function () {
  var article = document.querySelector('.article-body');
  var bar = document.querySelector('.reading-progress-bar');
  if (!article || !bar) return;

  var ticking = false;
  function update() {
    var rect = article.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var scrolled = -rect.top;
    var pct = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
    bar.style.transform = 'scaleX(' + pct + ')';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
})();

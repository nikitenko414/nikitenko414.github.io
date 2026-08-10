// Full-screen category showcase (homepage only): .category-showcase is
// 4x viewport height, .category-showcase-sticky pins to the viewport for
// that whole scroll distance. On every scroll frame this computes a
// continuous 0..3 "position" from how far through that distance the user
// has scrolled, and sets each of the 4 layers' opacity from a triangular
// function of its distance from that position — so layer 1 fades out
// exactly as layer 2 fades in, both partially visible mid-transition
// (a real crossfade, not a hard cut). Dot nav jumps straight to a given
// layer's scroll position. prefers-reduced-motion skips all of this —
// premium.css falls back to a plain stacked list of 4 static sections.
(function () {
  var section = document.getElementById('category-showcase');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var layers = section.querySelectorAll('.category-showcase-layer');
  var dots = section.querySelectorAll('.category-showcase-dots [data-dot]');
  var count = layers.length;
  if (!count) return;

  var ticking = false;

  function update() {
    var rect = section.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    var traveled = -rect.top;
    var progress = scrollable > 0 ? Math.min(1, Math.max(0, traveled / scrollable)) : 0;
    var position = progress * (count - 1);

    layers.forEach(function (layer, i) {
      var opacity = Math.max(0, 1 - Math.abs(position - i));
      layer.style.opacity = String(opacity);
    });

    var activeIndex = Math.round(position);
    dots.forEach(function (dot) {
      dot.setAttribute('aria-current', Number(dot.dataset.dot) === activeIndex ? 'true' : 'false');
    });

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = Number(dot.dataset.dot);
      var scrollable = section.offsetHeight - window.innerHeight;
      var targetY = section.offsetTop + (scrollable * idx) / (count - 1);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });
})();

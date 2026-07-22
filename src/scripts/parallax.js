(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var el = document.querySelector('[data-parallax]');
  if (!el) return;

  var ticking = false;
  var speed = Number(el.getAttribute('data-parallax')) || 0.3;

  function update() {
    var rect = el.parentElement.getBoundingClientRect();
    var offset = rect.top * speed;
    el.style.transform = 'translateY(' + offset + 'px)';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();
})();

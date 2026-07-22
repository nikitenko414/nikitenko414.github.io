(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var infos = document.querySelectorAll('.slide-info');
  var indexEl = document.getElementById('progress-index');
  var slides = document.querySelectorAll('.slide');

  if (reduceMotion) {
    infos.forEach(function (el) { el.classList.add('is-active'); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var info = entry.target.querySelector('.slide-info');
        if (info) {
          info.classList.toggle('is-active', entry.isIntersecting);
        }
        if (entry.isIntersecting && indexEl) {
          indexEl.textContent = entry.target.getAttribute('data-index');
        }
      });
    },
    { threshold: 0.55 }
  );

  slides.forEach(function (el) { observer.observe(el); });
})();

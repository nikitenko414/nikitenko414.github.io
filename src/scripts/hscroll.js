(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = document.querySelector('.hscroll');
  var track = document.querySelector('.hscroll-track');
  if (!section || !track) return;

  if (reduceMotion) {
    document.documentElement.classList.add('no-hscroll');
    return;
  }

  var ticking = false;

  function setHeight() {
    var distance = track.scrollWidth - window.innerWidth;
    section.style.height = Math.max(distance, 0) + window.innerHeight + 'px';
  }

  function update() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    var progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    var distance = track.scrollWidth - window.innerWidth;
    track.style.transform = 'translateX(-' + (progress * distance) + 'px)';
    ticking = false;
  }

  window.addEventListener('resize', setHeight);
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  setHeight();
  update();
})();

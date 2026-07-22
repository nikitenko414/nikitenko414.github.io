(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = document.querySelector('.scrolly');
  if (!section) return;

  if (reduceMotion) {
    document.documentElement.classList.add('no-scrolly');
    return;
  }

  var imgs = section.querySelectorAll('.scrolly-img');
  var copies = section.querySelectorAll('.scrolly-copy');
  var dots = section.querySelectorAll('.scrolly-progress span');
  var stepCount = imgs.length;
  var ticking = false;

  function setActive(index) {
    imgs.forEach(function (img, i) {
      img.classList.toggle('is-active', i === index);
    });
    copies.forEach(function (copy, i) {
      copy.classList.toggle('is-active', i === index);
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  function update() {
    var rect = section.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    var index = Math.min(stepCount - 1, Math.floor(progress * stepCount));
    setActive(index);
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

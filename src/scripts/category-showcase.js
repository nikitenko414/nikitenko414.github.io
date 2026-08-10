// Full-screen category showcase (homepage only): a self-contained
// scroll-snap "island" — .category-showcase-track is its own scroll
// container (height:100vh, scroll-snap-type:y mandatory), so once the
// visitor scrolls into it they move slide-to-slide, then scrolling past
// the last slide hands off to the normal page scroll below, same as
// entering it did from above. Reduced-motion turns off snapping entirely
// (see premium.css) and this script skips the blur/scale treatment,
// showing every slide at rest so nothing depends on the transition.
(function () {
  var track = document.getElementById('showcase-track');
  if (!track) return;

  var slides = track.querySelectorAll('.category-showcase-slide');
  var dots = document.querySelectorAll('.category-showcase-dots [data-dot]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setActive(index) {
    dots.forEach(function (dot) {
      var isActive = Number(dot.dataset.dot) === index;
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = Number(dot.dataset.dot);
      var target = slides[idx];
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  if (reduceMotion || !('IntersectionObserver' in window)) return;

  slides.forEach(function (slide) {
    slide.classList.add('showcase-blur-ready');
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio > 0.6);
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          var idx = Number(entry.target.dataset.showcaseIndex);
          setActive(idx);
        }
      });
    },
    { root: track, threshold: [0, 0.6, 1] }
  );

  slides.forEach(function (slide) {
    observer.observe(slide);
  });
})();

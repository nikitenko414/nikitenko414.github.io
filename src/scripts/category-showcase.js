// Full-screen category showcase (homepage only): .category-showcase is
// 4x viewport height, .category-showcase-sticky pins to the viewport for
// that whole scroll distance. On every scroll frame this computes a
// continuous 0..3 "position" from how far through that distance the user
// has scrolled, and sets each of the 4 photo layers' opacity from a
// triangular function of its distance from that position — a real
// crossfade between photos, not a hard cut.
//
// Text is intentionally NOT part of that continuous blend — two
// paragraphs of text overlapping mid-fade is just illegible, unlike two
// photos which blend into an acceptable soft double-exposure. Instead
// there's a single shared text block whose content swaps synchronously,
// inside this same per-frame update() — never via an independent
// setTimeout. A fast scroll fling can cross several slide boundaries
// within one 160ms window; setTimeout-per-change used to queue up a
// pile of stale delayed callbacks that fired out of order, which is what
// actually produced the garbled/flickering text, not a rendering bug.
// With everything driven by the same single rAF tick, there is only ever
// one pending state and it's always the latest one.
//
// Layers fully at opacity 0 also get visibility:hidden, not just
// opacity — 4 full-viewport images with a grayscale filter + gradient
// overlay all kept "paintable" at once was the actual cause of the
// scroll jank reported; skipping paint for the (at most two) layers that
// are genuinely invisible at any given scroll position cuts that
// roughly in half.
(function () {
  var section = document.getElementById('category-showcase');
  if (!section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var layers = section.querySelectorAll('.category-showcase-layer');
  var dots = section.querySelectorAll('.category-showcase-dots [data-dot]');
  var contentEl = document.getElementById('showcase-content');
  var kickerEl = document.getElementById('showcase-kicker');
  var titleEl = document.getElementById('showcase-title');
  var descEl = document.getElementById('showcase-desc');
  var ctaEl = document.getElementById('showcase-cta');
  var count = layers.length;
  if (!count) return;

  // Order tells a spatial "walk-through" story, not the nav's alphabetical
  // order: approach the house -> step inside -> out into the garden/
  // landscape -> beyond the property line to commercial work.
  var categories = [
    { kicker: '01 / 04', title: 'Будинки', desc: 'Приватні житлові будинки та вілли, де архітектура підпорядкована світлу, ландшафту й способу життя мешканців.', href: 'houses.html' },
    { kicker: '02 / 04', title: "Інтер'єр", desc: "Інтер'єрні рішення для будинків, квартир і лофтів — там, де завершується архітектура й починається щоденне життя.", href: 'interior.html' },
    { kicker: '03 / 04', title: 'Ландшафтний дизайн', desc: 'Сади, двори та приватні парки, що продовжують архітектуру будинку назовні й працюють у будь-яку пору року.', href: 'landscape.html' },
    { kicker: '04 / 04', title: 'Комерційні приміщення', desc: 'Офіси, шоуруми та бізнес-центри, де простір підтримує роботу команди й формує враження про бренд.', href: 'commercial.html' }
  ];

  var currentActive = -1;
  var ticking = false;

  function applyContent(index) {
    var data = categories[index];
    if (!data) return;
    kickerEl.textContent = data.kicker;
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    ctaEl.href = data.href;
  }

  // Synchronous, single-state swap — no setTimeout, so there is never a
  // backlog of delayed callbacks for a fast scroll to reorder. The
  // opacity dip is a CSS transition (see .category-showcase-content in
  // premium.css) retriggered by the reflow-forcing offsetWidth read
  // below; browsers coalesce repeated retargets of the same transition
  // cleanly, so even several index changes within one frame just settle
  // on the latest text with no visible tear.
  function setActive(index) {
    if (index === currentActive) return;
    currentActive = index;
    contentEl.classList.add('is-swapping');
    applyContent(index);
    void contentEl.offsetWidth;
    contentEl.classList.remove('is-swapping');
    dots.forEach(function (dot) {
      dot.setAttribute('aria-current', Number(dot.dataset.dot) === index ? 'true' : 'false');
    });
  }

  function update() {
    var rect = section.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    var traveled = -rect.top;
    var progress = scrollable > 0 ? Math.min(1, Math.max(0, traveled / scrollable)) : 0;
    var position = progress * (count - 1);

    layers.forEach(function (layer, i) {
      var opacity = Math.max(0, 1 - Math.abs(position - i));
      layer.style.opacity = String(opacity);
      layer.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
    });

    setActive(Math.round(position));
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
  applyContent(currentActive === -1 ? 0 : currentActive);

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = Number(dot.dataset.dot);
      var scrollable = section.offsetHeight - window.innerHeight;
      var targetY = section.offsetTop + (scrollable * idx) / (count - 1);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });
  });
})();

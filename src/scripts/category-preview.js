(function () {
  var links = document.querySelectorAll('.intro-categories-links a[data-preview]');
  var preview = document.getElementById('category-preview');
  var previewImg = document.getElementById('category-preview-img');
  if (!links.length || !preview || !previewImg) return;

  function moveTo(e) {
    preview.style.left = e.clientX + 'px';
    preview.style.top = (e.clientY - 90) + 'px';
  }

  links.forEach(function (link) {
    link.addEventListener('mouseenter', function (e) {
      previewImg.src = link.getAttribute('data-preview');
      moveTo(e);
      preview.classList.add('is-visible');
    });
    link.addEventListener('mousemove', moveTo);
    link.addEventListener('mouseleave', function () {
      preview.classList.remove('is-visible');
    });
    link.addEventListener('focus', function () {
      var rect = link.getBoundingClientRect();
      preview.style.left = (rect.left + rect.width / 2) + 'px';
      preview.style.top = (rect.top - 90) + 'px';
      previewImg.src = link.getAttribute('data-preview');
      preview.classList.add('is-visible');
    });
    link.addEventListener('blur', function () {
      preview.classList.remove('is-visible');
    });
  });

  function hide() {
    preview.classList.remove('is-visible');
  }

  var slidesEl = document.querySelector('.slides');
  (slidesEl || window).addEventListener('scroll', hide, { passive: true });
})();

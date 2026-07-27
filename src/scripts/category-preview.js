(function () {
  var links = document.querySelectorAll('.intro-categories-links a[data-preview]');
  var preview = document.getElementById('category-preview');
  var previewImg = document.getElementById('category-preview-img');
  if (!links.length || !preview || !previewImg) return;

  links.forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      previewImg.src = link.getAttribute('data-preview');
      preview.classList.add('is-visible');
    });
    link.addEventListener('mouseleave', function () {
      preview.classList.remove('is-visible');
    });
    link.addEventListener('focus', function () {
      previewImg.src = link.getAttribute('data-preview');
      preview.classList.add('is-visible');
    });
    link.addEventListener('blur', function () {
      preview.classList.remove('is-visible');
    });
  });
})();

(function () {
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');
  var overlay = document.getElementById('menu-overlay');
  if (!openBtn || !closeBtn || !overlay) return;

  function openMenu() {
    overlay.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
  }

  function closeMenu() {
    overlay.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
  }

  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeMenu();
    }
  });
})();

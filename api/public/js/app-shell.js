/**
 * SafetyLog App Shell: responsive popover navbar + accessible :user-invalid ARIA sync.
 */

function initResponsiveNavbar() {
  const header = document.querySelector('.site-header');
  const inner = header?.querySelector('.header-inner');
  const menu = header?.querySelector('#site-menu');
  const menuBtn = header?.querySelector('.menu-button');

  if (!header || !inner || !menu || !menuBtn) return;

  const updateNavLayout = () => {
    const wasOpen = menu.matches(':popover-open');
    header.classList.add('is-wide');
    menu.removeAttribute('popover');

    const fitsInline = inner.scrollWidth <= inner.clientWidth;

    if (!fitsInline) {
      header.classList.remove('is-wide');
      menu.setAttribute('popover', 'auto');
      if (wasOpen && typeof menu.showPopover === 'function') {
        try {
          menu.showPopover();
        } catch (_) {
          // ignore if already open
        }
      }
    }
  };

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => updateNavLayout());
    observer.observe(header);
    observer.observe(menu);
  } else {
    window.addEventListener('resize', updateNavLayout);
  }

  updateNavLayout();
}

function initAccessibleFormValidation() {
  const syncFieldAria = (el) => {
    if (!el || !el.matches?.('input, select, textarea')) return;
    if (el.matches(':user-invalid')) {
      el.setAttribute('aria-invalid', 'true');
    } else {
      el.setAttribute('aria-invalid', 'false');
    }
  };

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (!el.hasAttribute('aria-invalid')) {
      el.setAttribute('aria-invalid', 'false');
    }
  });

  document.addEventListener('blur', (e) => syncFieldAria(e.target), true);
  document.addEventListener('change', (e) => syncFieldAria(e.target), true);
  document.addEventListener('input', (e) => {
    if (e.target.getAttribute?.('aria-invalid') === 'true') {
      syncFieldAria(e.target);
    }
  });
}

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-pressed', showing ? 'false' : 'true');
      btn.textContent = showing ? 'Tampilkan' : 'Sembunyikan';
    });
  });
}

initResponsiveNavbar();
initAccessibleFormValidation();
initPasswordToggles();

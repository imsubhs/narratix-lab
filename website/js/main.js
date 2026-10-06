/**
 * Narratix Lab — Public Static Project Site Client Logic
 * Zero dependencies · Subpath safe · Keyboard & Screen Reader Accessible
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Navigation Toggle
  const toggleBtn = document.getElementById('mobile-toggle');
  const drawer = document.getElementById('mobile-drawer');

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
      drawer.hidden = isExpanded;
    });

    // Close drawer when any mobile nav link is clicked
    const mobileLinks = drawer.querySelectorAll('.mobile-nav-link, .btn');
    mobileLinks.forEach((link) => {
      link.addEventListener('click', () => {
        toggleBtn.setAttribute('aria-expanded', 'false');
        drawer.hidden = true;
      });
    });

    // Close drawer on Escape key press
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hidden) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        drawer.hidden = true;
        toggleBtn.focus();
      }
    });
  }

  // 2. Dynamic Copyright Year
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 3. Header Border Shift on Scroll
  const header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.style.backgroundColor = 'rgba(11, 11, 12, 0.95)';
        header.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
      } else {
        header.style.backgroundColor = 'rgba(11, 11, 12, 0.82)';
        header.style.boxShadow = 'none';
      }
    }, { passive: true });
  }

  // 4. Console Architecture Greeting
  console.log(
    '%c Narratix Lab %c Phase 0.7 Architecture Portal ',
    'background: #7C3AED; color: #fff; font-weight: bold; border-radius: 4px 0 0 4px; padding: 2px 6px;',
    'background: #141416; color: #A1A1A6; border: 1px solid rgba(255,255,255,0.1); border-radius: 0 4px 4px 0; padding: 1px 6px;'
  );
});

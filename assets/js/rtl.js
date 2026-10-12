/**
 * SecureKey Locksmith - Right-To-Left (RTL) Management
 * Persists direction preference via localStorage
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'securekey_direction';
  const DIR_RTL = 'rtl';
  const DIR_LTR = 'ltr';

  function getPreferredDirection() {
    try { return localStorage.getItem(STORAGE_KEY) === DIR_RTL ? DIR_RTL : DIR_LTR; }
    catch { return DIR_LTR; }
  }

  function applyDirection(dir) {
    document.documentElement.setAttribute('dir', dir);
    // Direction changes layout; the English copy keeps its actual language.
    updateRtlToggles(dir);
  }

  function updateRtlToggles(dir) {
    const toggles = document.querySelectorAll('.rtl-toggle-btn');
    toggles.forEach(btn => {
      const textSpan = btn.querySelector('.rtl-text');
      if (dir === DIR_RTL) {
        if (textSpan) textSpan.textContent = 'LTR';
        btn.setAttribute('aria-label', 'Switch to left to right layout');
        btn.setAttribute('title', 'Switch to LTR');
      } else {
        if (textSpan) textSpan.textContent = 'RTL';
        btn.setAttribute('aria-label', 'Switch to right to left layout');
        btn.setAttribute('title', 'Switch to RTL');
      }
    });
  }

  // Initial immediate application
  const initialDir = getPreferredDirection();
  applyDirection(initialDir);

  document.addEventListener('DOMContentLoaded', () => {
    updateRtlToggles(getPreferredDirection());

    document.querySelectorAll('.rtl-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = document.documentElement.getAttribute('dir') || DIR_LTR;
        const next = current === DIR_RTL ? DIR_LTR : DIR_RTL;
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Works for this visit without storage. */ }
        applyDirection(next);
      });
    });
  });
})();

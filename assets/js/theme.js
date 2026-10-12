/**
 * SecureKey Locksmith - Theme Management (Light / Dark Mode)
 * Persists user preference via localStorage
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'securekey_theme';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';

  // Get preferred theme from localStorage or system preference
  function getPreferredTheme() {
    let stored;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* Fall back to device preference. */ }
    if (stored === THEME_DARK || stored === THEME_LIGHT) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
  }

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (theme === THEME_DARK) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    updateThemeToggles(theme);
  }

  // Update toggle button icons & aria labels
  function updateThemeToggles(theme) {
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    toggles.forEach(btn => {
      const icon = btn.querySelector('i');
      if (theme === THEME_DARK) {
        if (icon) icon.className = 'bi bi-sun-fill text-warning';
        btn.setAttribute('aria-label', 'Switch to light mode');
        btn.setAttribute('title', 'Switch to light mode');
      } else {
        if (icon) icon.className = 'bi bi-moon-stars-fill text-secondary';
        btn.setAttribute('aria-label', 'Switch to dark mode');
        btn.setAttribute('title', 'Switch to dark mode');
      }
    });
  }

  // Initial immediate application
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  // Initialize event listeners when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggles(getPreferredTheme());

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const current = document.documentElement.getAttribute('data-bs-theme') || THEME_LIGHT;
        const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Works for this visit without storage. */ }
        applyTheme(next);
      });
    });
  });
})();

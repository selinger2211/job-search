// Theme management: light / dark / auto

import { getTheme, saveTheme } from '../data/store.js';

export function initTheme() {
  const pref = getTheme();
  applyTheme(pref);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getTheme() === 'auto') applyTheme('auto');
  });
}

export function applyTheme(mode) {
  let dark;
  if (mode === 'auto') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  else dark = mode === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const saved = getTheme();
    btn.textContent = dark ? '\u{1F319}' : '\u{2600}\u{FE0F}';
    btn.title = 'Theme: ' + saved + (saved === 'auto' ? ' (system)' : '');
  }
}

export function cycleTheme() {
  const current = getTheme();
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  saveTheme(next);
  applyTheme(next);
}

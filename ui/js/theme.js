/**
 * theme.js — Gestor de tema claro / oscuro
 * Persiste en localStorage. Respeta preferencia del sistema si no hay guardada.
 */

const STORAGE_KEY = 'trackops-theme';
const THEMES = { dark: 'dark', light: 'light' };

/** Inicializa el tema aplicando el guardado o el preferido por el sistema */
export function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  apply(saved || system, false);

  // Escuchar cambios del sistema si no hay preferencia guardada
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      apply(e.matches ? 'light' : 'dark', false);
    }
  });
}

/** Aplica un tema
 * @param {'dark'|'light'} theme
 * @param {boolean} [save=true] - persistir en localStorage
 */
export function apply(theme, save = true) {
  const root = document.documentElement;

  if (theme === THEMES.light) {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }

  if (save) {
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Actualizar icono del botón del topbar
  _updateButton(theme);
}

/** Alterna entre claro y oscuro */
export function toggle() {
  const current = document.documentElement.getAttribute('data-theme') === 'light'
    ? THEMES.light
    : THEMES.dark;
  apply(current === THEMES.light ? THEMES.dark : THEMES.light);
}

/** Obtiene el tema activo */
export function current() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/** Renderiza el botón toggle para el topbar */
export function renderButton() {
  const isDark = current() === 'dark';
  return `
    <button
      class="btn btn-ghost btn-sm btn-icon theme-toggle"
      id="theme-toggle-btn"
      type="button"
      aria-label="${isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}"
      title="${isDark ? 'Tema claro' : 'Tema oscuro'}"
    >
      ${isDark ? _iconSun() : _iconMoon()}
    </button>
  `;
}

/** Vincula el botón toggle (llamar tras renderizar el topbar) */
export function bindButton() {
  const btn = document.getElementById('theme-toggle-btn');
  btn?.addEventListener('click', toggle);
}

// ─────────────────────────────── PRIVADO ────────────────────────────────────

function _updateButton(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
  btn.setAttribute('title', isDark ? 'Tema claro' : 'Tema oscuro');
  btn.innerHTML = isDark ? _iconSun() : _iconMoon();
}

function _iconSun() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`;
}

function _iconMoon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`;
}

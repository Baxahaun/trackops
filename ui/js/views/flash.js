/**
 * flash.js — Sistema de toasts / notificaciones
 */

const DURATION = 3500;

/**
 * Muestra una notificación tipo toast
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration] ms antes de desaparecer (0 = permanente)
 */
export function flash(message, type = 'info', duration = DURATION) {
  const container = document.getElementById('flash-container');
  if (!container) return;

  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  const colorMap = {
    success: 'var(--success)',
    error:   'var(--danger)',
    warning: 'var(--warning)',
    info:    'var(--accent)',
  };

  const toastEl = document.createElement('div');
  toastEl.className = `flash flash-${type}`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <span style="color:${colorMap[type] || 'var(--accent)'}; flex-shrink:0">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toastEl);

  if (duration > 0) {
    setTimeout(() => {
      toastEl.classList.add('flash-exit');
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  }
}

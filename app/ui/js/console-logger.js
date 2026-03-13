/**
 * console-logger.js — Panel de logs y captura de errores del frontend
 * Intercepta console.error, console.warn y window.onerror.
 * Muestra un panel colapsable en la parte inferior de la pantalla.
 */

import * as state from './state.js';

const MAX_LOGS = 100;
let _panel = null;
let _logsList = null;
let _errorBadge = null;
let _titleEl = null;
let _errorCount = 0;

/** Inicializa el módulo y vincula el panel del DOM */
export function init() {
  _panel     = document.getElementById('console-panel');
  _logsList  = document.getElementById('console-logs');
  _errorBadge = document.getElementById('console-error-count');
  _titleEl   = document.getElementById('console-panel-title');

  const closeBtn = document.getElementById('console-close-btn');
  const clearBtn = document.getElementById('console-clear-btn');

  closeBtn?.addEventListener('click', close);
  clearBtn?.addEventListener('click', clear);

  _patchConsole();
  _attachWindowErrors();
}

/** Abre el panel de console */
export function open() {
  _panel?.classList.add('is-open');
  state.update('consolePanelOpen', true);
  // Scroll to bottom
  setTimeout(() => { if (_logsList) _logsList.scrollTop = _logsList.scrollHeight; }, 50);
}

/** Cierra el panel */
export function close() {
  _panel?.classList.remove('is-open');
  state.update('consolePanelOpen', false);
}

/** Toggle */
export function toggle() {
  if (state.get('consolePanelOpen')) close();
  else open();
}

/** Limpia los logs */
export function clear() {
  state.update('consoleLogs', []);
  _errorCount = 0;
  if (_logsList) _logsList.innerHTML = '';
  _updateErrorBadge();
}

/**
 * Añade una entrada al log
 * @param {'error'|'warn'|'info'|'debug'} level
 * @param {string} message
 */
export function log(level, message) {
  const entry = {
    level,
    message: String(message),
    time: new Date().toISOString(),
  };

  const logs = state.get('consoleLogs');
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  state.update('consoleLogs', logs);

  _appendEntry(entry);

  if (level === 'error') {
    _errorCount++;
    _updateErrorBadge();
    // Auto-abrir en error
    if (!state.get('consolePanelOpen')) open();
  }
}

function _appendEntry(entry) {
  if (!_logsList) return;
  const time = entry.time.slice(11, 23); // HH:mm:ss.mmm
  const item = document.createElement('div');
  item.className = 'console-log-entry';
  item.setAttribute('role', 'listitem');
  item.innerHTML = `
    <span class="console-log-time">${time}</span>
    <span class="log-level log-${entry.level}">[${entry.level.toUpperCase()}]</span>
    <span class="console-log-msg">${_escapeHtml(entry.message)}</span>
  `;
  _logsList.appendChild(item);
  _logsList.scrollTop = _logsList.scrollHeight;

  // Limitar nodos en el DOM
  while (_logsList.childElementCount > MAX_LOGS) {
    _logsList.firstElementChild?.remove();
  }
}

function _updateErrorBadge() {
  if (!_errorBadge) return;
  if (_errorCount > 0) {
    _errorBadge.textContent = _errorCount;
    _errorBadge.style.display = '';
  } else {
    _errorBadge.style.display = 'none';
  }
  // Actualizar badge del sidebar
  const sidebarBadge = document.getElementById('sidebar-console-badge');
  if (sidebarBadge) {
    sidebarBadge.textContent = _errorCount;
    sidebarBadge.style.display = _errorCount > 0 ? '' : 'none';
  }
}

function _patchConsole() {
  const _origError = console.error.bind(console);
  const _origWarn  = console.warn.bind(console);
  const _origLog   = console.log.bind(console);

  console.error = (...args) => {
    _origError(...args);
    log('error', args.map(_serialize).join(' '));
  };
  console.warn = (...args) => {
    _origWarn(...args);
    log('warn', args.map(_serialize).join(' '));
  };
  // Solo capturar console.log marcados como [ops]
  console.log = (...args) => {
    _origLog(...args);
    const msg = args.map(_serialize).join(' ');
    if (msg.startsWith('[ops]') || msg.startsWith('[router]') || msg.startsWith('[api]')) {
      log('info', msg);
    }
  };
}

function _attachWindowErrors() {
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = error?.stack || `${message} (${source}:${lineno}:${colno})`;
    log('error', msg);
    return false; // Dejar que sigan propagándose
  };

  window.addEventListener('unhandledrejection', event => {
    const msg = event.reason?.stack || String(event.reason);
    log('error', `Unhandled Promise rejection: ${msg}`);
  });
}

function _serialize(value) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  try { return JSON.stringify(value, null, 0); } catch { return String(value); }
}

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

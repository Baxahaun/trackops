/**
 * router.js — Navegación entre vistas
 * Gestiona qué vista está activa en #view-container
 * y sincroniza el estado activo en el sidebar.
 */

import * as state from './state.js';

/** @type {Map<string, function(): HTMLElement|string>} */
const _registry = new Map();
let _currentView = null;
let _container = null;

/**
 * Registra una vista
 * @param {string} id - identificador único de la vista
 * @param {function(): Promise<HTMLElement|string>} factory - función que devuelve el contenido
 */
export function register(id, factory) {
  _registry.set(id, factory);
}

/**
 * Inicializa el router
 * @param {HTMLElement} container - #view-container
 */
export function init(container) {
  _container = container;

  // Navegación por hash
  window.addEventListener('hashchange', _handleHash);

  // Clic en nav-items del sidebar (delegación)
  document.addEventListener('click', e => {
    const item = e.target.closest('[data-view]');
    if (!item || !item.dataset.view) return;
    e.preventDefault();
    navigate(item.dataset.view);
  });
}

/**
 * Navega a una vista
 * @param {string} viewId
 * @param {boolean} [updateHash=true]
 */
export async function navigate(viewId, updateHash = true) {
  if (!_registry.has(viewId)) {
    console.warn(`[router] Vista desconocida: "${viewId}"`);
    return;
  }

  _currentView = viewId;
  state.update('activeView', viewId);

  // Actualizar hash sin trigger de hashchange
  if (updateHash && window.location.hash !== `#${viewId}`) {
    history.replaceState(null, '', `#${viewId}`);
  }

  // Actualizar clases activas en sidebar
  document.querySelectorAll('[data-view]').forEach(item => {
    item.classList.toggle('is-active', item.dataset.view === viewId);
  });

  // Renderizar contenido
  if (_container) {
    _container.innerHTML = '<div style="padding:2rem"><div class="spinner"></div></div>';
    try {
      const factory = _registry.get(viewId);
      const content = await factory();
      if (typeof content === 'string') {
        _container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        _container.innerHTML = '';
        _container.appendChild(content);
      }
      // Scroll to top
      _container.scrollTop = 0;
      // Focus para a11y (skip-link target)
      _container.focus({ preventScroll: true });
    } catch (err) {
      console.error('[router] Error cargando vista:', err);
      _container.innerHTML = `
        <div class="empty-state" style="margin:2rem">
          <p>Error al cargar la vista <strong>${viewId}</strong></p>
          <p style="font-size:0.8rem;font-family:var(--font-mono)">${err.message}</p>
        </div>`;
    }
  }
}

/**
 * Refresca la vista actual (re-renderizado)
 */
export async function refresh() {
  if (_currentView) {
    await navigate(_currentView, false);
  }
}

/**
 * Obtiene la vista activa
 */
export function current() { return _currentView; }

/**
 * Handler de hashchange
 */
function _handleHash() {
  const hash = window.location.hash.slice(1);
  if (hash && _registry.has(hash) && hash !== _currentView) {
    navigate(hash, false);
  }
}

/**
 * Carga la vista inicial desde el hash o usa la vista por defecto
 * @param {string} [defaultView='overview']
 */
export async function start(defaultView = 'overview') {
  const hash = window.location.hash.slice(1);
  const initial = hash && _registry.has(hash) ? hash : defaultView;
  await navigate(initial, true);
}

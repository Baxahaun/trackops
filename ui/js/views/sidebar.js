/**
 * sidebar.js — Sidebar de navegación lateral
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as consoleLogger from '../console-logger.js';
import * as onboarding from '../onboarding.js';

const NAV_ITEMS = [
  { id: 'overview',   label: 'Resumen',      icon: 'dashboard',  section: 'menu'    },
  { id: 'tasks',      label: 'Tareas',       icon: 'tasks',      section: 'menu', badge: true },
  { id: 'board',      label: 'Tablero',      icon: 'board',      section: 'menu'    },
  { id: 'execution',  label: 'Ejecución',    icon: 'execution',  section: 'menu'    },
  { id: 'skills',     label: 'Habilidades',  icon: 'zap',        section: 'menu'    },
  { id: 'insights',   label: 'Analíticas',   icon: 'insights',   section: 'menu'    },
];

const GENERAL_ITEMS = [
  { id: 'settings',   label: 'Configuración', icon: 'settings'   },
  { id: 'help',       label: 'Ayuda & Tour', icon: 'help', action: 'tour' },
  { id: 'console',    label: 'Registros',    icon: 'console', action: 'console', badge: 'error' },
];

/** Renderiza el sidebar completo */
export function render() {
  const el = document.getElementById('sidebar');
  if (!el) return;

  el.innerHTML = `
    <nav class="sidebar" aria-label="Navegación principal">
      <!-- Logo -->
      <a href="#" class="sidebar-logo" aria-label="TrackOps — Ir al inicio">
        <div class="sidebar-logo-icon" aria-hidden="true">
          ${icon('infinity', 20)}
        </div>
        <span class="sidebar-logo-name">TrackOps</span>
      </a>

      <!-- MENU -->
      <div class="sidebar-section">
        <p class="sidebar-section-label">Menú</p>
        <ul class="sidebar-nav" role="list">
          ${NAV_ITEMS.map(item => _renderNavItem(item)).join('')}
        </ul>
      </div>

      <!-- GENERAL -->
      <div class="sidebar-footer">
        <p class="sidebar-section-label" style="padding-bottom:var(--space-2)">General</p>
        ${GENERAL_ITEMS.map(item => _renderGeneralItem(item)).join('')}
      </div>
    </nav>
  `;

  _bindEvents(el);
}

function _renderNavItem(item) {
  const activeView  = state.get('activeView');
  const isActive    = activeView === item.id;
  const pendingCount = _getPendingCount(item);

  return `
    <li role="listitem">
      <button
        class="nav-item ${isActive ? 'is-active' : ''}"
        data-view="${item.id}"
        type="button"
        aria-current="${isActive ? 'page' : 'false'}"
        aria-label="${item.label}${pendingCount ? `, ${pendingCount} pendientes` : ''}"
      >
        <span class="nav-item-icon" aria-hidden="true">${icon(item.icon, 18)}</span>
        <span class="nav-item-label">${item.label}</span>
        ${pendingCount ? `<span class="nav-item-badge" aria-label="${pendingCount} tareas">${pendingCount}</span>` : ''}
      </button>
    </li>
  `;
}

function _renderGeneralItem(item) {
  return `
    <button
      class="nav-item"
      data-action="${item.action || ''}"
      data-view="${item.action ? '' : item.id}"
      type="button"
      aria-label="${item.label}"
      ${item.action === 'console' ? 'id="sidebar-console-btn"' : ''}
    >
      <span class="nav-item-icon" aria-hidden="true">${icon(item.icon, 18)}</span>
      <span class="nav-item-label">${item.label}</span>
      ${item.badge === 'error' ? `<span class="nav-item-badge danger" id="sidebar-console-badge" aria-label="errores" style="display:none">0</span>` : ''}
    </button>
  `;
}

function _getPendingCount(item) {
  if (!item.badge) return 0;
  const payload = state.getPayload();
  if (!payload) return 0;
  if (item.id === 'tasks') return payload.derived?.totals?.pending || 0;
  return 0;
}

function _bindEvents(el) {
  // Acciones especiales (no nav-view)
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'tour') {
      onboarding.reset();
      onboarding.show();
    } else if (action === 'console') {
      consoleLogger.toggle();
    }
  });
}

/** Refresca solo los badges sin re-renderizar todo */
export function updateBadges() {
  const payload = state.getPayload();
  if (!payload) return;

  const pending = payload.derived?.totals?.pending || 0;
  const tasksBtn = document.querySelector('[data-view="tasks"] .nav-item-badge');
  if (tasksBtn) {
    tasksBtn.textContent = pending;
    tasksBtn.style.display = pending ? '' : 'none';
  }
}

/**
 * sidebar.js — Sidebar de navegación lateral
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as consoleLogger from '../console-logger.js';
import * as onboarding from '../onboarding.js';
import { t } from '../i18n.js';

/** Renderiza el sidebar completo */
export function render() {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const navItems = [
    { id: 'overview',   label: t('ui.nav.overview', {}, 'Overview'), icon: 'dashboard', section: 'menu' },
    { id: 'tasks',      label: t('ui.nav.tasks', {}, 'Tasks'), icon: 'tasks', section: 'menu', badge: true },
    { id: 'board',      label: t('ui.nav.board', {}, 'Board'), icon: 'board', section: 'menu' },
    { id: 'execution',  label: t('ui.nav.execution', {}, 'Execution'), icon: 'execution', section: 'menu' },
    { id: 'skills',     label: t('ui.nav.skills', {}, 'Skills'), icon: 'zap', section: 'menu' },
    { id: 'insights',   label: t('ui.nav.insights', {}, 'Insights'), icon: 'insights', section: 'menu' },
  ];
  const generalItems = [
    { id: 'settings', label: t('ui.nav.settings', {}, 'Settings'), icon: 'settings' },
    { id: 'help', label: t('ui.nav.help', {}, 'Help & Tour'), icon: 'help', action: 'tour' },
    { id: 'console', label: t('ui.nav.logs', {}, 'Logs'), icon: 'console', action: 'console', badge: 'error' },
  ];

  el.innerHTML = `
    <nav class="sidebar" aria-label="${t('ui.sidebar.aria', {}, 'Main navigation')}">
      <!-- Logo -->
      <a href="#" class="sidebar-logo" aria-label="${t('ui.sidebar.home', {}, 'TrackOps — Go home')}">
        <div class="sidebar-logo-icon" aria-hidden="true">
          ${icon('infinity', 20)}
        </div>
        <span class="sidebar-logo-name">TrackOps</span>
      </a>

      <!-- MENU -->
      <div class="sidebar-section">
        <p class="sidebar-section-label">${t('ui.sidebar.menu', {}, 'Menu')}</p>
        <ul class="sidebar-nav" role="list">
          ${navItems.map(item => _renderNavItem(item)).join('')}
        </ul>
      </div>

      <!-- GENERAL -->
      <div class="sidebar-footer">
        <p class="sidebar-section-label" style="padding-bottom:var(--space-2)">${t('ui.sidebar.general', {}, 'General')}</p>
        ${generalItems.map(item => _renderGeneralItem(item)).join('')}
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
        aria-label="${item.label}${pendingCount ? `, ${t('ui.sidebar.pendingCount', { count: pendingCount }, `${pendingCount} pending`)}` : ''}"
      >
        <span class="nav-item-icon" aria-hidden="true">${icon(item.icon, 18)}</span>
        <span class="nav-item-label">${item.label}</span>
        ${pendingCount ? `<span class="nav-item-badge" aria-label="${t('ui.sidebar.tasksBadge', { count: pendingCount }, `${pendingCount} tasks`)}">${pendingCount}</span>` : ''}
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
      ${item.badge === 'error' ? `<span class="nav-item-badge danger" id="sidebar-console-badge" aria-label="${t('ui.sidebar.errors', {}, 'errors')}" style="display:none">0</span>` : ''}
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

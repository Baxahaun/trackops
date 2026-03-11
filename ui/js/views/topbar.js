/**
 * topbar.js — Barra superior del dashboard
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import { flash } from './flash.js';
import { esc, debounce } from '../utils.js';
import * as theme from '../theme.js';

/** Renderiza el topbar */
export function render() {
  const el = document.getElementById('topbar');
  if (!el) return;

  const payload  = state.getPayload();
  const projects = state.get('projects');
  const currentId = state.get('currentProjectId');
  const runtime  = payload?.runtime;

  el.innerHTML = `
    <div class="topbar">
      <!-- Hamburger (mobile) -->
      <button class="topbar-hamburger" type="button" id="sidebar-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="sidebar">
        <span></span><span></span><span></span>
      </button>

      <!-- Search -->
      <div class="topbar-search">
        <div class="search-wrapper" role="search">
          <span class="search-icon" aria-hidden="true">${icon('search', 16)}</span>
          <input
            type="search"
            id="global-search"
            aria-label="Buscar tareas"
            placeholder="Buscar tareas…"
            autocomplete="off"
            value="${esc(state.get('searchQuery'))}"
          />
          <span class="search-kbd" aria-hidden="true">⌘F</span>
        </div>
      </div>

      <!-- Derecha -->
      <div class="topbar-right">

        <!-- Timer activo -->
        <div class="topbar-timer" id="topbar-timer" aria-label="Time tracker" aria-live="polite">
          <span class="topbar-timer-dot" aria-hidden="true"></span>
          <span id="topbar-timer-display">00:00:00</span>
        </div>

        <!-- Repo status -->
        ${runtime ? _renderRepoBadge(runtime) : ''}

        <!-- Project selector -->
        ${projects.length > 0 ? _renderProjectSelector(projects, currentId) : ''}

        <!-- Sync button -->
        <button class="btn btn-ghost btn-sm" id="sync-btn" type="button" aria-label="Sincronizar documentación">
          ${icon('sync', 16)} Sync
        </button>

        <!-- Theme toggle -->
        ${theme.renderButton()}

        <!-- Refresh -->
        <button class="btn btn-ghost btn-sm btn-icon" id="refresh-btn" type="button" aria-label="Refrescar estado">
          ${icon('refresh', 16)}
        </button>

      </div>
    </div>
  `;

  _bindEvents();
}

function _renderRepoBadge(runtime) {
  const isClean = runtime.clean;
  const label   = isClean ? 'Repo limpio' : `${runtime.staged}s ${runtime.unstaged}u ${runtime.untracked}?`;
  return `
    <div class="repo-badge ${isClean ? 'clean' : 'dirty'}" title="${esc(runtime.branch || '')}">
      <span class="repo-badge-dot" aria-hidden="true"></span>
      <span>${icon('gitBranch', 12)} ${esc(runtime.branch || 'sin rama')} · ${label}</span>
    </div>
  `;
}

function _renderProjectSelector(projects, currentId) {
  const options = projects.map(p =>
    `<option value="${esc(p.id)}" ${p.id === currentId ? 'selected' : ''} ${p.available ? '' : 'disabled'}>
      ${esc(p.name)}${p.available ? '' : ' (no disponible)'}
    </option>`
  ).join('');

  return `
    <div class="project-select-wrapper" title="Proyecto activo">
      <select id="project-select" aria-label="Seleccionar proyecto activo">
        ${options}
      </select>
    </div>
  `;
}

function _bindEvents() {
  // Hamburger → sidebar open
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isOpen  = sidebar?.classList.toggle('is-open');
    document.getElementById('sidebar-toggle')?.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Theme toggle
  theme.bindButton();

  // Cerrar sidebar al hacer clic fuera (mobile)
  document.addEventListener('click', e => {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('sidebar-toggle');
    if (sidebar?.classList.contains('is-open') &&
        !sidebar.contains(e.target) && !toggle?.contains(e.target)) {
      sidebar.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // Project selector
  document.getElementById('project-select')?.addEventListener('change', async e => {
    const id = e.target.value;
    state.update('currentProjectId', id);
    localStorage.setItem('ops-dashboard-project', id);
    state.update('selectedTaskId', null);
    // Trigger refresh global
    window.dispatchEvent(new CustomEvent('ops:refresh'));
  });

  // Sync button
  document.getElementById('sync-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('sync-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `${icon('sync', 16)} Sincronizando…`; }
    try {
      await api.syncDocs();
      flash('Documentación sincronizada.', 'success');
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    } catch (err) {
      flash(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `${icon('sync', 16)} Sync`; }
    }
  });

  // Refresh button
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('ops:refresh'));
  });

  // Búsqueda global (debounced)
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    const handleSearch = debounce(e => {
      state.update('searchQuery', e.target.value);
      window.dispatchEvent(new CustomEvent('ops:search', { detail: { query: e.target.value } }));
    }, 250);
    searchInput.addEventListener('input', handleSearch);

    // Atajo de teclado ⌘/Ctrl+F
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }
}

/** Actualiza solo el timer del topbar sin re-renderizar */
export function updateTimer(display) {
  const el = document.getElementById('topbar-timer-display');
  if (el) el.textContent = display;
}

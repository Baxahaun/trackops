/**
 * app.js — Orquestador principal del dashboard TrackOps
 * Punto de entrada del módulo ES.
 */

import * as state from './state.js';
import * as api   from './api.js';
import * as router from './router.js';
import * as consoleLogger from './console-logger.js';
import * as onboarding from './onboarding.js';
import * as timeTracker from './time-tracker.js';
import * as theme from './theme.js';

// Vistas
import { render as renderSidebar } from './views/sidebar.js';
import { render as renderTopbar  } from './views/topbar.js';
import { render as renderOverview } from './views/overview.js';
import { render as renderBoard    } from './views/board.js';
import { render as renderTasks    } from './views/tasks.js';
import * as executionView from './views/execution.js';
import { render as renderInsights } from './views/insights.js';
import * as settingsView from './views/settings.js';
import * as skillsView from './views/skills.js';

// ─────────────────────────────── INIT ───────────────────────────────────────

async function init() {
  // 0. Tema (PRIMERO: evitar flash de tema incorrecto)
  theme.init();

  // 1. Console logger (capturar errores desde el arranque)
  consoleLogger.init();

  // 2. Registrar rutas en el router
  router.register('overview', renderOverview);
  router.register('board',    renderBoard);
  router.register('tasks',    renderTasks);
  router.register('execution', async () => {
    const html = await executionView.render();
    setTimeout(() => executionView.bindEvents(), 50);
    return html;
  });
  router.register('insights', renderInsights);
  router.register('settings', async () => {
    const html = await settingsView.render();
    setTimeout(() => settingsView.bindEvents(), 50);
    return html;
  });
  router.register('skills', async () => {
    const html = await skillsView.render();
    setTimeout(() => { 
       skillsView.bindEvents();
       skillsView.loadData(); 
    }, 50);
    return html;
  });

  // 3. Inicializar el router
  router.init(document.getElementById('view-container'));

  // 4. Cargar estado inicial
  await _loadInitialState();

  // 5. Renderizar chrome (sidebar + topbar)
  renderSidebar();
  renderTopbar();

  // 6. Navegar a la vista inicial
  await router.start('overview');

  // 7. Cargar time entries en background
  timeTracker.loadEntries().catch(err => {
    console.warn('[app] No se pudieron cargar time entries:', err.message);
  });

  // 8. Inicializar onboarding
  onboarding.init();

  // 9. Suscribir refreshes globales
  _bindGlobalEvents();

  // 10. Auto-refresh cada 60s
  setInterval(_refreshState, 60_000);
}

// ─────────────────────────────── CARGA DE ESTADO ────────────────────────────

async function _loadInitialState() {
  try {
    // Cargar lista de proyectos
    const projectsResult = await api.getProjects();
    const projects = projectsResult.projects || [];
    state.update('projects', projects);

    // Determinar proyecto activo (persistido o primero disponible)
    const saved = localStorage.getItem('ops-dashboard-project');
    const first = projects.find(p => p.available);
    const currentId = saved && projects.some(p => p.id === saved)
      ? saved
      : first?.id || null;

    state.update('currentProjectId', currentId);

    // Cargar el estado del proyecto activo
    if (currentId) {
      await _refreshState();
    }
  } catch (err) {
    console.error('[app] Error cargando estado inicial:', err);
    // Si el endpoint de proyectos falla, intentar cargar el estado directamente
    try {
      await _refreshState();
    } catch (fallbackErr) {
      console.error('[app] Error en fallback de estado:', fallbackErr);
    }
  }
}

async function _refreshState() {
  try {
    const payload = await api.getState();
    state.update('payload', payload);

    // Actualizar datos de i18n desde el backend
    if (payload.i18n) {
      state.update('phases',       payload.i18n.phases || []);
      state.update('statusLabels', payload.i18n.statusLabels || {});
      state.update('locale',       payload.i18n.locale || 'es');
      state.update('messages',     payload.i18n.messages || {});
    }

    // Actualizar proyectos si el payload incluye info de proyectos
    if (payload.project && state.get('projects').length === 0) {
      state.update('projects', [{ ...payload.project, available: true }]);
      state.update('currentProjectId', payload.project.id);
    }

    // Actualizar helper findTask en el state (se accede via get('payload'))
    // NO se puede asignar a state.findTask porque los namespaces de módulos ES son readonly.

    // Re-renderizar chrome (puede haber cambiado el repo status)
    renderTopbar();
    renderSidebar();

    // Refrescar la vista actual
    await router.refresh();

  } catch (err) {
    console.error('[app] Error actualizando estado:', err);
  }
}

// ─────────────────────────────── EVENTOS GLOBALES ───────────────────────────

function _bindGlobalEvents() {
  // Refresh global (disparado por sync, cambio de proyecto, etc.)
  window.addEventListener('ops:refresh', async () => {
    await _refreshState();
  });

  // Búsqueda global → refrescar la vista actual
  window.addEventListener('ops:search', () => {
    const active = router.current();
    if (active === 'board' || active === 'tasks') {
      router.refresh();
    }
  });

  // Navegación por teclado: Escape cierra modales / deselecciona
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // Deseleccionar tarea si no hay modal abierto
      const modalEl = document.querySelector('.modal-overlay:not(.is-hidden)');
      if (!modalEl) {
        // No deseleccionar: permite a las vistas manejar escape internamente
      }
    }
  });

  // Actualizar sidebar badges cuando cambia el payload
  state.subscribe('payload', () => {
    import('./views/sidebar.js').then(m => m.updateBadges?.());
  });
}

// ─────────────────────────────── ARRANQUE ───────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('[app] Error fatal en la inicialización:', err);
    document.getElementById('view-container').innerHTML = `
      <div class="empty-state" style="margin:4rem auto;max-width:440px">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--danger)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3 style="margin-top:var(--space-2)">Error al iniciar el dashboard</h3>
        <p style="font-size:var(--text-sm);color:var(--text-secondary)">${err.message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  });
});

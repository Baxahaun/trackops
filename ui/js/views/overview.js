/**
 * overview.js — Vista principal del Dashboard
 * KPI cards + charts + next task + portfolio + time tracker
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as router from '../router.js';
import * as timeTracker from '../time-tracker.js';
import { esc, formatDate, lastDays, extractHistory } from '../utils.js';

/** Renderiza la vista Overview completa */
export async function render() {
  const payload = state.getPayload();
  if (!payload) {
    return `<div class="empty-state" style="margin:3rem auto;max-width:440px">
      ${icon('alertCircle', 32)}
      <p>No se pudo cargar el estado del proyecto.</p>
      <button class="btn btn-primary" onclick="window.dispatchEvent(new CustomEvent('ops:refresh'))">Reintentar</button>
    </div>`;
  }

  const { derived, runtime, control, project, docsDirty } = payload;

  const html = `
    <div class="view-enter">
      <!-- ── KPI CARDS ── -->
      <div class="grid-4" style="margin-bottom:var(--space-5)" aria-label="Métricas del proyecto" role="region">
        ${_renderKPI('Trabajo abierto',  derived.totals.all - derived.totals.completed - derived.totals.cancelled,
          `${derived.totals.pending} pendientes · ${derived.totals.inProgress} activas`, 'tasks', 'accent')}
        ${_renderKPI('Completado',  derived.totals.completed,
          `${derived.totals.all ? Math.round(derived.totals.completed/derived.totals.all*100) : 0}% del total`, 'checkCircle', 'success')}
        ${_renderKPI('Bloqueado',   derived.totals.blocked,
          derived.blockers[0]?.title || 'Sin bloqueos', 'shield', 'danger')}
        ${_renderKPI('En Revisión', derived.totals.inReview,
          derived.reviewTasks[0]?.title || 'Sin tareas en revisión', 'alertCircle', 'warning')}
      </div>

      <!-- ── FILA PRINCIPAL ── -->
      <div style="display:grid;grid-template-columns:1fr 340px;gap:var(--space-5);margin-bottom:var(--space-5)">

        <!-- Charts (actividad semanal + fase progress) -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Activity Chart -->
          <div class="chart-card stagger-1" aria-label="Actividad de la última semana">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <p class="chart-title">Actividad Semanal</p>
                <p class="chart-subtitle">Cambios de estado registrados por día</p>
              </div>
            </div>
            ${_renderActivityChart(control.tasks)}
          </div>

          <!-- Phase Chart -->
          <div class="chart-card stagger-2" aria-label="Progreso por fase">
            <p class="chart-title">Progreso por Fase</p>
            ${_renderPhaseChart(derived.phaseStats)}
          </div>

        </div>

        <!-- Column derecha: Donut + Project progress -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Donut de progreso global -->
          <div class="chart-card stagger-3" style="align-items:center" aria-label="Progreso global del proyecto">
            <p class="chart-title" style="width:100%">Progreso Global</p>
            ${_renderDonut(derived.totals)}
          </div>

          <!-- Próxima tarea -->
          <div class="chart-card stagger-4" aria-label="Próxima tarea">
            <p class="chart-title" style="margin-bottom:var(--space-3)">Próximo Movimiento</p>
            ${derived.nextTask ? _renderNextTask(derived.nextTask) : '<p class="text-muted" style="font-size:var(--text-sm)">🎉 No hay tareas abiertas</p>'}
          </div>

        </div>
      </div>

      <!-- ── FILA INFERIOR: Time Tracker + Portfolio + Repo ── -->
      <div class="grid-3" aria-label="Controles y portfolio">

        <!-- Time Tracker -->
        <div class="stagger-1">
          ${timeTracker.renderWidget(state.get('selectedTaskId'))}
        </div>

        <!-- Portfolio de proyectos -->
        <div class="chart-card stagger-2" aria-label="Proyectos registrados">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
            <p class="chart-title">Portfolio</p>
            <span class="badge badge-muted">${state.get('projects').length} proyectos</span>
          </div>
          <div class="stack stack-sm" id="portfolio-list">
            ${_renderPortfolio()}
          </div>
        </div>

        <!-- Salud operativa -->
        <div class="chart-card stagger-3" aria-label="Salud operativa del repositorio">
          <p class="chart-title" style="margin-bottom:var(--space-4)">Salud Operativa</p>
          ${_renderRepoHealth(runtime, docsDirty, derived)}
        </div>

      </div>
    </div>
  `;

  // Vincular eventos tras insertar en DOM
  setTimeout(() => {
    _bindPortfolioEvents();
    timeTracker.bindWidget(state.get('selectedTaskId'), state.findTask?.(state.get('selectedTaskId'))?.title);
  }, 0);

  return html;
}

// ─────────────────────────────── KPI CARD ───────────────────────────────────

function _renderKPI(title, value, sub, iconName, variant) {
  return `
    <article class="kpi-card kpi-${variant}" role="figure" aria-label="${title}: ${value}">
      <div class="kpi-header">
        <p class="kpi-title">${esc(title)}</p>
        <div class="kpi-icon ${variant}">${icon(iconName, 16)}</div>
      </div>
      <p class="kpi-value">${esc(String(value))}</p>
      <p class="kpi-sub truncate">${esc(sub)}</p>
    </article>
  `;
}

// ─────────────────────────────── ACTIVITY CHART ─────────────────────────────

function _renderActivityChart(tasks) {
  const entries  = extractHistory(tasks);
  const days     = lastDays(10);
  const counts   = new Map(days.map(d => [d, 0]));
  entries.forEach(e => {
    const day = e.at?.slice(0, 10);
    if (counts.has(day)) counts.set(day, counts.get(day) + 1);
  });
  const max = Math.max(...counts.values(), 1);

  const bars = Array.from(counts.entries()).map(([day, count]) => {
    const pct   = Math.max(8, Math.round((count / max) * 100));
    const label = day.slice(5); // MM-DD
    return `
      <div class="activity-bar-col" title="${count} cambio${count !== 1 ? 's' : ''} el ${day}">
        <div class="activity-bar" style="height:${pct}%" aria-label="${count} cambios"></div>
        <span class="activity-bar-label">${esc(label)}</span>
      </div>
    `;
  }).join('');

  return `<div class="activity-chart" aria-label="Barras de actividad">${bars}</div>`;
}

// ─────────────────────────────── PHASE CHART ────────────────────────────────

function _renderPhaseChart(phaseStats) {
  if (!phaseStats?.length) {
    return '<p class="text-muted" style="font-size:var(--text-sm)">Sin fases configuradas.</p>';
  }

  return `
    <div class="phase-chart">
      ${phaseStats.map(p => {
        const pct    = p.total ? Math.round((p.completed / p.total) * 100) : 0;
        const cls    = pct === 100 ? 'done' : pct > 0 ? 'active' : 'partial';
        return `
          <div class="phase-row">
            <div class="phase-row-header">
              <span class="phase-name">${esc(p.id)} · ${esc(p.label)}</span>
              <span class="phase-progress">${p.completed}/${p.total} · ${pct}%</span>
            </div>
            <div class="phase-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${p.label}: ${pct}%">
              <div class="phase-fill ${cls}" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─────────────────────────────── DONUT ──────────────────────────────────────

function _renderDonut(totals) {
  const all        = totals.all || 1;
  const completed  = totals.completed;
  const inProgress = totals.inProgress;
  const blocked    = totals.blocked;
  const pending    = totals.pending;
  const pct = Math.round((completed / all) * 100);

  const R  = 54;
  const C  = 2 * Math.PI * R;

  function arc(val, total = all) {
    return Math.min(C * (val / total), C);
  }

  // Calcular offsets (apilado)
  const completedDash  = arc(completed);
  const inProgressDash = arc(inProgress);
  const blockedDash    = arc(blocked);

  const o1 = 0;
  const o2 = -(completedDash);
  const o3 = -(completedDash + inProgressDash);
  const o4 = -(completedDash + inProgressDash + blockedDash);

  return `
    <div class="donut-wrapper" style="position:relative;width:160px;height:160px">
      <svg class="donut-svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Progreso: ${pct}%">
        <defs>
          <style>
            .donut-arc { transform-origin: 80px 80px; transform: rotate(-90deg); }
          </style>
        </defs>
        <!-- Track -->
        <circle class="donut-track" cx="80" cy="80" r="${R}" />
        <!-- Completed (verde) -->
        <circle class="donut-arc arc-completed"
          cx="80" cy="80" r="${R}"
          stroke-dasharray="${completedDash} ${C}"
          stroke-dashoffset="${o1}" />
        <!-- In Progress (indigo) -->
        <circle class="donut-arc arc-progress"
          cx="80" cy="80" r="${R}"
          stroke-dasharray="${inProgressDash} ${C}"
          stroke-dashoffset="${o2}" />
        <!-- Blocked (rojo) -->
        <circle class="donut-arc arc-blocked"
          cx="80" cy="80" r="${R}"
          stroke-dasharray="${blockedDash} ${C}"
          stroke-dashoffset="${o3}" />
      </svg>
      <div class="donut-label">
        <span class="donut-percent">${pct}%</span>
        <span class="donut-sub">completado</span>
      </div>
    </div>
    <div class="donut-legend">
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:var(--success)"></span>
        Completado (${completed})
      </div>
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:var(--accent)"></span>
        En progreso (${inProgress})
      </div>
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:var(--danger)"></span>
        Bloqueado (${blocked})
      </div>
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:var(--text-muted)"></span>
        Pendiente (${pending})
      </div>
    </div>
  `;
}

// ─────────────────────────────── NEXT TASK ──────────────────────────────────

function _renderNextTask(task) {
  const priorityColors = { P0: 'danger', P1: 'warning', P2: 'accent', P3: 'muted' };
  const statusLabels = state.getStatusLabels();
  const statusLabel  = statusLabels[task.status] || task.status;

  return `
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <span class="badge badge-${priorityColors[task.priority] || 'muted'}">${esc(task.priority)}</span>
        <span class="badge badge-muted">${esc(task.phase)}</span>
        <span class="badge status-${task.status}">${esc(statusLabel)}</span>
      </div>
      <p style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">${esc(task.title)}</p>
      ${task.summary ? `<p style="font-size:var(--text-xs);color:var(--text-secondary)">${esc(task.summary)}</p>` : ''}
      <button
        class="btn btn-primary btn-sm"
        type="button"
        data-view="board"
        style="margin-top:var(--space-2);width:fit-content"
        aria-label="Ir al tablero para gestionar ${esc(task.title)}"
      >
        ${icon('arrowRight', 14)} Ver en el tablero
      </button>
    </div>
  `;
}

// ─────────────────────────────── PORTFOLIO ──────────────────────────────────

function _renderPortfolio() {
  const projects  = state.get('projects');
  const currentId = state.get('currentProjectId');

  if (!projects.length) {
    return '<div class="empty-state">No hay proyectos registrados.</div>';
  }

  return projects.map(p => `
    <div class="project-row ${p.id === currentId ? 'is-active' : ''}">
      <div class="project-row-info">
        <p class="project-name truncate">${esc(p.name)}</p>
        <p class="project-path">${esc(p.root)}</p>
      </div>
      <div class="project-row-actions">
        <span class="badge badge-${p.available ? 'success' : 'warning'}">${p.available ? 'Activo' : 'No disponible'}</span>
        ${p.available && p.id !== currentId
          ? `<button class="btn btn-ghost btn-sm" type="button" data-switch-project="${esc(p.id)}">Abrir</button>`
          : ''}
      </div>
    </div>
  `).join('');
}

function _bindPortfolioEvents() {
  document.querySelectorAll('[data-switch-project]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.switchProject;
      state.update('currentProjectId', id);
      localStorage.setItem('ops-dashboard-project', id);
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    });
  });
}

// ─────────────────────────────── REPO HEALTH ────────────────────────────────

function _renderRepoHealth(runtime, docsDirty, derived) {
  const completionRate = derived.totals.all
    ? Math.round((derived.totals.completed / derived.totals.all) * 100)
    : 0;

  const blockerRate = derived.totals.all
    ? Math.round((derived.totals.blocked / derived.totals.all) * 100)
    : 0;

  const items = [
    { label: 'Tasa completada', value: `${completionRate}%`, cls: completionRate >= 75 ? 'good' : completionRate >= 40 ? '' : 'bad' },
    { label: 'Presión de bloqueos', value: `${blockerRate}%`, cls: blockerRate === 0 ? 'good' : blockerRate > 20 ? 'bad' : 'warn' },
    { label: 'Hallazgos abiertos', value: String((derived.openFindings || []).length), cls: (derived.openFindings||[]).length === 0 ? 'good' : 'warn' },
    { label: 'Repo',           value: runtime?.clean ? 'Limpio' : 'Con cambios', cls: runtime?.clean ? 'good' : 'warn' },
    { label: 'Desfase documental', value: docsDirty?.length ? docsDirty.join(', ') : 'OK', cls: docsDirty?.length ? 'warn' : 'good' },
    { label: 'Último commit',  value: runtime?.lastCommit ? `${runtime.lastCommit.shortHash} · ${formatDate(runtime.lastCommit.date, 'date')}` : '—', cls: '' },
  ];

  return `
    <div class="health-grid">
      ${items.map(({ label, value, cls }) => `
        <div class="health-card">
          <p class="health-card-label">${esc(label)}</p>
          <p class="health-card-value ${cls} truncate" title="${esc(value)}">${esc(value)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * insights.js — Vista de Analytics: progreso, actividad, hallazgos, KPI de salud
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as timeTracker from '../time-tracker.js';
import { esc, formatDate, formatDurationShort, extractHistory } from '../utils.js';
import { t } from '../i18n.js';

export async function render() {
  const payload = state.getPayload();
  if (!payload) return `<div class="empty-state" style="margin:3rem">${t('ui.insights.noData', {}, 'No project data.')}</div>`;

  const { derived, control, runtime } = payload;
  const statusLabels = state.getStatusLabels();
  const history      = extractHistory(control.tasks).slice(0, 20);

  return `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">${t('ui.insights.eyebrow', {}, 'Insights')}</p>
          <h2>${t('ui.insights.title', {}, 'Project insights')}</h2>
        </div>
      </div>

      <!-- Fila 1: Health Grid + Distribution -->
      <div class="grid-2" style="margin-bottom:var(--space-5)">

        <!-- KPI de salud -->
        <div class="chart-card stagger-1">
          <div class="section-header" style="margin-bottom:var(--space-3)">
            <p class="chart-title">${t('ui.insights.health', {}, 'Operational health')}</p>
          </div>
          ${_renderHealthGrid(derived, runtime, payload.docsDirty)}
        </div>

        <!-- Distribución por estado -->
        <div class="chart-card stagger-2">
          <p class="chart-title" style="margin-bottom:var(--space-4)">${t('ui.insights.distribution', {}, 'Distribution by status')}</p>
          ${_renderDistribution(derived.totals, statusLabels)}
        </div>

      </div>

      <!-- Fila 2: Time entries + Phase progress -->
      <div class="grid-2" style="margin-bottom:var(--space-5)">

        <!-- Time tracking summary -->
        <div class="chart-card stagger-3">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
            <p class="chart-title">${t('ui.insights.time', {}, 'Time tracking')}</p>
            <span class="badge badge-accent">${icon('clock', 12)} ${t('ui.insights.today', {}, 'Today')}</span>
          </div>
          ${_renderTimeTracking()}
        </div>

        <!-- Phase progress detallado -->
        <div class="chart-card stagger-4">
          <p class="chart-title" style="margin-bottom:var(--space-4)">${t('ui.insights.phaseProgress', {}, 'Progress by phase')}</p>
          ${_renderPhaseProgress(derived.phaseStats)}
        </div>

      </div>

      <!-- Fila 3: Activity + Findings -->
      <div class="grid-2">

        <!-- Activity timeline -->
        <div class="chart-card stagger-1">
          <p class="chart-title" style="margin-bottom:var(--space-4)">${t('ui.insights.recentActivity', {}, 'Recent activity')}</p>
          ${_renderActivityTimeline(history, statusLabels)}
        </div>

        <!-- Hallazgos + Decisiones -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Findings -->
          <div class="chart-card stagger-2">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
              <p class="chart-title">${t('ui.insights.findings', {}, 'Findings')}</p>
              <span class="badge badge-${derived.openFindings?.length ? 'warning' : 'success'}">
                ${t('ui.insights.openCount', { count: (derived.openFindings || []).length }, `${(derived.openFindings || []).length} open`)}
              </span>
            </div>
            ${_renderFindings(derived.openFindings || [], derived.resolvedFindings || [])}
          </div>

          <!-- Decisiones pendientes -->
          ${(control.decisionsPending || []).length > 0 ? `
            <div class="chart-card stagger-3">
              <p class="chart-title" style="margin-bottom:var(--space-4)">${t('ui.insights.pendingDecisions', {}, 'Pending decisions')}</p>
              ${_renderDecisions(control.decisionsPending)}
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────── HEALTH ─────────────────────────────────────

function _renderHealthGrid(derived, runtime, docsDirty) {
  const totals = derived.totals;
  const completionRate = totals.all ? Math.round((totals.completed / totals.all) * 100) : 0;
  const blockerRate    = totals.all ? Math.round((totals.blocked   / totals.all) * 100) : 0;
  const openFindings   = (derived.openFindings || []).length;

  const items = [
    { label: 'Tasa completada',    value: `${completionRate}%`,     cls: completionRate >= 75 ? 'good' : completionRate >= 40 ? '' : 'bad' },
    { label: 'Presión de bloqueos',value: `${blockerRate}%`,        cls: blockerRate === 0 ? 'good' : blockerRate > 20 ? 'bad' : 'warn'    },
    { label: 'En Progreso',        value: String(totals.inProgress),cls: totals.inProgress > 0 ? 'good' : '' },
    { label: 'En Revisión',        value: String(totals.inReview),  cls: '' },
    { label: 'Hallazgos abiertos', value: String(openFindings),     cls: openFindings === 0 ? 'good' : 'warn' },
    { label: 'Desfase documental', value: (docsDirty || []).length ? `${(docsDirty).length} archivos` : 'OK', cls: docsDirty?.length ? 'warn' : 'good' },
    { label: 'Por delante remoto', value: String(runtime?.ahead || 0), cls: runtime?.ahead > 0 ? 'warn' : 'good' },
    { label: 'Por detrás remoto',  value: String(runtime?.behind || 0), cls: runtime?.behind > 0 ? 'bad' : 'good' },
  ];

  return `
    <div class="health-grid">
      ${items.map(({ label, value, cls }) => `
        <div class="health-card">
          <p class="health-card-label">${esc(label)}</p>
          <p class="health-card-value ${cls}" title="${esc(value)}">${esc(value)}</p>
        </div>
      `).join('')}
    </div>
  `;
}

// ─────────────────────────────── DISTRIBUCIÓN ───────────────────────────────

function _renderDistribution(totals, statusLabels) {
  const all = totals.all || 1;
  const rows = [
    { id: 'completed',  label: statusLabels.completed  || 'Completado',   value: totals.completed,  cls: 'fill-success' },
    { id: 'in_progress',label: statusLabels.in_progress|| 'En progreso',  value: totals.inProgress, cls: '' },
    { id: 'in_review',  label: statusLabels.in_review  || 'En revisión',  value: totals.inReview,   cls: '' },
    { id: 'pending',    label: statusLabels.pending    || 'Pendiente',    value: totals.pending,    cls: 'fill-warning' },
    { id: 'blocked',    label: statusLabels.blocked    || 'Bloqueado',    value: totals.blocked,    cls: 'fill-danger'  },
    { id: 'cancelled',  label: statusLabels.cancelled  || 'Cancelado',    value: totals.cancelled,  cls: '' },
  ].filter(r => r.value > 0);

  return `
    <div class="bar-chart">
      ${rows.map(r => {
        const pct = Math.max(2, Math.round((r.value / all) * 100));
        return `
          <div class="bar-row" role="group" aria-label="${r.label}: ${r.value} (${pct}%)">
            <span class="bar-label truncate">${esc(r.label)}</span>
            <div class="bar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <div class="bar-fill ${r.cls}" style="width:${pct}%"></div>
            </div>
            <span class="bar-value">${r.value}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─────────────────────────────── TIME TRACKING ──────────────────────────────

function _renderTimeTracking() {
  const entries = state.get('timeEntries');

  if (!entries.length) {
    return `
      <div class="empty-state" style="padding:var(--space-6)">
        ${icon('clock', 24)}
        <p>No hay registros de tiempo aún.</p>
        <p class="text-muted" style="font-size:var(--text-xs)">Usa el seguimiento de tiempo en Resumen para registrar tiempo por tarea.</p>
      </div>
    `;
  }

  // Agrupar por tarea
  const byTask = new Map();
  for (const e of entries) {
    if (!byTask.has(e.taskId)) byTask.set(e.taskId, { taskId: e.taskId, taskTitle: e.taskTitle, total: 0, count: 0 });
    const rec = byTask.get(e.taskId);
    rec.total += e.durationMs || 0;
    rec.count++;
  }

  const maxMs = Math.max(...[...byTask.values()].map(r => r.total), 1);

  return `
    <div class="bar-chart">
      ${[...byTask.values()].slice(0, 10).map(r => {
        const pct = Math.max(4, Math.round((r.total / maxMs) * 100));
        return `
          <div class="bar-row">
            <span class="bar-label truncate" title="${esc(r.taskTitle)}">${esc(r.taskTitle)}</span>
            <div class="bar-track">
              <div class="bar-fill fill-info" style="width:${pct}%"></div>
            </div>
            <span class="bar-value">${formatDurationShort(r.total)}</span>
          </div>
        `;
      }).join('')}
    </div>
    <p class="text-muted" style="font-size:var(--text-xs);margin-top:var(--space-3)">
      ${entries.length} registros en total
    </p>
  `;
}

// ─────────────────────────────── PHASE PROGRESS ─────────────────────────────

function _renderPhaseProgress(phaseStats) {
  if (!phaseStats?.length) {
    return '<p class="text-muted" style="font-size:var(--text-sm)">Sin fases configuradas.</p>';
  }
  return `
    <div class="phase-chart">
      ${phaseStats.map(p => {
        const pct = p.total ? Math.round((p.completed / p.total) * 100) : 0;
        const cls = pct === 100 ? 'done' : pct > 0 ? 'active' : 'partial';
        return `
          <div class="phase-row">
            <div class="phase-row-header">
              <div>
                <span class="phase-name">${esc(p.id)} · ${esc(p.label)}</span>
              </div>
              <span class="phase-progress">${p.completed}/${p.total} (${pct}%)</span>
            </div>
            <div class="phase-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <div class="phase-fill ${cls}" style="width:${pct}%"></div>
            </div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);flex-wrap:wrap">
              ${p.remaining === 0
                ? `<span class="badge badge-success">Completada</span>`
                : `<span class="badge badge-muted">${p.remaining} pendientes</span>`}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─────────────────────────────── ACTIVITY ───────────────────────────────────

function _renderActivityTimeline(history, statusLabels) {
  if (!history.length) {
    return '<div class="empty-state" style="padding:var(--space-5)">Sin actividad reciente.</div>';
  }

  const actionIcon = {
    create:   'plus',
    start:    'play',
    review:   'alertCircle',
    complete: 'checkCircle',
    block:    'shield',
    pending:  'clock',
    cancel:   'x',
    note:     'fileText',
    edit:     'edit',
  };

  const actionColor = {
    create:   'var(--accent)',
    start:    'var(--info)',
    review:   'var(--warning)',
    complete: 'var(--success)',
    block:    'var(--danger)',
    cancel:   'var(--text-muted)',
    note:     'var(--accent)',
    edit:     'var(--text-secondary)',
    pending:  'var(--warning)',
  };

  return `
    <div class="stack" style="max-height:420px;overflow-y:auto">
      ${history.map(h => {
        const ic  = actionIcon[h.action] || 'info';
        const col = actionColor[h.action] || 'var(--accent)';
        return `
          <div class="activity-item">
            <div class="activity-icon" style="color:${col}">
              ${icon(ic, 16)}
            </div>
            <div class="activity-content">
              <p class="activity-action">${esc(h.action)}${h.note ? ` — ${esc(h.note)}` : ''}</p>
              <p class="activity-task">${esc(h.taskTitle)} (${esc(h.taskId)})</p>
              <p class="activity-time">${formatDate(h.at)}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─────────────────────────────── FINDINGS ───────────────────────────────────

function _renderFindings(open, resolved) {
  if (!open.length && !resolved.length) {
    return `<div class="empty-state" style="padding:var(--space-4)">${icon('checkCircle', 20)} Sin hallazgos.</div>`;
  }

  return `
    <div class="stack stack-sm">
      ${open.map(f => `
        <div class="finding-item severity-${(f.severity || 'medium').toLowerCase()}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-1)">
            <p style="font-size:var(--text-sm);font-weight:700">${esc(f.title)}</p>
            <span class="badge badge-warning">${esc(f.severity?.toUpperCase() || 'MEDIUM')}</span>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-secondary)">${esc(f.detail || '')}</p>
          ${f.impact ? `<p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-1)">Impacto: ${esc(f.impact)}</p>` : ''}
        </div>
      `).join('')}
      ${resolved.length > 0 ? `<p class="label-sm" style="margin-top:var(--space-3)">${resolved.length} resueltos</p>` : ''}
    </div>
  `;
}

// ─────────────────────────────── DECISIONES ─────────────────────────────────

function _renderDecisions(decisions) {
  return `
    <div class="stack stack-sm">
      ${decisions.map(d => `
        <div class="decision-item">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-1)">
            <p style="font-size:var(--text-sm);font-weight:700">${esc(d.title)}</p>
            <span class="badge badge-muted">${esc(d.owner)}</span>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-secondary)">${esc(d.impact || '')}</p>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * tasks.js — Editor de tareas (split: lista + formulario)
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import { flash } from './flash.js';
import { esc, splitLines, formatDate } from '../utils.js';
import * as timeTracker from '../time-tracker.js';

export async function render() {
  const payload = state.getPayload();
  if (!payload) return '<div class="empty-state" style="margin:3rem">Sin datos del proyecto.</div>';

  const tasks   = _filterTasks(payload.derived.tasks);
  const selTask  = state.findTask(state.get('selectedTaskId'));
  const phases  = state.getPhases();
  const statusLabels = state.getStatusLabels();

  const html = `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">Task Studio</p>
          <h2>Gestión de Tareas</h2>
        </div>
        <button class="btn btn-primary btn-sm" id="new-task-btn-top" type="button">
          ${icon('plus', 14)} Nueva tarea
        </button>
      </div>

      <div class="grid-split">

        <!-- Lista de tareas -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <!-- Quick filter -->
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap" role="group" aria-label="Filtros de estado">
            ${_renderStatusFilters(statusLabels, payload.derived.totals)}
          </div>

          <div class="stack stack-sm" id="task-list" aria-label="Lista de tareas" role="list">
            ${_renderTaskList(tasks, statusLabels, phases)}
          </div>
        </div>

        <!-- Editor de tarea -->
        <div class="panel" id="task-editor" aria-label="Editor de tarea" aria-live="polite">
          ${_renderEditor(selTask, phases)}
        </div>

      </div>
    </div>
  `;

  setTimeout(() => _bindEvents(), 0);
  return html;
}

function _filterTasks(tasks) {
  const query  = state.get('searchQuery')?.toLowerCase();
  const filter = sessionStorage.getItem('tasks-filter') || '';
  let list = [...tasks];
  if (query) {
    list = list.filter(t =>
      t.title.toLowerCase().includes(query) ||
      (t.summary || '').toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query)
    );
  }
  if (filter) list = list.filter(t => t.status === filter);
  return list;
}

function _renderStatusFilters(statusLabels, totals) {
  const filters = [
    { id: '',            label: 'Todas',        count: totals.all },
    { id: 'pending',     label: 'Pendiente',    count: totals.pending },
    { id: 'in_progress', label: 'En progreso',  count: totals.inProgress },
    { id: 'in_review',   label: 'En revisión',  count: totals.inReview },
    { id: 'blocked',     label: 'Bloqueadas',   count: totals.blocked },
    { id: 'completed',   label: 'Completadas',  count: totals.completed },
  ];
  const active = sessionStorage.getItem('tasks-filter') || '';
  return filters.map(f => `
    <button class="chip ${f.id === active ? 'is-active' : ''}"
      type="button" data-task-filter="${esc(f.id)}"
      aria-pressed="${f.id === active}">
      ${esc(f.label)} <span class="badge badge-muted" style="font-size:0.65rem">${f.count}</span>
    </button>
  `).join('');
}

function _renderTaskList(tasks, statusLabels, phases) {
  if (!tasks.length) return '<div class="empty-state">No hay tareas que coincidan.</div>';
  const selectedId = state.get('selectedTaskId');
  const priorityVariant = { P0: 'danger', P1: 'warning', P2: 'accent', P3: 'muted' };

  return tasks.map(t => {
    const phase = phases.find(p => p.id === t.phase);
    return `
      <div class="task-card ${t.id === selectedId ? 'is-selected' : ''}"
        data-task-id="${esc(t.id)}"
        role="listitem" tabindex="0"
        aria-selected="${t.id === selectedId}"
        aria-label="${esc(t.title)}"
      >
        <strong class="task-card-title">${esc(t.title)}</strong>
        <span class="task-card-id">${esc(t.id)}</span>
        <div class="task-card-meta" style="margin-top:var(--space-2)">
          <span class="badge badge-${priorityVariant[t.priority] || 'muted'}">${esc(t.priority)}</span>
          <span class="badge status-${t.status}">${esc(statusLabels[t.status] || t.status)}</span>
          ${phase ? `<span class="badge badge-muted">${esc(phase.label)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function _renderEditor(task, phases) {
  const isNew = !task;
  const phases_opts = phases.map(p =>
    `<option value="${esc(p.id)}" ${!isNew && task.phase === p.id ? 'selected' : ''}>${esc(p.id)} — ${esc(p.label)}</option>`
  ).join('');

  const statuses = [
    { id: 'pending',     label: 'Pendiente' },
    { id: 'in_progress', label: 'En progreso' },
    { id: 'in_review',   label: 'En revisión' },
    { id: 'blocked',     label: 'Bloqueada' },
    { id: 'completed',   label: 'Completada' },
    { id: 'cancelled',   label: 'Cancelada' },
  ];

  return `
    <div class="panel-header">
      <div class="panel-header-left">
        <p class="eyebrow">Task Studio</p>
        <h3 class="panel-title" id="editor-title">${isNew ? 'Nueva tarea' : esc(task.title)}</h3>
      </div>
      <div class="panel-header-right">
        ${!isNew ? `
          <button class="btn btn-ghost btn-sm" id="timer-quick-btn" type="button" title="Iniciar timer para esta tarea">
            ${icon('timer', 14)} Timer
          </button>
          <button class="btn btn-ghost btn-sm" id="duplicate-btn" type="button" aria-label="Duplicar tarea">
            ${icon('copy', 14)}
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-sm" id="clear-task-btn" type="button" aria-label="Limpiar formulario">
          ${icon('x', 14)}
        </button>
      </div>
    </div>

    <!-- Action strip -->
    ${!isNew ? `
      <div class="panel-footer" style="display:flex;gap:var(--space-2);flex-wrap:wrap" role="group" aria-label="Acciones rápidas de tarea">
        <button class="chip is-active" type="button" data-task-action="start" aria-label="Iniciar tarea">Iniciar</button>
        <button class="chip" type="button" data-task-action="review" aria-label="Pasar a revisión">Revisión</button>
        <button class="chip" type="button" data-task-action="complete" aria-label="Completar tarea">Completar</button>
        <button class="chip" type="button" data-task-action="block" aria-label="Bloquear tarea">Bloquear</button>
        <button class="chip" type="button" data-task-action="pending" aria-label="Volver a pendiente">Pendiente</button>
      </div>
    ` : ''}

    <div class="panel-body">
      <form id="task-form" class="stack stack-md" novalidate>

        <div class="field">
          <label for="task-title">Título <span aria-hidden="true" style="color:var(--danger)">*</span></label>
          <input id="task-title" name="title" type="text" required
            value="${isNew ? '' : esc(task.title)}"
            placeholder="Describe la tarea"
            aria-required="true" />
        </div>

        <div class="field-row">
          <div class="field">
            <label for="task-phase">Fase</label>
            <select id="task-phase" name="phase">${phases_opts}</select>
          </div>
          <div class="field">
            <label for="task-priority">Prioridad</label>
            <select id="task-priority" name="priority">
              ${['P0','P1','P2','P3'].map(p => `<option value="${p}" ${!isNew && task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="task-status">Estado</label>
            <select id="task-status" name="status">
              ${statuses.map(s => `<option value="${s.id}" ${!isNew && task.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="task-stream">Stream</label>
            <input id="task-stream" name="stream" type="text"
              value="${isNew ? 'Operations' : esc(task.stream || '')}"
              placeholder="Operations" />
          </div>
        </div>

        <div class="checkbox-field">
          <input id="task-required" type="checkbox" name="required" ${isNew || task.required !== false ? 'checked' : ''} />
          <label for="task-required">Tarea requerida para entrega</label>
        </div>

        <div class="field">
          <label for="task-summary">Resumen</label>
          <textarea id="task-summary" name="summary" rows="3"
            placeholder="Descripción breve de la tarea">${isNew ? '' : esc(task.summary || '')}</textarea>
        </div>

        <div class="field">
          <label for="task-acceptance">Criterios de aceptación</label>
          <textarea id="task-acceptance" name="acceptance" rows="3"
            placeholder="Un criterio por línea">${isNew ? '' : esc((task.acceptance || []).join('\n'))}</textarea>
        </div>

        <div class="field">
          <label for="task-depends">Dependencias</label>
          <textarea id="task-depends" name="dependsOn" rows="2"
            placeholder="ID de tarea dependiente, uno por línea">${isNew ? '' : esc((task.dependsOn || []).join('\n'))}</textarea>
        </div>

        <div class="field">
          <label for="task-blocker">Bloqueador</label>
          <textarea id="task-blocker" name="blocker" rows="2"
            placeholder="Describe el bloqueo si aplica">${isNew ? '' : esc(task.blocker || '')}</textarea>
        </div>

        <div class="field">
          <label for="task-note">Nota de actualización</label>
          <textarea id="task-note" name="note" rows="2"
            placeholder="Nota que se añadirá al historial (opcional)"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" id="save-task-btn">
            ${icon('check', 16)} ${isNew ? 'Crear tarea' : 'Guardar cambios'}
          </button>
        </div>

      </form>

      ${!isNew && task.history?.length ? `
        <div style="margin-top:var(--space-6)">
          <p class="eyebrow" style="margin-bottom:var(--space-3)">Historial</p>
          <div class="stack stack-sm">
            ${task.history.slice(-5).reverse().map(h => `
              <div class="info-row">
                <p class="label-sm">${formatDate(h.at)}</p>
                <p class="value">${esc(h.action)}${h.note ? ` — ${esc(h.note)}` : ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function _bindEvents() {
  // Seleccionar tarea de la lista
  document.getElementById('task-list')?.addEventListener('click', e => {
    const card = e.target.closest('[data-task-id]');
    if (!card) return;
    const id = card.dataset.taskId;
    state.update('selectedTaskId', id);
    const editor = document.getElementById('task-editor');
    if (editor) {
      const phases   = state.getPhases();
      const selTask  = state.findTask(id);
      editor.innerHTML = _renderEditor(selTask, phases);
      _bindEditorForm();
    }
    // Actualizar selección en lista
    document.querySelectorAll('[data-task-id]').forEach(c => {
      c.classList.toggle('is-selected', c.dataset.taskId === id);
      c.setAttribute('aria-selected', c.dataset.taskId === id);
    });
  });

  // Filtros de estado
  document.querySelectorAll('[data-task-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      sessionStorage.setItem('tasks-filter', btn.dataset.taskFilter);
      import('../router.js').then(r => r.refresh());
    });
  });

  // Nueva tarea
  document.getElementById('new-task-btn-top')?.addEventListener('click', () => {
    state.update('selectedTaskId', null);
    const editor = document.getElementById('task-editor');
    if (editor) {
      editor.innerHTML = _renderEditor(null, state.getPhases());
      _bindEditorForm();
    }
  });

  _bindEditorForm();
}

function _bindEditorForm() {
  // Clear button
  document.getElementById('clear-task-btn')?.addEventListener('click', () => {
    state.update('selectedTaskId', null);
    const editor = document.getElementById('task-editor');
    if (editor) editor.innerHTML = _renderEditor(null, state.getPhases());
    _bindEditorForm();
  });

  // Duplicate button
  document.getElementById('duplicate-btn')?.addEventListener('click', () => {
    const task = state.findTask(state.get('selectedTaskId'));
    if (!task) return;
    state.update('selectedTaskId', null);
    const editor = document.getElementById('task-editor');
    if (editor) {
      editor.innerHTML = _renderEditor({ ...task, title: `${task.title} (copia)`, status: 'pending', history: [] }, state.getPhases());
      _bindEditorForm();
      document.getElementById('task-title')?.focus();
    }
  });

  // Timer quick start
  document.getElementById('timer-quick-btn')?.addEventListener('click', async () => {
    const task = state.findTask(state.get('selectedTaskId'));
    if (!task) return;
    await timeTracker.start(task.id, task.title);
  });

  // Action strip
  document.querySelectorAll('[data-task-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = state.get('selectedTaskId');
      if (!taskId) { flash('Selecciona una tarea primero.', 'warning'); return; }
      const action = btn.dataset.taskAction;
      const note   = document.getElementById('task-note')?.value?.trim() || '';
      try {
        await api.taskAction(taskId, action, note || `Cambio a "${action}" desde el board.`);
        flash('Estado actualizado.', 'success');
        window.dispatchEvent(new CustomEvent('ops:refresh'));
      } catch (err) {
        flash(err.message, 'error');
      }
    });
  });

  // Submit form
  const form = document.getElementById('task-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('save-task-btn');
    if (btn) btn.disabled = true;
    try {
      await _submitForm();
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

async function _submitForm() {
  const get = id => document.getElementById(id);

  const payload = {
    title:      get('task-title')?.value.trim(),
    phase:      get('task-phase')?.value,
    priority:   get('task-priority')?.value,
    status:     get('task-status')?.value,
    stream:     get('task-stream')?.value.trim(),
    required:   get('task-required')?.checked,
    summary:    get('task-summary')?.value.trim(),
    acceptance: splitLines(get('task-acceptance')?.value || ''),
    dependsOn:  splitLines(get('task-depends')?.value || ''),
    blocker:    get('task-blocker')?.value.trim(),
    note:       get('task-note')?.value.trim(),
  };

  if (!payload.title) {
    flash('El título es obligatorio.', 'error');
    get('task-title')?.focus();
    return;
  }

  const selectedId = state.get('selectedTaskId');
  try {
    if (selectedId) {
      await api.updateTask(selectedId, payload);
      flash('Tarea actualizada.', 'success');
    } else {
      const result = await api.createTask(payload);
      state.update('selectedTaskId', result.task?.id);
      flash('Tarea creada.', 'success');
    }
    window.dispatchEvent(new CustomEvent('ops:refresh'));
  } catch (err) {
    flash(err.message, 'error');
  }
}

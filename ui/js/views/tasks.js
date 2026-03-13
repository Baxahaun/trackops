/**
 * tasks.js — Editor de tareas (split: lista + formulario)
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import { flash } from './flash.js';
import { esc, splitLines, formatDate } from '../utils.js';
import * as timeTracker from '../time-tracker.js';
import { t } from '../i18n.js';

export async function render() {
  const payload = state.getPayload();
  if (!payload) return `<div class="empty-state" style="margin:3rem">${t('ui.tasks.noData', {}, 'No project data.')}</div>`;

  const tasks   = _filterTasks(payload.derived.tasks);
  const selTask  = state.findTask(state.get('selectedTaskId'));
  const phases  = state.getPhases();
  const statusLabels = state.getStatusLabels();

  const html = `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">Task Studio</p>
          <h2>${t('ui.tasks.title', {}, 'Task Management')}</h2>
        </div>
        <button class="btn btn-primary btn-sm" id="new-task-btn-top" type="button">
          ${icon('plus', 14)} ${t('ui.tasks.new', {}, 'New task')}
        </button>
      </div>

      <div class="grid-split">

        <!-- Lista de tareas -->
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <!-- Quick filter -->
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap" role="group" aria-label="${t('ui.tasks.filters', {}, 'Status filters')}">
            ${_renderStatusFilters(statusLabels, payload.derived.totals)}
          </div>

          <div class="stack stack-sm" id="task-list" aria-label="${t('ui.tasks.list', {}, 'Task list')}" role="list">
            ${_renderTaskList(tasks, statusLabels, phases)}
          </div>
        </div>

        <!-- Editor de tarea -->
        <div class="panel" id="task-editor" aria-label="${t('ui.tasks.editor', {}, 'Task editor')}" aria-live="polite">
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
    { id: '',            label: t('ui.tasks.all', {}, 'All'), count: totals.all },
    { id: 'pending',     label: statusLabels.pending || t('status.pending', {}, 'Pending'), count: totals.pending },
    { id: 'in_progress', label: statusLabels.in_progress || t('status.in_progress', {}, 'In progress'), count: totals.inProgress },
    { id: 'in_review',   label: statusLabels.in_review || t('status.in_review', {}, 'In review'), count: totals.inReview },
    { id: 'blocked',     label: statusLabels.blocked || t('status.blocked', {}, 'Blocked'), count: totals.blocked },
    { id: 'completed',   label: statusLabels.completed || t('status.completed', {}, 'Completed'), count: totals.completed },
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
  if (!tasks.length) return `<div class="empty-state">${t('ui.tasks.noMatch', {}, 'No matching tasks.')}</div>`;
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
    { id: 'pending',     label: t('status.pending', {}, 'Pending') },
    { id: 'in_progress', label: t('status.in_progress', {}, 'In progress') },
    { id: 'in_review',   label: t('status.in_review', {}, 'In review') },
    { id: 'blocked',     label: t('status.blocked', {}, 'Blocked') },
    { id: 'completed',   label: t('status.completed', {}, 'Completed') },
    { id: 'cancelled',   label: t('status.cancelled', {}, 'Cancelled') },
  ];

  return `
    <div class="panel-header">
      <div class="panel-header-left">
        <p class="eyebrow">Task Studio</p>
        <h3 class="panel-title" id="editor-title">${isNew ? t('ui.tasks.new', {}, 'New task') : esc(task.title)}</h3>
      </div>
      <div class="panel-header-right">
        ${!isNew ? `
          <button class="btn btn-ghost btn-sm" id="timer-quick-btn" type="button" title="${t('ui.tasks.timerTitle', {}, 'Start timer for this task')}">
            ${icon('timer', 14)} Timer
          </button>
          <button class="btn btn-ghost btn-sm" id="duplicate-btn" type="button" aria-label="${t('ui.tasks.duplicate', {}, 'Duplicate task')}">
            ${icon('copy', 14)}
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-sm" id="clear-task-btn" type="button" aria-label="${t('ui.tasks.clear', {}, 'Clear form')}">
          ${icon('x', 14)}
        </button>
      </div>
    </div>

    <!-- Action strip -->
    ${!isNew ? `
      <div class="panel-footer" style="display:flex;gap:var(--space-2);flex-wrap:wrap" role="group" aria-label="${t('ui.tasks.quickActions', {}, 'Quick task actions')}">
        <button class="chip is-active" type="button" data-task-action="start" aria-label="${t('ui.tasks.start', {}, 'Start task')}">${t('ui.tasks.startLabel', {}, 'Start')}</button>
        <button class="chip" type="button" data-task-action="review" aria-label="${t('ui.tasks.review', {}, 'Send to review')}">${t('ui.tasks.reviewLabel', {}, 'Review')}</button>
        <button class="chip" type="button" data-task-action="complete" aria-label="${t('ui.tasks.complete', {}, 'Complete task')}">${t('ui.tasks.completeLabel', {}, 'Complete')}</button>
        <button class="chip" type="button" data-task-action="block" aria-label="${t('ui.tasks.block', {}, 'Block task')}">${t('ui.tasks.blockLabel', {}, 'Block')}</button>
        <button class="chip" type="button" data-task-action="pending" aria-label="${t('ui.tasks.pending', {}, 'Return to pending')}">${t('status.pending', {}, 'Pending')}</button>
      </div>
    ` : ''}

    <div class="panel-body">
      <form id="task-form" class="stack stack-md" novalidate>

        <div class="field">
          <label for="task-title">${t('ui.tasks.field.title', {}, 'Title')} <span aria-hidden="true" style="color:var(--danger)">*</span></label>
          <input id="task-title" name="title" type="text" required
            value="${isNew ? '' : esc(task.title)}"
            placeholder="${t('ui.tasks.placeholder.title', {}, 'Describe the task')}"
            aria-required="true" />
        </div>

        <div class="field-row">
          <div class="field">
            <label for="task-phase">${t('ui.tasks.field.phase', {}, 'Phase')}</label>
            <select id="task-phase" name="phase">${phases_opts}</select>
          </div>
          <div class="field">
            <label for="task-priority">${t('ui.tasks.field.priority', {}, 'Priority')}</label>
            <select id="task-priority" name="priority">
              ${['P0','P1','P2','P3'].map(p => `<option value="${p}" ${!isNew && task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="task-status">${t('ui.tasks.field.status', {}, 'Status')}</label>
            <select id="task-status" name="status">
              ${statuses.map(s => `<option value="${s.id}" ${!isNew && task.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="task-stream">${t('ui.tasks.field.stream', {}, 'Stream')}</label>
            <input id="task-stream" name="stream" type="text"
              value="${isNew ? 'Operations' : esc(task.stream || '')}"
              placeholder="Operations" />
          </div>
        </div>

        <div class="checkbox-field">
          <input id="task-required" type="checkbox" name="required" ${isNew || task.required !== false ? 'checked' : ''} />
          <label for="task-required">${t('ui.tasks.field.required', {}, 'Required for delivery')}</label>
        </div>

        <div class="field">
          <label for="task-summary">${t('ui.tasks.field.summary', {}, 'Summary')}</label>
          <textarea id="task-summary" name="summary" rows="3"
            placeholder="${t('ui.tasks.placeholder.summary', {}, 'Short description of the task')}">${isNew ? '' : esc(task.summary || '')}</textarea>
        </div>

        <div class="field">
          <label for="task-acceptance">${t('ui.tasks.field.acceptance', {}, 'Acceptance criteria')}</label>
          <textarea id="task-acceptance" name="acceptance" rows="3"
            placeholder="${t('ui.tasks.placeholder.acceptance', {}, 'One criterion per line')}">${isNew ? '' : esc((task.acceptance || []).join('\n'))}</textarea>
        </div>

        <div class="field">
          <label for="task-depends">${t('ui.tasks.field.depends', {}, 'Dependencies')}</label>
          <textarea id="task-depends" name="dependsOn" rows="2"
            placeholder="${t('ui.tasks.placeholder.depends', {}, 'Dependent task ID, one per line')}">${isNew ? '' : esc((task.dependsOn || []).join('\n'))}</textarea>
        </div>

        <div class="field">
          <label for="task-blocker">${t('ui.tasks.field.blocker', {}, 'Blocker')}</label>
          <textarea id="task-blocker" name="blocker" rows="2"
            placeholder="${t('ui.tasks.placeholder.blocker', {}, 'Describe the blocker if applicable')}">${isNew ? '' : esc(task.blocker || '')}</textarea>
        </div>

        <div class="field">
          <label for="task-note">${t('ui.tasks.field.note', {}, 'Update note')}</label>
          <textarea id="task-note" name="note" rows="2"
            placeholder="${t('ui.tasks.placeholder.note', {}, 'Optional note to append to history')}"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit" id="save-task-btn">
            ${icon('check', 16)} ${isNew ? t('ui.tasks.create', {}, 'Create task') : t('ui.tasks.save', {}, 'Save changes')}
          </button>
        </div>

      </form>

      ${!isNew && task.history?.length ? `
        <div style="margin-top:var(--space-6)">
          <p class="eyebrow" style="margin-bottom:var(--space-3)">${t('ui.tasks.history', {}, 'History')}</p>
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
      editor.innerHTML = _renderEditor({ ...task, title: `${task.title} (${t('ui.tasks.copySuffix', {}, 'copy')})`, status: 'pending', history: [] }, state.getPhases());
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
      if (!taskId) { flash(t('ui.tasks.selectFirst', {}, 'Select a task first.'), 'warning'); return; }
      const action = btn.dataset.taskAction;
      const note   = document.getElementById('task-note')?.value?.trim() || '';
      try {
        await api.taskAction(taskId, action, note || t('ui.tasks.defaultActionNote', { action }, `Change to "${action}" from the board.`));
        flash(t('ui.tasks.updated', {}, 'Status updated.'), 'success');
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

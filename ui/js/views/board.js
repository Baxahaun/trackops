/**
 * board.js — Tablero Kanban con drag & drop
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import * as router from '../router.js';
import { flash } from './flash.js';
import { esc, debounce } from '../utils.js';

const COLUMNS = [
  { id: 'pending',     label: 'Pendiente' },
  { id: 'in_progress', label: 'En Progreso' },
  { id: 'in_review',  label: 'En Revisión' },
  { id: 'blocked',    label: 'Bloqueado' },
  { id: 'completed',  label: 'Completado' },
];

let _dragTaskId = null;

export async function render() {
  const payload = state.getPayload();
  if (!payload) return '<div class="empty-state" style="margin:3rem">Sin datos del proyecto.</div>';

  const tasks = _filterTasks(payload.derived.tasks);
  const hasCancelled = tasks.some(t => t.status === 'cancelled');
  const columns = hasCancelled
    ? [...COLUMNS, { id: 'cancelled', label: 'Cancelado' }]
    : COLUMNS;

  const html = `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">Task Board</p>
          <h2>Tablero Operativo</h2>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-ghost btn-sm" id="board-filter-done" type="button">
            ${icon('check', 14)} ${_showCompleted() ? 'Ocultar completadas' : 'Mostrar completadas'}
          </button>
          <button class="btn btn-primary btn-sm" id="new-task-btn" type="button" aria-label="Crear nueva tarea">
            ${icon('plus', 14)} Nueva tarea
          </button>
        </div>
      </div>

      <div class="board-grid" id="board" aria-label="Tablero de tareas por estado" role="region">
        ${columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return _renderColumn(col, colTasks);
        }).join('')}
      </div>
    </div>
  `;

  setTimeout(() => _bindEvents(), 0);
  return html;
}

function _filterTasks(tasks) {
  let list = tasks;
  const query = state.get('searchQuery')?.toLowerCase();
  if (query) {
    list = list.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      (t.summary || '').toLowerCase().includes(query)
    );
  }
  if (!_showCompleted()) {
    list = list.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  }
  return list;
}

function _showCompleted() {
  return sessionStorage.getItem('board-show-completed') === 'true';
}

function _renderColumn(col, tasks) {
  return `
    <section class="board-column col-${col.id}" data-status="${col.id}" aria-label="Columna ${col.label}">
      <div class="board-column-header">
        <h3 class="board-column-title" id="col-${col.id}">
          <span class="board-column-dot" aria-hidden="true"></span>
          ${esc(col.label)}
        </h3>
        <span class="board-column-count" aria-label="${tasks.length} tareas">${tasks.length}</span>
      </div>
      <div class="board-column-body" aria-labelledby="col-${col.id}" role="list">
        ${tasks.map(t => _renderCard(t)).join('')}
        ${tasks.length === 0
          ? `<div class="empty-state" style="padding:var(--space-5);min-height:80px;border-style:dashed">Sin tareas</div>`
          : ''}
      </div>
    </section>
  `;
}

function _renderCard(task) {
  const isSelected = task.id === state.get('selectedTaskId');
  const statusLabels = state.getStatusLabels();
  const phases = state.getPhases();
  const phaseInfo = phases.find(p => p.id === task.phase);

  const priorityVariant = { P0: 'danger', P1: 'warning', P2: 'accent', P3: 'muted' };

  return `
    <article
      class="task-card ${isSelected ? 'is-selected' : ''}"
      data-task-id="${esc(task.id)}"
      data-status="${esc(task.status)}"
      draggable="true"
      role="listitem"
      tabindex="0"
      aria-label="${esc(task.title)}, ${statusLabels[task.status] || task.status}, prioridad ${task.priority}"
      aria-selected="${isSelected}"
    >
      <strong class="task-card-title">${esc(task.title)}</strong>
      <span class="task-card-id">${esc(task.id)}</span>
      <p class="task-card-summary">${esc(task.summary || 'Sin descripción.')}</p>
      <div class="task-card-meta">
        <span class="badge badge-${priorityVariant[task.priority] || 'muted'}">${esc(task.priority)}</span>
        <span class="badge badge-muted">${esc(phaseInfo?.label || task.phase)}</span>
        ${task.stream ? `<span class="badge badge-muted">${esc(task.stream)}</span>` : ''}
        ${task.blocker ? `<span class="badge badge-danger" title="${esc(task.blocker)}">${icon('alertTriangle', 10)} Bloqueada</span>` : ''}
      </div>
    </article>
  `;
}

function _bindEvents() {
  const board = document.getElementById('board');
  if (!board) return;

  // Clic en task card → seleccionar y navegar a tasks
  board.addEventListener('click', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;

    const id = card.dataset.taskId;
    state.update('selectedTaskId', id);

    // Navegar al editor si hubo doble clic; si un clic simple, solo marcar
    if (e.detail === 2) {
      router.navigate('tasks');
    } else {
      // Resaltar la card seleccionada sin re-render completo
      board.querySelectorAll('.task-card').forEach(c => {
        c.classList.toggle('is-selected', c.dataset.taskId === id);
        c.setAttribute('aria-selected', c.dataset.taskId === id ? 'true' : 'false');
      });
    }
  });

  // Teclado en cards (Enter = seleccionar, Space = toggle)
  board.addEventListener('keydown', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    if (e.key === 'Enter') {
      state.update('selectedTaskId', card.dataset.taskId);
      router.navigate('tasks');
    }
  });

  // Toggle mostrar completadas
  document.getElementById('board-filter-done')?.addEventListener('click', () => {
    const current = _showCompleted();
    sessionStorage.setItem('board-show-completed', current ? 'false' : 'true');
    router.refresh();
  });

  // Nueva tarea
  document.getElementById('new-task-btn')?.addEventListener('click', () => {
    state.update('selectedTaskId', null);
    router.navigate('tasks');
  });

  // Drag & drop
  _bindDragDrop(board);
}

function _bindDragDrop(board) {
  // Dragstart
  board.addEventListener('dragstart', e => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    _dragTaskId = card.dataset.taskId;
    card.classList.add('is-dragging');
    e.dataTransfer.setData('text/plain', _dragTaskId);
    e.dataTransfer.effectAllowed = 'move';
  });

  board.addEventListener('dragend', e => {
    const card = e.target.closest('.task-card');
    card?.classList.remove('is-dragging');
    _dragTaskId = null;
    board.querySelectorAll('.board-column').forEach(col => col.classList.remove('is-drop-target'));
  });

  board.addEventListener('dragover', e => {
    e.preventDefault();
    const col = e.target.closest('.board-column');
    if (!col) return;
    e.dataTransfer.dropEffect = 'move';
    board.querySelectorAll('.board-column').forEach(c => c.classList.remove('is-drop-target'));
    col.classList.add('is-drop-target');
  });

  board.addEventListener('dragleave', e => {
    const col = e.target.closest('.board-column');
    if (!col) return;
    // Solo eliminar si salimos de la columna, no de un hijo
    if (!col.contains(e.relatedTarget)) {
      col.classList.remove('is-drop-target');
    }
  });

  board.addEventListener('drop', async e => {
    e.preventDefault();
    const col = e.target.closest('.board-column');
    if (!col) return;
    col.classList.remove('is-drop-target');

    const taskId = e.dataTransfer.getData('text/plain') || _dragTaskId;
    if (!taskId) return;

    const newStatus = col.dataset.status;
    const task = state.getPayload()?.derived?.tasks?.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const statusToAction = {
      pending:     'pending',
      in_progress: 'start',
      in_review:   'review',
      blocked:     'block',
      completed:   'complete',
      cancelled:   'cancel',
    };

    const action = statusToAction[newStatus];
    if (!action) return;

    try {
      await api.taskAction(taskId, action, `Movida a ${newStatus} desde el tablero.`);
      flash(`Tarea movida a ${newStatus}.`, 'success');
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    } catch (err) {
      flash(err.message, 'error');
    }
  });
}

/**
 * time-tracker.js — Cronómetro de tiempo por tarea
 * Integración con la API de time tracking del backend.
 */

import * as state from './state.js';
import * as api from './api.js';
import { formatDuration } from './utils.js';
import { flash } from './views/flash.js';

let _interval = null;
let _startMs  = null;

// ─────────────────────────────── PÚBLICO ────────────────────────────────────

/**
 * Inicia el timer para una tarea
 * @param {string} taskId
 * @param {string} taskTitle
 */
export async function start(taskId, taskTitle) {
  // Si hay uno en curso, detenerlo primero
  if (state.get('activeEntry')) {
    await stop();
  }

  try {
    const result = await api.startTimeEntry(taskId, taskTitle);
    const entry = {
      id:        result.entry?.id || `local-${Date.now()}`,
      taskId,
      taskTitle,
      startedAt: result.entry?.startedAt || new Date().toISOString(),
    };
    state.update('activeEntry', entry);
    _startMs = Date.now() - (result.entry?.elapsedMs || 0);
    _startInterval();
    _updateTopbarTimer();
    flash(`Timer iniciado: ${taskTitle}`, 'success');
  } catch (err) {
    // Fallback local si el backend no tiene el endpoint todavía
    const entry = {
      id:        `local-${Date.now()}`,
      taskId,
      taskTitle,
      startedAt: new Date().toISOString(),
    };
    state.update('activeEntry', entry);
    _startMs = Date.now();
    _startInterval();
    _updateTopbarTimer();
  }
}

/**
 * Pausa el timer (detiene el interval pero conserva el entry)
 */
export function pause() {
  _stopInterval();
  _updateTopbarTimer();
}

/**
 * Reanuda el timer
 */
export function resume() {
  if (!state.get('activeEntry')) return;
  _startInterval();
  _updateTopbarTimer();
}

/**
 * Detiene el timer y persiste en el backend
 */
export async function stop() {
  const entry = state.get('activeEntry');
  if (!entry) return;

  _stopInterval();
  const elapsed = _startMs ? Date.now() - _startMs : 0;

  try {
    const result = await api.stopTimeEntry(entry.id);
    const timeEntries = state.get('timeEntries');
    timeEntries.unshift({
      ...entry,
      stoppedAt: new Date().toISOString(),
      durationMs: result.entry?.durationMs || elapsed,
    });
    state.update('timeEntries', timeEntries.slice(0, 50)); // Máximo 50 entries
  } catch {
    // Guardar localmente si el backend no está disponible
    const timeEntries = state.get('timeEntries');
    timeEntries.unshift({
      ...entry,
      stoppedAt: new Date().toISOString(),
      durationMs: elapsed,
    });
    state.update('timeEntries', timeEntries.slice(0, 50));
  }

  state.update('activeEntry', null);
  _startMs = null;
  _updateTopbarTimer();
}

/**
 * Obtiene el tiempo transcurrido actual en ms
 */
export function getElapsed() {
  if (!state.get('activeEntry') || !_startMs) return 0;
  return Date.now() - _startMs;
}

/**
 * Obtiene el total de tiempo registrado para una tarea (en ms)
 * @param {string} taskId
 */
export function getTotalForTask(taskId) {
  return state.get('timeEntries')
    .filter(e => e.taskId === taskId)
    .reduce((acc, e) => acc + (e.durationMs || 0), 0);
}

/**
 * Carga los time entries del backend
 */
export async function loadEntries() {
  try {
    const result = await api.getTimeEntries();
    state.update('timeEntries', result.entries || []);
  } catch {
    // Si el endpoint no existe aún, usar array vacío
    state.update('timeEntries', []);
  }
}

// ─────────────────────────────── PRIVADO ────────────────────────────────────

function _startInterval() {
  _stopInterval();
  _interval = setInterval(() => {
    _updateTimerDisplays();
  }, 1000);
}

function _stopInterval() {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
  state.update('timerInterval', null);
}

function _updateTimerDisplays() {
  const elapsed = getElapsed();
  const formatted = formatDuration(elapsed);

  // Topbar timer
  const topbarDisplay = document.getElementById('topbar-timer-display');
  if (topbarDisplay) topbarDisplay.textContent = formatted;

  // Widget grande (si está visible en Overview)
  const bigDisplay = document.querySelector('.timer-display');
  if (bigDisplay) bigDisplay.textContent = formatted;
}

function _updateTopbarTimer() {
  const entry = state.get('activeEntry');
  const topbarTimer = document.getElementById('topbar-timer');
  if (!topbarTimer) return;

  if (entry) {
    topbarTimer.classList.add('is-running');
    const dot = topbarTimer.querySelector('.topbar-timer-dot');
    const display = document.getElementById('topbar-timer-display');
    if (display) display.textContent = formatDuration(getElapsed());
  } else {
    topbarTimer.classList.remove('is-running');
    const display = document.getElementById('topbar-timer-display');
    if (display) display.textContent = '00:00:00';
  }
}

/**
 * Renderiza el widget grande del timer (para overview.js)
 * @param {string|null} taskId - tarea preseleccionada
 * @returns {string} HTML
 */
export function renderWidget(taskId = null) {
  const entry     = state.get('activeEntry');
  const isRunning = !!entry && (!taskId || entry.taskId === taskId);
  const elapsed   = isRunning ? getElapsed() : 0;
  const totalMs   = taskId ? getTotalForTask(taskId) : 0;

  const taskTitle = entry?.taskTitle || 'Sin tarea seleccionada';

  return `
    <div class="time-tracker-card" id="time-tracker-widget">
      <div class="section-header" style="margin-bottom:var(--space-2)">
        <div class="section-header-left">
          <p class="eyebrow">Time Tracker</p>
        </div>
      </div>

      <p class="timer-task-name" id="timer-task-name">${isRunning ? taskTitle : (taskId ? 'Clic en Iniciar para comenzar' : 'Selecciona una tarea en el board')}</p>

      <div class="timer-display ${isRunning ? 'is-running' : ''}" id="timer-display">
        ${formatDuration(elapsed)}
      </div>

      <div class="timer-controls">
        ${isRunning ? `
          <button class="timer-btn timer-btn-stop" id="timer-stop" type="button" aria-label="Detener timer" title="Detener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </button>
          <button class="timer-btn timer-btn-pause timer-btn-play" id="timer-pause" type="button" aria-label="Pausar timer" title="Pausar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
        ` : `
          <button class="timer-btn timer-btn-play" id="timer-play" type="button" aria-label="Iniciar timer" title="Iniciar" ${!taskId ? 'disabled' : ''}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        `}
      </div>

      ${totalMs > 0 ? `<p class="timer-total">Total registrado: <strong>${formatDuration(totalMs)}</strong></p>` : ''}
    </div>
  `;
}

/**
 * Vincula los eventos del widget del timer al DOM
 * @param {string|null} taskId
 * @param {string|null} taskTitle
 */
export function bindWidget(taskId, taskTitle) {
  const playBtn  = document.getElementById('timer-play');
  const pauseBtn = document.getElementById('timer-pause');
  const stopBtn  = document.getElementById('timer-stop');

  playBtn?.addEventListener('click', () => start(taskId, taskTitle));
  pauseBtn?.addEventListener('click', () => {
    if (_interval) pause();
    else resume();
  });
  stopBtn?.addEventListener('click', stop);
}

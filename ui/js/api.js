/**
 * api.js — Capa de comunicación con el backend TrackOps
 * Wrapper sobre fetch con gestión de errores, project-awareness
 * y tipado de los endpoints disponibles en lib/server.js
 */

import * as state from './state.js';

/**
 * Llamada base a la API
 * @param {string} url
 * @param {RequestInit & { projectAware?: boolean }} options
 * @returns {Promise<Object>}
 */
async function call(url, options = {}) {
  const target = new URL(url, window.location.origin);
  const currentId = state.get('currentProjectId');
  if (options.projectAware !== false && currentId && !target.searchParams.has('project')) {
    target.searchParams.set('project', currentId);
  }

  const response = await fetch(target, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};

  if (!response.ok || json.ok === false) {
    const err = new Error(json.error || `HTTP ${response.status}: ${response.statusText}`);
    err.status = response.status;
    throw err;
  }

  return json;
}

// ─────────────────────────────── PROYECTOS ──────────────────────────────────

/**
 * Lista todos los proyectos del portfolio
 */
export async function getProjects() {
  return call('/api/projects', { projectAware: false });
}

/**
 * Registra un proyecto existente en el portfolio
 * @param {string} root - ruta del directorio del proyecto
 */
export async function registerProject(root) {
  return call('/api/projects/register', {
    method: 'POST',
    projectAware: false,
    body: JSON.stringify({ root }),
  });
}

/**
 * Instala trackops en un nuevo proyecto
 * @param {string} root
 */
export async function installProject(root, options = {}) {
  return call('/api/projects/install', {
    method: 'POST',
    projectAware: false,
    body: JSON.stringify({ root, ...options }),
  });
}

export async function updateProjectLocale(locale) {
  return call('/api/projects/locale', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), locale }),
  });
}

// ─────────────────────────────── ESTADO ─────────────────────────────────────

/**
 * Obtiene el estado completo del proyecto activo
 */
export async function getState() {
  return call('/api/state');
}

export async function getEnvStatus() {
  return call('/api/env');
}

export async function syncEnv() {
  return call('/api/env/sync', {
    method: 'POST',
  });
}

// ─────────────────────────────── TAREAS ─────────────────────────────────────

/**
 * Crea una nueva tarea
 * @param {Object} payload
 */
export async function createTask(payload) {
  return call('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), ...payload }),
  });
}

/**
 * Actualiza una tarea existente (edición completa)
 * @param {string} taskId
 * @param {Object} payload
 */
export async function updateTask(taskId, payload) {
  return call(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), ...payload }),
  });
}

/**
 * Ejecuta una acción sobre una tarea (start, review, complete, block, pending, cancel)
 * @param {string} taskId
 * @param {string} action
 * @param {string} [note]
 */
export async function taskAction(taskId, action, note = '') {
  return call(`/api/tasks/${encodeURIComponent(taskId)}/action`, {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), action, note }),
  });
}

// ─────────────────────────────── SYNC ───────────────────────────────────────

/**
 * Sincroniza los docs del proyecto (task_plan.md, progress.md, findings.md)
 */
export async function syncDocs() {
  return call('/api/sync', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId') }),
  });
}

// ─────────────────────────────── COMANDOS ───────────────────────────────────

/**
 * Ejecuta un comando en el shell del proyecto
 * @param {string} command
 */
export async function runCommand(command) {
  return call('/api/commands', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), command }),
  });
}

/**
 * Crea un EventSource para hacer streaming de salida de una sesión
 * @param {string} sessionId
 * @returns {EventSource}
 */
export function streamSession(sessionId) {
  return new EventSource(`/api/commands/${encodeURIComponent(sessionId)}/stream`);
}

// ─────────────────────────────── TIME TRACKING ──────────────────────────────

/**
 * Inicia un time entry para una tarea
 * @param {string} taskId
 * @param {string} taskTitle
 */
export async function startTimeEntry(taskId, taskTitle) {
  return call('/api/time/start', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), taskId, taskTitle }),
  });
}

/**
 * Detiene el time entry activo
 * @param {string} entryId
 */
export async function stopTimeEntry(entryId) {
  return call('/api/time/stop', {
    method: 'POST',
    body: JSON.stringify({ projectId: state.get('currentProjectId'), entryId }),
  });
}

/**
 * Obtiene los time entries del proyecto activo
 */
export async function getTimeEntries() {
  return call('/api/time');
}

// ─────────────────────────────── SKILLS HUB ────────────────────────────────

export async function fetchSkillsLocal() {
  return call('/api/skills/local');
}

export async function fetchSkillsDiscover() {
  return call('/api/skills/discover');
}

export async function installSkill(skillId) {
  return call('/api/skills/install', {
    method: 'POST',
    body: JSON.stringify({ skillId }) 
  });
}

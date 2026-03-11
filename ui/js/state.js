/**
 * state.js — Store centralizado con patrón pub/sub
 * Reemplaza el objeto state simple del app.js anterior.
 */

const _state = {
  // Proyectos
  projects:         [],
  registryFile:     '',
  currentProjectId: null,

  // Payload del backend
  payload:          null,

  // Selecciones UI
  selectedTaskId:   null,
  activeView:       'overview',

  // Sesiones de terminal
  sessions:         [],
  selectedSessionId: null,
  stream:           null,

  // Time tracker
  timeEntries:      [],
  activeEntry:      null,     // { taskId, taskTitle, startedAt }
  timerInterval:    null,

  // i18n
  locale:           'es',
  statusLabels:     {},
  phases:           [],

  // Búsqueda
  searchQuery:      '',

  // Onboarding
  onboardingDone:   false,

  // Console logs
  consoleLogs:      [],
  consolePanelOpen: false,
};

const _listeners = {};

/**
 * Obtiene un valor del estado
 * @param {string} key
 * @returns {*}
 */
export function get(key) {
  return _state[key];
}

/**
 * Actualiza una o más claves del estado y notifica a los suscriptores
 * @param {string|Object} keyOrObject - clave o mapa de {clave: valor}
 * @param {*} [value]
 */
export function update(keyOrObject, value) {
  if (typeof keyOrObject === 'string') {
    _state[keyOrObject] = value;
    _notify(keyOrObject, value);
  } else {
    for (const [k, v] of Object.entries(keyOrObject)) {
      _state[k] = v;
      _notify(k, v);
    }
  }
}

/**
 * Suscribe una función a cambios de una clave específica
 * @param {string} key
 * @param {Function} callback - recibe (newValue, key)
 * @returns {Function} función de desuscripción
 */
export function subscribe(key, callback) {
  if (!_listeners[key]) _listeners[key] = new Set();
  _listeners[key].add(callback);
  return () => _listeners[key]?.delete(callback);
}

/**
 * Obtiene el payload completo (shortcut)
 */
export function getPayload() { return _state.payload; }

/**
 * Obtiene el proyecto activo de la lista de proyectos
 */
export function getCurrentProject() {
  return _state.projects.find(p => p.id === _state.currentProjectId) || null;
}

/**
 * Obtiene las fases según el i18n cargado desde el backend
 */
export function getPhases() { return _state.phases; }

/**
 * Obtiene el mapa de labels de estado
 */
export function getStatusLabels() { return _state.statusLabels; }

/**
 * Encuentra una tarea por id en el payload actual
 * @param {string} id
 * @returns {Object|null}
 */
export function findTask(id) {
  return _state.payload?.derived?.tasks?.find(t => t.id === id) || null;
}

/**
 * Obtiene el estado completo (solo para debug)
 */
export function snapshot() { return { ..._state }; }

function _notify(key, value) {
  (_listeners[key] || []).forEach(cb => {
    try { cb(value, key); } catch (e) { console.error('[state] Error en suscriptor:', e); }
  });
  // Notificar también al comodín '*'
  (_listeners['*'] || []).forEach(cb => {
    try { cb(value, key); } catch (e) { console.error('[state] Error en suscriptor (*)', e); }
  });
}

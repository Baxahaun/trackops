/**
 * onboarding.js — Tour interactivo tipo spotlight
 *
 * Técnica: un div con box-shadow gigante rodea el target,
 * dejando solo ese elemento visible. El tooltip-bocadillo
 * tiene una flecha CSS que apunta directamente al target.
 */

import * as state from './state.js';

const STORAGE_KEY = 'trackops-onboarding-v2';

/* ── PASOS ──────────────────────────────────────────────────────────────── */

const STEPS = [
  // 0 — Bienvenida (sin target)
  {
    title:    '¡Bienvenido a TrackOps!',
    desc:     'Tu motor operativo local para desarrolladores. Vamos a hacer un tour rápido — solo tarda 2 minutos.',
    target:   null,
    view:     null,
    pos:      'center',
  },

  // 1 — Sidebar / navegación
  {
    title:    'Navegación principal',
    desc:     'La barra lateral te lleva entre las vistas principales: resumen, tareas, tablero, ejecución y analíticas. El indicador naranja marca tareas pendientes.',
    target:   '#sidebar',
    view:     'overview',
    pos:      'right',
  },

  // 2 — KPI cards
  {
    title:    'Métricas de un vistazo',
    desc:     'Cuatro KPI cards muestran en tiempo real: trabajo abierto, completado, bloqueado y en revisión. Los colores del borde superior indican el estado.',
    target:   '.kpi-grid',
    view:     'overview',
    pos:      'bottom',
  },

  // 3 — Gráfico de actividad
  {
    title:    'Actividad semanal',
    desc:     'El gráfico de barras muestra los cambios de estado de los últimos 10 días. Identifica picos de trabajo y periodos de inactividad.',
    target:   '.chart-card',
    view:     'overview',
    pos:      'bottom',
  },

  // 4 — Donut de progreso
  {
    title:    'Progreso Global',
    desc:     'El donut SVG desglosa el estado de todas las tareas: completadas (verde), en progreso (azul), bloqueadas (rojo) y pendientes (naranja).',
    target:   '.donut-wrapper',
    view:     'overview',
    pos:      'left',
  },

  // 5 — Time Tracker
  {
    title:    'Seguimiento de tiempo',
    desc:     'Registra el tiempo dedicado a cada tarea. Pulsa iniciar, trabaja y luego detén el contador. La duración queda guardada para análisis posterior.',
    target:   '.time-tracker-card',
    view:     'overview',
    pos:      'top',
  },

  // 6 — Topbar: búsqueda
  {
    title:    'Búsqueda global',
    desc:     'Filtra tareas en tiempo real desde cualquier vista con ⌘/Ctrl+F. El selector de proyecto te permite cambiar entre proyectos registrados.',
    target:   '.topbar-search',
    view:     'overview',
    pos:      'bottom',
  },

  // 7 — Board (Kanban)
  {
    title:    'Tablero Kanban',
    desc:     'Arrastra las tarjetas entre columnas para cambiar el estado de una tarea. Cada movimiento actualiza el historial y regenera los docs Markdown.',
    target:   '.board-grid',
    view:     'board',
    pos:      'top',
  },

  // 8 — Editor de tareas
  {
    title:    'Editor de Tareas',
    desc:     'Selecciona cualquier tarea para editarla en el panel derecho. Puedes cambiar prioridad, fase, criterios de aceptación y usar el action strip para transicionar estados.',
    target:   '.task-list',
    view:     'tasks',
    pos:      'right',
  },

  // 9 — Ejecución / Consola
  {
    title:    'Consola Integrada',
    desc:     'Ejecuta comandos de terminal directamente desde el dashboard. Los Quick Commands incluyen los flujos más comunes: status, sync, git log…',
    target:   '.terminal-surface',
    view:     'execution',
    pos:      'top',
  },

  // 10 — Analytics
  {
    title:    'Analíticas del proyecto',
    desc:     'Esta vista reúne salud operativa, distribución por estado, tiempo por tarea, progreso por fase y la actividad reciente.',
    target:   '.health-grid',
    view:     'insights',
    pos:      'bottom',
  },

  // 11 — AI Skill Hub
  {
    title:    'Centro de habilidades',
    desc:     'Tu copiloto evoluciona. Descubre e instala nuevas habilidades específicas para tu contexto a través del repositorio integrado de la comunidad.',
    target:   '#view-skills',
    view:     'skills',
    pos:      'right',
  },

  // 12 — Theme toggle
  {
    title:    'Tema claro / oscuro',
    desc:     'Alterna entre tema claro y oscuro con un clic. Tu preferencia se guarda automáticamente y respeta la configuración del sistema operativo.',
    target:   '#theme-toggle-btn',
    view:     'overview',
    pos:      'bottom',
  },

  // 13 — Fin
  {
    title:    '¡Todo listo!',
    desc:     'Puedes relanzar este tour en cualquier momento desde "Ayuda & Tour" en la parte inferior del sidebar.',
    target:   null,
    view:     null,
    pos:      'center',
  },
];

/* ── ESTADO ──────────────────────────────────────────────────────────────── */

let _step      = 0;
let _spotlight = null;
let _tooltip   = null;
let _active    = false;
let _ring      = null;
let _escHandler = null;

/* ── API PÚBLICA ─────────────────────────────────────────────────────────── */

export function init() {
  _spotlight = document.getElementById('onboarding-spotlight');
  _tooltip   = document.getElementById('onboarding-tooltip');
  if (!_spotlight || !_tooltip) return;

  _bindStaticEvents();

  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(show, 900);
  }
}

export function show() {
  _step   = 0;
  _active = true;
  _spotlight.classList.remove('is-hidden');
  _tooltip.classList.remove('is-hidden');
  _renderStep();
}

export function finish() {
  _active = false;
  localStorage.setItem(STORAGE_KEY, '1');
  _spotlight.classList.add('is-hidden');
  _tooltip.classList.add('is-hidden');
  _clearRing();
  _clearSpotlight();
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
  state.update('onboardingDone', true);
}

export function reset() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ── RENDERIZADO ─────────────────────────────────────────────────────────── */

async function _renderStep() {
  if (!_active) return;
  const step   = STEPS[_step];
  const total  = STEPS.length;
  const isLast = _step === total - 1;
  const isFirst = _step === 0;

  // Navegar a la vista correcta antes de medir el target
  if (step.view) {
    const router = await import('./router.js');
    if (router.current() !== step.view) {
      await router.navigate(step.view);
      // Esperar al siguiente frame para que el DOM esté pintado
      await _nextFrame(120);
    }
  }

  // Actualizar contenido del tooltip
  document.getElementById('ob-step-label').textContent = `Paso ${_step + 1} de ${total}`;
  document.getElementById('ob-title').textContent       = step.title;
  document.getElementById('ob-desc').textContent        = step.desc;
  document.getElementById('ob-next').textContent        = isLast ? '¡Empezar!' : 'Siguiente →';
  document.getElementById('ob-prev').style.visibility  = isFirst ? 'hidden' : 'visible';

  // Dots
  const dotsEl = document.getElementById('ob-dots');
  if (dotsEl) {
    dotsEl.innerHTML = STEPS.map((_, i) =>
      `<span class="ob-dot ${i === _step ? 'is-active' : ''}" aria-hidden="true"></span>`
    ).join('');
  }

  // Mostrar tooltip con animación de entrada oculta temporalmente (para no saltar)
  _tooltip.classList.remove('ob-enter');
  _clearRing();

  // Posicionar
  if (step.target) {
    const targetEl = _findTarget(step.target, step.view);
    if (targetEl) {
      // Hacer scroll suave para centrar el elemento en el viewport
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await _nextFrame(400); // Esperar que termine el scroll
      _applySpotlight(targetEl);
      _applyRing(targetEl);
      _positionTooltip(targetEl, step.pos);
      _mostrarTooltip();
      return;
    }
  }

  // Sin target → centrado
  _clearSpotlight();
  _positionCenter();
  _mostrarTooltip();
}

function _mostrarTooltip() {
  void _tooltip.offsetWidth; // reflow
  _tooltip.classList.add('ob-enter');
}

/* ── SPOTLIGHT ───────────────────────────────────────────────────────────── */

function _applySpotlight(el) {
  const PADDING = 10;
  const rect = el.getBoundingClientRect();

  // El spotlight es el propio elemento; usamos box-shadow inmenso para oscurecer el resto
  _spotlight.style.cssText = `
    position: fixed;
    left:   ${rect.left   - PADDING}px;
    top:    ${rect.top    - PADDING}px;
    width:  ${rect.width  + PADDING * 2}px;
    height: ${rect.height + PADDING * 2}px;
    border-radius: 12px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.72);
    z-index: var(--z-onboard);
    pointer-events: none;
    transition: all 280ms cubic-bezier(0.16, 1, 0.3, 1);
  `;
}

function _clearSpotlight() {
  _spotlight.style.cssText = `
    position: fixed;
    inset: 0;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.72);
    z-index: var(--z-onboard);
    pointer-events: none;
    background: transparent;
    border-radius: 0;
  `;
}

/* ── RING ANIMADO alrededor del target ───────────────────────────────────── */

function _applyRing(el) {
  _clearRing();
  const PADDING = 10;
  const rect = el.getBoundingClientRect();

  _ring = document.createElement('div');
  _ring.className = 'onboarding-ring';
  _ring.setAttribute('aria-hidden', 'true');
  _ring.style.cssText = `
    position: fixed;
    left:   ${rect.left   - PADDING}px;
    top:    ${rect.top    - PADDING}px;
    width:  ${rect.width  + PADDING * 2}px;
    height: ${rect.height + PADDING * 2}px;
    border-radius: 14px;
    border: 2px solid var(--accent);
    z-index: calc(var(--z-onboard) + 1);
    pointer-events: none;
    animation: ob-ring-pulse 1.8s ease-in-out infinite;
  `;
  document.body.appendChild(_ring);
}

function _clearRing() {
  if (_ring) {
    _ring.remove();
    _ring = null;
  }
}

/* ── POSICIONAMIENTO DEL TOOLTIP ─────────────────────────────────────────── */

function _positionCenter() {
  _tooltip.removeAttribute('data-pos');
  _tooltip.style.cssText = `
    position: fixed;
    left: 50%;
    top:  50%;
    transform: translate(-50%, -50%);
    z-index: calc(var(--z-onboard) + 2);
  `;
}

function _positionTooltip(el, preferredPos) {
  const MARGIN  = 18;
  const TW      = 420; // Más ancho para acomodar navegación + botones
  const TH      = 220;
  const PADDING = 10;
  const rect    = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Determinar la mejor posición disponible
  const available = {
    right:  vw - rect.right  - PADDING >= TW + MARGIN,
    left:   rect.left - PADDING         >= TW + MARGIN,
    bottom: vh - rect.bottom - PADDING  >= TH + MARGIN,
    top:    rect.top   - PADDING        >= TH + MARGIN,
  };

  let pos = preferredPos;
  if (!available[pos]) {
    // Fallback en orden de preferencia
    pos = ['right', 'left', 'bottom', 'top'].find(p => available[p]) || 'bottom';
  }

  let left, top;

  switch (pos) {
    case 'right':
      left = rect.right + PADDING + MARGIN;
      top  = rect.top + rect.height / 2 - TH / 2;
      break;
    case 'left':
      left = rect.left - PADDING - MARGIN - TW;
      top  = rect.top + rect.height / 2 - TH / 2;
      break;
    case 'bottom':
      left = rect.left + rect.width / 2 - TW / 2;
      top  = rect.bottom + PADDING + MARGIN;
      break;
    case 'top':
      left = rect.left + rect.width / 2 - TW / 2;
      top  = rect.top - PADDING - MARGIN - TH;
      break;
  }

  // Clamp dentro del viewport
  left = Math.max(MARGIN, Math.min(left, vw - TW - MARGIN));
  top  = Math.max(MARGIN, Math.min(top,  vh - TH - MARGIN));

  _tooltip.setAttribute('data-pos', pos);
  _tooltip.style.cssText = `
    position: fixed;
    left: ${left}px;
    top:  ${top}px;
    width: ${TW}px;
    z-index: calc(var(--z-onboard) + 2);
    transform: none;
  `;
}

/* ── EVENTOS ─────────────────────────────────────────────────────────────── */

function _bindStaticEvents() {
  const tooltip = _tooltip;
  if (!tooltip) return;

  tooltip.addEventListener('click', e => {
    const btn = e.target.closest('button[id]');
    if (!btn) return;
    if (btn.id === 'ob-next') _advance(1);
    if (btn.id === 'ob-prev') _advance(-1);
    if (btn.id === 'ob-skip') finish();
  });

  // Escape para cerrar
  _escHandler = e => {
    if (e.key === 'Escape' && _active) finish();
  };
  document.addEventListener('keydown', _escHandler);

  // Clic en el backdrop (fuera del tooltip) → cerrar
  _spotlight.addEventListener('click', finish);
}

function _advance(dir) {
  if (dir > 0 && _step === STEPS.length - 1) {
    finish();
    return;
  }
  _step = Math.max(0, Math.min(_step + dir, STEPS.length - 1));
  _renderStep();
}

/* ── UTILS ───────────────────────────────────────────────────────────────── */

function _findTarget(selector, _view) {
  // Intentar el selector tal cual
  let el = document.querySelector(selector);
  if (el) return el;
  return null;
}

function _nextFrame(ms = 60) {
  return new Promise(res => setTimeout(res, ms));
}

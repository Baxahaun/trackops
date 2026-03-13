/**
 * utils.js — Funciones de utilidad globales
 */

import * as state from './state.js';

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {*} value
 * @returns {string}
 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formatea una fecha ISO a formato legible según locale
 * @param {string} value - ISO date string
 * @param {'date'|'datetime'|'time'} style
 * @returns {string}
 */
export function formatDate(value, style = 'datetime') {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const locale = state.get('locale') === 'en' ? 'en-US' : 'es-ES';
    if (style === 'date') {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    }
    if (style === 'time') {
      return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date);
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return value;
  }
}

/**
 * Formatea duración en ms a HH:MM:SS
 * @param {number} ms - milisegundos
 * @returns {string}
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

/**
 * Formatea duración en ms a string legible (ej: "2h 15m")
 * @param {number} ms
 * @returns {string}
 */
export function formatDurationShort(ms) {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Debounce: retrasa la ejecución de una función hasta que deja de llamarse
 * @param {Function} fn
 * @param {number} wait - ms
 * @returns {Function}
 */
export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Genera array de los últimos N días (YYYY-MM-DD)
 * @param {number} count
 * @returns {string[]}
 */
export function lastDays(count = 10) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - i - 1));
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Divide un string multilínea o separado por comas en array de strings
 * @param {string} value
 * @returns {string[]}
 */
export function splitLines(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Slugifica un string (minúsculas, sin acentos, sin caracteres especiales)
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Extrae el historial de todas las tareas ordenado desc por fecha
 * @param {Array} tasks
 * @returns {Array}
 */
export function extractHistory(tasks) {
  return (tasks || [])
    .flatMap(t => (t.history || []).map(e => ({ ...e, taskId: t.id, taskTitle: t.title })))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

/**
 * Genera un número de color consistente desde un string
 * @param {string} str
 * @returns {string} hsl color
 */
export function stringToColor(str) {
  let hash = 0;
  for (const ch of (str || '')) {
    hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 60%, 65%)`;
}

/**
 * Clamp: limita valor entre min y max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Crea un elemento <div> con clases opcionales e innerHTML
 * (helper para generación de DOM sin frameworks)
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [innerHTML]
 * @returns {HTMLElement}
 */
export function el(tag = 'div', className = '', innerHTML = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

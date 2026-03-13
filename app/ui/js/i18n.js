import * as state from './state.js';

export function t(key, params = {}, fallback = null) {
  const messages = state.get('messages') || {};
  let value = messages[key] || fallback || key;
  for (const [param, replacement] of Object.entries(params)) {
    value = value.replace(new RegExp(`\\{${param}\\}`, 'g'), String(replacement));
  }
  return value;
}

export function listFormat(values, separator = ', ') {
  return (values || []).filter(Boolean).join(separator);
}

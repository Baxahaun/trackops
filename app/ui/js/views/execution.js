/**
 * execution.js — Consola integrada + sesiones de comandos
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import { flash } from './flash.js';
import { esc, formatDate } from '../utils.js';
import { t } from '../i18n.js';

export async function render() {
  const sessions = state.get('sessions');
  const selected = sessions.find(s => s.id === state.get('selectedSessionId'));
  const quickCommands = [
    { label: t('ui.execution.quick.status', {}, 'status'), cmd: 'npx trackops status' },
    { label: t('ui.execution.quick.sync', {}, 'sync docs'), cmd: 'npx trackops sync' },
    { label: t('ui.execution.quick.next', {}, 'next tasks'), cmd: 'npx trackops next' },
    { label: t('ui.execution.quick.repo', {}, 'refresh repo'), cmd: 'npx trackops refresh-repo' },
    { label: 'git status', cmd: 'git status --short' },
    { label: 'git log', cmd: 'git log --oneline -10' },
  ];

  return `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">${t('ui.execution.eyebrow', {}, 'Execution')}</p>
          <h2>${t('ui.execution.title', {}, 'Command Console')}</h2>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:var(--space-4);align-items:start">

        <!-- Panel izquierdo: input + sesiones -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Command input -->
          <div class="panel">
            <div class="panel-header">
              <p class="panel-title">${t('ui.execution.run', {}, 'Run')}</p>
            </div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
              <div class="field">
                <label for="cmd-input">${t('ui.execution.command', {}, 'Command')}</label>
                <textarea id="cmd-input" rows="3"
                  placeholder="npx trackops status"
                  aria-label="${t('ui.execution.commandAria', {}, 'Enter the command to run')}"
                  style="font-family:var(--font-mono);font-size:var(--text-sm)"></textarea>
              </div>
              <button class="btn btn-primary" type="button" id="run-cmd-btn" aria-label="${t('ui.execution.runButtonAria', {}, 'Run command')}">
                ${icon('execution', 15)} ${t('ui.execution.run', {}, 'Run')}
              </button>
            </div>
            <div class="panel-footer">
              <p class="label-sm" style="margin-bottom:var(--space-2)">${t('ui.execution.quickTitle', {}, 'Quick commands')}</p>
              <div class="preset-strip">
                ${quickCommands.map(c => `
                  <button class="chip" type="button" data-quick="${esc(c.cmd)}"
                    aria-label="${t('ui.execution.runQuick', { label: c.label }, `Run ${c.label}`)}">
                    ${esc(c.label)}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Lista de sesiones -->
          <div class="panel">
            <div class="panel-header">
              <p class="panel-title">${t('ui.execution.sessions', {}, 'Sessions')}</p>
              <span class="badge badge-muted">${sessions.length}</span>
            </div>
            <div class="panel-body" style="max-height:360px;overflow-y:auto">
              ${sessions.length === 0
                ? `<div class="empty-state">${t('ui.execution.noSessions', {}, 'No active sessions.')}</div>`
                : `<div class="stack stack-sm">
                    ${sessions.slice().reverse().map(s => `
                      <div class="session-pill ${s.id === state.get('selectedSessionId') ? 'is-selected' : ''}"
                        data-session-id="${esc(s.id)}"
                        role="button" tabindex="0"
                        aria-selected="${s.id === state.get('selectedSessionId')}"
                        aria-label="${esc(s.command)}, ${esc(s.status)}">
                        <span class="session-pill-cmd">${esc(s.command)}</span>
                        <span class="badge session-pill-status ${_sessionBadgeClass(s.status)}">${esc(s.status)}</span>
                      </div>
                    `).join('')}
                  </div>`
              }
            </div>
          </div>

        </div>

        <!-- Terminal output -->
        <div class="terminal-surface" style="min-height:600px;display:flex;flex-direction:column">
          <div class="terminal-header">
            <div class="terminal-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <p class="terminal-title">${selected ? esc(selected.command) : t('ui.execution.noSessionTitle', {}, 'ops@terminal — no active session')}</p>
            <div style="display:flex;gap:var(--space-2)">
              ${selected && selected.status === 'running' ? `
                <button class="btn btn-ghost btn-sm" id="kill-session-btn" type="button" aria-label="${t('ui.execution.stopAria', {}, 'Stop process')}">
                  ${icon('stop', 13)} ${t('ui.execution.stop', {}, 'Stop')}
                </button>
              ` : ''}
            </div>
          </div>
          <pre class="terminal-output" id="terminal-output" aria-label="${t('ui.execution.output', {}, 'Command output')}" aria-live="polite">${selected ? esc(selected.output) : `${t('ui.execution.outputPlaceholder', {}, '# Run a command to see its output here…')}\n`}</pre>
          ${selected ? `<div class="panel-footer" style="display:flex;justify-content:space-between;align-items:center;font-family:var(--font-mono);font-size:var(--text-xs)">
            <span class="text-muted">${t('ui.execution.started', {}, 'Started')}: ${formatDate(selected.startedAt)}</span>
            <span class="badge ${_sessionBadgeClass(selected.status)}">${esc(selected.status)}${selected.exitCode != null ? ` (${selected.exitCode})` : ''}</span>
          </div>` : ''}
        </div>

      </div>
    </div>
  `;
}

function _sessionBadgeClass(status) {
  const map = {
    running:   'badge-info',
    completed: 'badge-success',
    failed:    'badge-danger',
    terminated:'badge-warning',
  };
  return map[status] || 'badge-muted';
}

export function bindEvents() {
  // Run command button
  document.getElementById('run-cmd-btn')?.addEventListener('click', _runCommand);

  // Ctrl+Enter en el textarea
  document.getElementById('cmd-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      _runCommand();
    }
  });

  // Quick commands
  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('cmd-input');
      if (input) {
        input.value = btn.dataset.quick;
        input.focus();
      }
    });
  });

  // Seleccionar sesión
  document.querySelectorAll('[data-session-id]').forEach(pill => {
    pill.addEventListener('click', () => {
      const id = pill.dataset.sessionId;
      state.update('selectedSessionId', id);
      import('../router.js').then(r => r.refresh());
    });
    pill.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pill.click();
      }
    });
  });
}

async function _runCommand() {
  const input = document.getElementById('cmd-input');
  const cmd   = input?.value.trim();
  if (!cmd) return;

  const btn = document.getElementById('run-cmd-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = `${icon('spinner', 15)} ${t('ui.execution.running', {}, 'Running…')}`; }

  try {
    const result = await api.runCommand(cmd);
    const sessionId = result.session?.id || result.sessionId;

    // Añadir sesión al estado
    const sessions = state.get('sessions');
    const newSession = {
      id:        sessionId,
      command:   cmd,
      status:    'running',
      exitCode:  null,
      output:    '',
      startedAt: new Date().toISOString(),
    };
    sessions.push(newSession);
    state.update('sessions', sessions);
    state.update('selectedSessionId', sessionId);

    // Refresh UI
    import('../router.js').then(r => r.refresh()).then(() => {
      _subscribeToStream(sessionId, cmd);
    });

    if (input) input.value = '';
  } catch (err) {
    flash(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `${icon('execution', 15)} ${t('ui.execution.run', {}, 'Run')}`; }
  }
}

function _subscribeToStream(sessionId, _cmd) {
  const es = api.streamSession(sessionId);
  const terminal = document.getElementById('terminal-output');

  es.addEventListener('message', e => {
    try {
      const data = JSON.parse(e.data);
      const sessions = state.get('sessions');
      const session  = sessions.find(s => s.id === sessionId);

      if (data.type === 'stdout' || data.type === 'stderr') {
        if (session) session.output += data.chunk;
        if (terminal && state.get('selectedSessionId') === sessionId) {
          terminal.textContent = session?.output || '';
          terminal.scrollTop = terminal.scrollHeight;
        }
      } else if (data.type === 'done') {
        if (session) {
          session.status   = data.status;
          session.exitCode = data.exitCode;
          session.output   = data.output;
        }
        state.update('sessions', sessions);
        if (state.get('selectedSessionId') === sessionId) {
          import('../router.js').then(r => r.refresh());
        }
        es.close();
        window.dispatchEvent(new CustomEvent('ops:refresh'));
      }
    } catch (err) {
      console.error('[execution] Error parseando evento SSE:', err);
    }
  });

  es.onerror = () => {
    const sessions = state.get('sessions');
    const session  = sessions.find(s => s.id === sessionId);
    if (session && session.status === 'running') {
      session.status = 'failed';
      state.update('sessions', sessions);
    }
    es.close();
  };
}

// Vinculación de eventos se llama desde la vista
export { bindEvents as bind };

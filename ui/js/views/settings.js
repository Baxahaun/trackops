/**
 * settings.js — Vista de configuración del proyecto
 */

import { icon } from '../icons.js';
import * as state from '../state.js';
import * as api from '../api.js';
import { flash } from './flash.js';
import { esc, formatDate } from '../utils.js';
import { t } from '../i18n.js';

function applyLocaleState(payload) {
  if (!payload) return;
  state.update('payload', payload);
  if (payload.i18n) {
    state.update({
      phases: payload.i18n.phases || [],
      statusLabels: payload.i18n.statusLabels || {},
      locale: payload.i18n.locale || 'es',
      messages: payload.i18n.messages || {},
    });
  }
}

export async function render() {
  const payload   = state.getPayload();
  const projects  = state.get('projects');
  const currentId = state.get('currentProjectId');
  const control   = payload?.control;
  const runtime   = payload?.runtime;
  const docsDirty = payload?.docsDirty || [];

  return `
    <div class="view-enter">
      <div class="section-header">
        <div class="section-header-left">
          <p class="eyebrow">${t('ui.settings.eyebrow', {}, 'Settings')}</p>
          <h2>${t('ui.settings.title', {}, 'Project settings')}</h2>
        </div>
      </div>

      <div class="grid-2" style="align-items:start">

        <!-- Col izquierda -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Info del proyecto activo -->
          ${control ? `
            <div class="panel">
              <div class="panel-header">
                <p class="panel-title">Proyecto Activo</p>
                <span class="badge badge-success">Activo</span>
              </div>
              <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="info-row">
                  <p class="label-sm">Nombre</p>
                  <p class="value">${esc(control.meta?.projectName || '—')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Ruta</p>
                  <p class="value">${esc(payload?.project?.root || '—')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Fase activa</p>
                  <p class="value">${esc(payload?.derived?.activePhase?.id || '—')} — ${esc(payload?.derived?.activePhase?.label || '')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Foco actual</p>
                  <p class="value">${esc(control.meta?.currentFocus || '—')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Entrega objetivo</p>
                  <p class="value">${esc(control.meta?.deliveryTarget || '—')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Última actualización</p>
                  <p class="value">${formatDate(control.meta?.updatedAt || '', 'date')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">${t('ui.topbar.language', {}, 'Language')}</p>
                  <div class="project-select-wrapper locale-select-wrapper">
                    <select id="settings-locale-select" aria-label="${t('ui.topbar.languageAria', {}, 'Select dashboard language')}">
                      <option value="es" ${(payload?.i18n?.locale || 'es') === 'es' ? 'selected' : ''}>${t('ui.topbar.languageEs', {}, 'ES')}</option>
                      <option value="en" ${(payload?.i18n?.locale || 'es') === 'en' ? 'selected' : ''}>${t('ui.topbar.languageEn', {}, 'EN')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ` : `<p class="text-muted">${t('ui.settings.noProject', {}, 'No project loaded.')}</p>`}

          <!-- Estado del Repo -->
          ${runtime ? `
            <div class="panel">
              <div class="panel-header">
                <p class="panel-title">Repositorio</p>
                <span class="badge badge-${runtime.clean ? 'success' : 'warning'}">${runtime.clean ? 'Limpio' : 'Con cambios'}</span>
              </div>
              <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="info-row">
                  <p class="label-sm">Rama</p>
                  <p class="value">${esc(runtime.branch || '—')}</p>
                </div>
                <div class="info-row">
                  <p class="label-sm">Estado</p>
                  <p class="value">${runtime.staged}s ${runtime.unstaged}u ${runtime.untracked}?</p>
                </div>
                ${runtime.lastCommit ? `
                  <div class="info-row">
                    <p class="label-sm">Último commit</p>
                    <p class="value">${esc(runtime.lastCommit.shortHash)} · ${esc(runtime.lastCommit.subject)}</p>
                  </div>
                  <div class="info-row">
                    <p class="label-sm">Fecha commit</p>
                    <p class="value">${formatDate(runtime.lastCommit.date, 'date')}</p>
                  </div>
                ` : ''}
                <div class="info-row">
                  <p class="label-sm">Divergencia</p>
                  <p class="value">↑ ${runtime.ahead || 0} por delante · ↓ ${runtime.behind || 0} por detrás</p>
                </div>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Col derecha -->
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">

          <!-- Portfolio -->
          <div class="panel">
            <div class="panel-header">
              <p class="panel-title">Portfolio de Proyectos</p>
              <span class="badge badge-muted">${projects.length}</span>
            </div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
              ${projects.length === 0
                ? '<div class="empty-state">Sin proyectos registrados.</div>'
                : projects.map(p => `
                    <div class="project-row ${p.id === currentId ? 'is-active' : ''}">
                      <div class="project-row-info">
                        <p class="project-name">${esc(p.name)}</p>
                        <p class="project-path">${esc(p.root)}</p>
                      </div>
                      <div class="project-row-actions">
                        ${p.available
                          ? `<span class="badge badge-success">Disponible</span>`
                          : `<span class="badge badge-warning" title="No se puede cargar el control">No disponible</span>`}
                        ${p.id === currentId
                          ? `<span class="badge badge-accent">Activo</span>`
                          : p.available ? `<button class="btn btn-ghost btn-sm" type="button" data-switch="${esc(p.id)}">Abrir</button>` : ''
                        }
                      </div>
                    </div>
                  `).join('')
              }

              <!-- Registrar nuevo -->
              <div style="margin-top:var(--space-2)">
                <div class="field">
                  <label for="new-project-path">Registrar proyecto existente</label>
                  <input id="new-project-path" type="text" placeholder="/ruta/al/proyecto" />
                </div>
                <div class="form-actions" style="margin-top:var(--space-2)">
                  <button class="btn btn-ghost btn-sm" type="button" id="register-project-btn">
                    ${icon('plus', 14)} Registrar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Docs Drift -->
          <div class="panel">
            <div class="panel-header">
              <p class="panel-title">Documentación</p>
              <span class="badge badge-${docsDirty.length ? 'warning' : 'success'}">${docsDirty.length ? `${docsDirty.length} desfasados` : 'Sincronizados'}</span>
            </div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
              ${docsDirty.length > 0 ? `
                <p style="font-size:var(--text-sm);color:var(--text-secondary)">Los siguientes archivos de documentación están desactualizados:</p>
                <div class="stack stack-sm">
                  ${docsDirty.map(d => `
                    <div class="info-row"><p class="value">${esc(d)}</p></div>
                  `).join('')}
                </div>
              ` : `
                <p style="font-size:var(--text-sm);color:var(--success)">✓ Todos los archivos de documentación están sincronizados.</p>
              `}
              <button class="btn btn-ghost btn-sm" type="button" id="sync-docs-btn">
                ${icon('sync', 14)} Sincronizar ahora
              </button>
            </div>
          </div>

          <!-- Milestones -->
          ${control?.milestones?.length ? `
            <div class="panel">
              <div class="panel-header">
                <p class="panel-title">Milestones</p>
                <span class="badge badge-accent">${control.milestones.length}</span>
              </div>
              <div class="panel-body" style="display:flex;flex-direction:column;gap:var(--space-3)">
                ${control.milestones.map(m => `
                  <div class="finding-item" style="border-left-color:var(--accent)">
                    <p style="font-weight:700;font-size:var(--text-sm)">${esc(m.title)}</p>
                    <p style="font-size:var(--text-xs);color:var(--text-muted)">${esc(m.date)}</p>
                    <ul style="margin-top:var(--space-2);padding-left:1rem">
                      ${(m.items || []).map(item => `<li style="font-size:var(--text-xs);color:var(--text-secondary)">${esc(item)}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;
}

export function bindEvents() {
  // Switch project
  document.querySelectorAll('[data-switch]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.switch;
      state.update('currentProjectId', id);
      localStorage.setItem('ops-dashboard-project', id);
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    });
  });

  // Registrar proyecto
  document.getElementById('register-project-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('new-project-path');
    const root  = input?.value.trim();
    if (!root) { flash(t('ui.settings.enterPath', {}, 'Enter the project path.'), 'warning'); return; }
    try {
      await api.registerProject(root);
      flash('Proyecto registrado.', 'success');
      if (input) input.value = '';
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    } catch (err) {
      flash(err.message, 'error');
    }
  });

  // Sync docs
  document.getElementById('sync-docs-btn')?.addEventListener('click', async () => {
    try {
      await api.syncDocs();
      flash('Documentación sincronizada.', 'success');
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    } catch (err) {
      flash(err.message, 'error');
    }
  });

  document.getElementById('settings-locale-select')?.addEventListener('change', async e => {
    const select = e.target;
    const previousLocale = state.get('locale') || 'es';
    const nextLocale = select.value;

    if (nextLocale === previousLocale) return;

    select.disabled = true;
    try {
      const result = await api.updateProjectLocale(nextLocale);
      applyLocaleState(result.state);
      flash(t('ui.topbar.localeUpdated', {}, 'Language updated.'), 'success');
      window.dispatchEvent(new CustomEvent('ops:refresh'));
    } catch (err) {
      select.value = previousLocale;
      flash(err.message, 'error');
    } finally {
      select.disabled = false;
    }
  });
}

export { bindEvents as bind };

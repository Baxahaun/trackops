import * as api from '../api.js';
import * as flash from './flash.js';
import { t } from '../i18n.js';

export function init() {
  // Sin estado local init por ahora
}

export async function render() {
  return `
    <div class="view-enter">
      <header class="section-header">
        <div>
          <h2 class="section-title">${t('ui.skills.title', {}, 'Skill hub')}</h2>
          <p class="section-desc">${t('ui.skills.desc', {}, 'Manage your copilot skills and install new community workflows.')}</p>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" id="btn-refresh-skills">
            <svg viewBox="0 0 24 24" fill="none" class="icon" style="width:16px;height:16px"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${t('ui.skills.refresh', {}, 'Refresh')}
          </button>
        </div>
      </header>

      <div class="grid-split" style="grid-template-columns: 1fr 1fr; gap: var(--space-6);">
        
        <!-- Panel Izquierdo: Capacidades Locales -->
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">${t('ui.skills.installed', {}, 'Installed capabilities')}</h3>
          </div>
          <div id="skills-local-list" class="stack" style="gap: var(--space-4); max-height: calc(100vh - 200px); overflow-y: auto; padding: 2px;">
            <div class="card"><div class="card-body"><p class="text-sm color-muted">${t('ui.skills.loading', {}, 'Loading...')}</p></div></div>
          </div>
        </div>

        <!-- Panel Derecho: Discover (skills.sh) -->
        <div class="panel" style="border-color: var(--accent);">
          <div class="panel-header" style="justify-content: space-between;">
            <h3 class="panel-title" style="color: var(--accent);">✨ ${t('ui.skills.discover', {}, 'Discover')}</h3>
            <span class="badge badge-success">${t('ui.skills.recommended', {}, 'Recommended')}</span>
          </div>
          <div id="skills-discover-list" class="stack" style="gap: var(--space-4); max-height: calc(100vh - 200px); overflow-y: auto; padding: 2px;">
             <div class="card"><div class="card-body"><p class="text-sm color-muted">${t('ui.skills.connecting', {}, 'Connecting...')}</p></div></div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function bindEvents() {
  const btn = document.getElementById('btn-refresh-skills');
  if (btn) {
    btn.addEventListener('click', loadData);
  }
}

export async function loadData() {
  const localEl = document.getElementById('skills-local-list');
  const discoverEl = document.getElementById('skills-discover-list');
  
  if (!localEl || !discoverEl) return;

  localEl.innerHTML = `<p class="text-sm text-muted">${t('ui.skills.loadingLocal', {}, 'Loading local data...')}</p>`;
  discoverEl.innerHTML = `<p class="text-sm text-muted">${t('ui.skills.connectingRemote', {}, 'Connecting to skills.sh...')}</p>`;

  try {
    const [localRes, discoverRes] = await Promise.all([
      api.fetchSkillsLocal(),
      api.fetchSkillsDiscover()
    ]);

    // DOM Locales
    if (localRes.ok && localRes.skills) {
      if (localRes.skills.length === 0) {
        localEl.innerHTML = `
          <div class="empty-state">
             <div class="empty-icon">🧠</div>
             <p class="empty-title">Sin habilidades locales</p>
             <p class="empty-desc" style="font-size:var(--text-xs); color:var(--text-muted)">Tu agente no tiene skills especializadas. Instala alguna desde el panel derecho.</p>
          </div>
        `;
      } else {
        localEl.innerHTML = localRes.skills.map(s => `
          <div class="card">
            <div class="card-body">
               <div style="display: flex; gap: 12px; align-items: center;">
                 <div style="font-size: 24px;">⚙️</div>
                 <div>
                   <h4 style="font-size: var(--text-sm); font-weight: 600; margin-bottom: 4px;">${s.title}</h4>
                   <p style="font-size: var(--text-xs); color: var(--text-secondary);">${s.description || 'Sin descripción'}</p>
                   <code style="font-size: 10px; margin-top: 8px; display: inline-block; background: var(--surface-3); padding: 2px 4px; border-radius: 4px;">${s.path}</code>
                 </div>
               </div>
            </div>
          </div>
        `).join('');
      }
    }

    // DOM Discover
    if (discoverRes.ok && discoverRes.catalog) {
       // Filter out already installed
       const installedIds = (localRes.skills || []).map(s => s.id);
       const available = discoverRes.catalog.filter(c => !installedIds.includes(c.id));

       if (available.length === 0) {
         discoverEl.innerHTML = `
          <div class="empty-state">
             <div class="empty-icon">✨</div>
             <p class="empty-title" style="margin-bottom:var(--space-2)">Todo instalado</p>
             <p class="empty-desc" style="font-size:var(--text-xs); color:var(--text-muted)">Ya tienes instaladas todas las habilidades recomendadas.</p>
          </div>
         `;
       } else {
         discoverEl.innerHTML = available.map(s => `
          <div class="card" style="border: 1px dashed var(--border-accent);">
            <div class="card-body">
               <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                 <div style="flex:1;">
                   <h4 style="font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${s.title}</h4>
                   <p style="font-size: var(--text-xs); color: var(--text-secondary);">${s.description}</p>
                 </div>
                 <button class="btn btn-primary btn-sm btn-install-skill" data-id="${s.id}" style="padding: 4px 12px; font-size: 11px;">Instalar</button>
               </div>
            </div>
          </div>
        `).join('');

        // Bind events
        discoverEl.querySelectorAll('.btn-install-skill').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const originalText = e.target.textContent;
            e.target.textContent = 'Instalando...';
            e.target.disabled = true;

            const res = await api.installSkill(id).catch(err => {
              flash.show('error', err.message);
              return null;
            });
            
            if (res && res.ok) {
              flash.show('success', `Skill ${id} instalada correctamente en /.agents/skills`);
              loadData(); // recargar
            } else {
              e.target.textContent = originalText;
              e.target.disabled = false;
            }
          });
        });
       }
    }

  } catch (err) {
    console.error(err);
    flash.show('error', 'Error conectando con la API de Skills.');
    localEl.innerHTML = `<p class="color-danger text-sm">Error cargando.</p>`;
    discoverEl.innerHTML = `<p class="color-danger text-sm">Error conectando.</p>`;
  }
}

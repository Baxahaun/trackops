# TrackOps — Plan de Tareas (task_plan.md)

> AUTOGENERADO desde `project_control.json`. No editar manualmente.

## Estado Operativo
- Fase activa: A — Automatizar (5/5)
- Foco actual: Activar y gobernar proyectos locales asistidos por IA con un contrato operativo explícito, bilingüe y reanudable.
- Objetivo de entrega: Runtime npm de TrackOps con workspace split, dashboard local, onboarding dual y OPERA v3 compilado.
- Bloqueadores: Ninguno
- Proximo paso recomendado: Sin tareas abiertas

### Decisiones externas pendientes
- Ninguna

### Proximas tareas listas
- No hay tareas listas; revisar bloqueadores.

---

## Fase O — Orquestar
- Progreso: 5/9 tareas requeridas completadas
- Estado: Cerrada

- ✅ `opera-bootstrap` [P0] Completar bootstrap OPERA (O · Orquestar · Operations) — Preparar el handoff al agente para convertir una idea o especificacion parcial en contexto operativo estructurado.
- ✅ `fix-skills-api-404` [P0] Corregir 404 en endpoints de AI Skills (O · Orquestar · Bugfix) — Los endpoints /api/skills/local y /api/skills/discover figuraban como rotos, pero el smoke test confirma que responden 200.
- ✅ `fix-init-generated-npm-scripts` [P0] Corregir los scripts npm generados por trackops init (O · Orquestar · CLI) — Los scripts ops:* generados ya usan npx --yes trackops y quedan ejecutables tras init sin instalacion global previa.
- 🗑️ `split-workspace-contract` [P0] Definir el contrato del workspace dividido (O · Orquestar · Architecture) — Objetivo 1 · Hito H1 · Definir el contrato de .trackops-workspace.json, meta.workspace, reglas de descubrimiento y zonas de no-escritura.
- 🗑️ `split-workspace-migration-policy` [P0] Definir la politica de migracion legacy (O · Orquestar · Migration) — Objetivo 1 · Hito H1 · Definir como migran los proyectos legacy de raiz unica al layout dividido.
- 🗑️ `split-workspace-release-model` [P0] Formalizar el modelo develop -> master (O · Orquestar · Release) — Objetivo 1 · Hito H1 · Formalizar el modelo develop -> master con master aplanando solo el contenido de app/.
- ✅ `define-trackops-genesis` [P1] Completar genesis.md y dogfoodear la metodologia (O · Orquestar · Strategy) — La constitucion del proyecto ya recoge el objetivo, las integraciones, el payload y las invariantes base de TrackOps.
- ✅ `fix-skills-ui-null` [P1] Corregir TypeError innerHTML en skills.js (O · Orquestar · Bugfix) — El backlog mantenia un TypeError de innerHTML, pero la vista ya incluye guard clause para los nodos requeridos.
- 🗑️ `split-workspace-impact-audit` [P1] Auditar el impacto del workspace dividido (O · Orquestar · Operations) — Objetivo 1 · Hito H1 · Inventariar modulos, docs, templates, APIs y flujos afectados por la separacion.

---

## Fase P — Probar
- Progreso: 2/6 tareas requeridas completadas
- Estado: Cerrada

- ✅ `add-core-cli-dashboard-smoke-tests` [P0] Anadir smoke tests del core CLI y dashboard (P · Probar · Quality) — No existe suite automatizada para init, status, dashboard ni endpoints base.
- ✅ `opera-prove-integrations` [P0] Validar integraciones (P · Probar · Operations) — Verificar credenciales, conectividad y shape de respuestas antes de seguir construyendo.
- 🗑️ `split-workspace-resolution-tests` [P0] Disenar pruebas de resolucion de contexto (P · Probar · Quality) — Objetivo 2 · Hito H2 · Disenar pruebas para resolver contexto desde workspace/, app/, ops/ y modo legacy.
- 🗑️ `split-workspace-release-tests` [P0] Disenar pruebas del comando de publicacion (P · Probar · Quality) — Objetivo 2 · Hito H2 · Disenar pruebas del comando que publica master a partir de app/.
- 🗑️ `split-workspace-migration-tests` [P0] Disenar smoke tests de migracion (P · Probar · Quality) — Objetivo 2 · Hito H2 · Disenar smoke tests de migracion para proyectos existentes.
- 🗑️ `split-workspace-api-compat-tests` [P1] Definir pruebas de compatibilidad API/UI (P · Probar · Quality) — Objetivo 2 · Hito H2 · Definir el contrato esperado de server y dashboard para roots separados.

---

## Fase E — Estructurar
- Progreso: 2/8 tareas requeridas completadas
- Estado: Cerrada

- 🗑️ `split-workspace-migrate-command` [P0] Implementar el comando de migracion (E · Estructurar · Migration) — Objetivo 3 · Hito H3 · Implementar el comando que migra desde el layout legacy.
- 🗑️ `split-workspace-release-command` [P0] Implementar trackops release (E · Estructurar · Release) — Objetivo 3 · Hito H3 · Implementar trackops release para publicar master a partir de app/.
- 🗑️ `split-workspace-context-engine` [P0] Refactorizar el resolvedor de contexto (E · Estructurar · Core) — Objetivo 3 · Hito H3 · Reemplazar la nocion de root unico por un resolvedor de contexto de workspace.
- 🗑️ `split-workspace-opera-relocation` [P0] Reubicar OPERA dentro de ops/ (E · Estructurar · OPERA) — Objetivo 3 · Hito H3 · Reubicar instalacion, bootstrap, skills, hooks y docs de OPERA dentro de ops/.
- 🗑️ `split-workspace-init-layout` [P0] Separar el layout de trackops init (E · Estructurar · CLI) — Objetivo 3 · Hito H3 · Cambiar trackops init para crear app/ y ops/ sin tocar el package.json del producto.
- ✅ `opera-structure-system` [P1] Estructurar el sistema (E · Estructurar · Operations) — Documentar SOPs, implementar herramientas y capturar el grafo de dependencias.
- ✅ `unify-skills-directory-convention` [P1] Unificar la convención .agent/.agents para skills (E · Estructurar · Architecture) — La instalacion usa .agents/skills mientras el indice y algunas plantillas referencian .agent/skills/_registry.md.
- 🗑️ `split-workspace-server-registry` [P1] Adaptar server y registry al workspace (E · Estructurar · Platform) — Objetivo 3 · Hito H3 · Adaptar server, API y portfolio local al modelo de workspace.

---

## Fase R — Refinar
- Progreso: 3/6 tareas requeridas completadas
- Estado: Cerrada

- ✅ `align-dashboard-docs-with-runtime` [P1] Alinear la documentacion del dashboard con el runtime real (R · Refinar · Docs) — La guia documenta 3737 y 6 vistas, mientras el servidor usa 4173 y la app ya expone 7 vistas.
- ✅ `opera-refine-delivery` [P1] Refinar la entrega (R · Refinar · Operations) — Validar outputs contra templates y pulir el formato de entrega.
- ✅ `unify-opera-branding` [P1] Unificar la narrativa OPERA en todo el producto (R · Refinar · Product) — El producto tenia deriva narrativa y de metadata; OPERA debia quedar como modelo unico y vigente.
- 🗑️ `split-workspace-templates-guides` [P1] Actualizar plantillas y guias al layout separado (R · Refinar · Docs) — Objetivo 4 · Hito H4 · Actualizar plantillas, README, UserGUIDE y skills para reflejar el layout separado.
- 🗑️ `split-workspace-legacy-ux` [P1] Afinar la UX para proyectos legacy (R · Refinar · Product) — Objetivo 4 · Hito H4 · Afinar mensajes para proyectos legacy y evitar movimientos silenciosos.
- ✅ `publish-beta-positioning-and-bilingual-guides` [P2] Declarar el estado beta y alinear las guias bilingues (R · Refinar · Docs) — README, UserGUIDE y la web publica declaran el estado beta, incluyen descargo de responsabilidad y mantienen la lectura en espanol e ingles.
- 🗑️ `split-workspace-dashboard-copy` [P2] Ajustar el copy del dashboard (R · Refinar · UI) — Objetivo 4 · Hito H4 · Ajustar textos y vistas del dashboard al modelo de roots separados.

---

## Fase A — Automatizar
- Progreso: 1/4 tareas requeridas completadas
- Estado: Activa

- 🗑️ `split-workspace-regression-guards` [P0] Blindar regresiones del modelo dividido (A · Automatizar · Quality) — Objetivo 5 · Hito H5 · Ampliar la suite para impedir regresiones del modelo dividido.
- 🗑️ `split-workspace-dogfood-trackops` [P0] Dogfoodear la separacion en este repositorio (A · Automatizar · Operations) — Objetivo 5 · Hito H5 · Aplicar la separacion app/ + ops/ directamente a este repositorio en develop.
- 🗑️ `split-workspace-release-checks` [P1] Formalizar el circuito final de release (A · Automatizar · Release) — Objetivo 5 · Hito H5 · Formalizar el circuito final de release y validacion sobre el flujo nuevo.
- ✅ `opera-automate-runtime` [P2] Automatizar el runtime (A · Automatizar · Operations) — Configurar despliegue, triggers y validacion smoke.
- ✅ `formalize-release-hygiene` [P2] Formalizar la higiene de release y versionado (A · Automatizar · Release) — La version 1.0.0, el changelog y la narrativa pre-1.0 no estan alineados y falta una rutina minima de publicacion.
- ✅ `add-initial-funding-support` [P2] Integrar apoyo economico inicial con Ko-fi y GitHub (A · Automatizar · Community) — TrackOps expone una via discreta de donacion puntual en GitHub, npm, README y la landing publica.

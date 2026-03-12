# TrackOps — Plan de Tareas (task_plan.md)

> AUTOGENERADO desde `project_control.json`. No editar manualmente.

## Estado Operativo
- Fase activa: A — Automatizar (5/5)
- Foco actual: Producto beta alineado, documentado y con apoyo inicial habilitado
- Objetivo de entrega: TrackOps instalable, autoconsistente y dogfoodeado como motor operativo
- Bloqueadores: Ninguno
- Proximo paso recomendado: Sin tareas abiertas

### Decisiones externas pendientes
- Ninguna

### Proximas tareas listas
- No hay tareas listas; revisar bloqueadores.

---

## Fase O — Orquestar
- Progreso: 5/5 tareas requeridas completadas
- Estado: Cerrada

- ✅ `ops-bootstrap` [P0] Configurar proyecto con trackops (O · Orquestar · Operations) — Verificar estructura inicial, ajustar fases y confirmar integracion operativa.
- ✅ `fix-skills-api-404` [P0] Corregir 404 en endpoints de AI Skills (O · Orquestar · Bugfix) — Los endpoints /api/skills/local y /api/skills/discover figuraban como rotos, pero el smoke test confirma que responden 200.
- ✅ `fix-init-generated-npm-scripts` [P0] Corregir los scripts npm generados por trackops init (O · Orquestar · CLI) — Los scripts ops:* generados ya usan npx --yes trackops y quedan ejecutables tras init sin instalacion global previa.
- ✅ `define-trackops-genesis` [P1] Completar genesis.md y dogfoodear la metodologia (O · Orquestar · Strategy) — La constitucion del proyecto ya recoge el objetivo, las integraciones, el payload y las invariantes base de TrackOps.
- ✅ `fix-skills-ui-null` [P1] Corregir TypeError innerHTML en skills.js (O · Orquestar · Bugfix) — El backlog mantenia un TypeError de innerHTML, pero la vista ya incluye guard clause para los nodos requeridos.

---

## Fase P — Probar
- Progreso: 1/1 tareas requeridas completadas
- Estado: Cerrada

- ✅ `add-core-cli-dashboard-smoke-tests` [P0] Anadir smoke tests del core CLI y dashboard (P · Probar · Quality) — No existe suite automatizada para init, status, dashboard ni endpoints base.

---

## Fase E — Estructurar
- Progreso: 1/1 tareas requeridas completadas
- Estado: Cerrada

- ✅ `unify-skills-directory-convention` [P1] Unificar la convención .agent/.agents para skills (E · Estructurar · Architecture) — La instalacion usa .agents/skills mientras el indice y algunas plantillas referencian .agent/skills/_registry.md.

---

## Fase R — Refinar
- Progreso: 2/2 tareas requeridas completadas
- Estado: Cerrada

- ✅ `align-dashboard-docs-with-runtime` [P1] Alinear la documentacion del dashboard con el runtime real (R · Refinar · Docs) — La guia documenta 3737 y 6 vistas, mientras el servidor usa 4173 y la app ya expone 7 vistas.
- ✅ `unify-opera-etapa-branding` [P1] Unificar la narrativa OPERA/ETAPA en todo el producto (R · Refinar · Product) — El producto comunica OPERA casi en todo, pero package metadata y algunos aliases siguen usando ETAPA.
- ✅ `publish-beta-positioning-and-bilingual-guides` [P2] Declarar el estado beta y alinear las guias bilingues (R · Refinar · Docs) — README, UserGUIDE y la web publica declaran el estado beta, incluyen descargo de responsabilidad y mantienen la lectura en espanol e ingles.

---

## Fase A — Automatizar
- Progreso: 0/0 tareas requeridas completadas
- Estado: Activa

- ✅ `formalize-release-hygiene` [P2] Formalizar la higiene de release y versionado (A · Automatizar · Release) — La version 1.0.0, el changelog y la narrativa pre-1.0 no estan alineados y falta una rutina minima de publicacion.
- ✅ `add-initial-funding-support` [P2] Integrar apoyo economico inicial con Ko-fi y GitHub (A · Automatizar · Community) — TrackOps expone una via discreta de donacion puntual en GitHub, npm, README y la landing publica.

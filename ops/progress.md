# TrackOps — Diario de Progreso (progress.md)

> AUTOGENERADO desde `project_control.json`. No editar manualmente.

## Estado Actual
- Fase: Automatizar (5/5)
- Bloqueadores: Ninguno
- Ultimo test: ✅ 2026-03-13 — npm test cubre CLI, dashboard y el flujo skill global + activacion local sin romper la base existente.
- Proximo paso: Sin tareas abiertas
- Ultima actualizacion operativa: 2026-03-13

---

## Resumen de Ejecucion
- Total de tareas: 32
- Completadas: 12
- En progreso: 0
- En revision: 0
- Pendientes: 0
- Bloqueadas: 0

### Tareas activas
- No hay tareas en progreso en este momento.

### Tareas en revision
- No hay tareas en revision.

### Bloqueadores activos
- Sin bloqueadores activos.

### Actividad reciente
- [2026-03-13] `split-workspace-release-checks` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-dogfood-trackops` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-regression-guards` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-dashboard-copy` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-legacy-ux` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-templates-guides` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-server-registry` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.
- [2026-03-13] `split-workspace-init-layout` cancel — Cancelada por cambio estrategico: TrackOps prioriza la skill global instalable y la activacion local explicita; el refactor app/ops queda fuera de foco.

---

## Hitos Registrados

### [2026-03-12] — Analisis operativo y realineacion documental
- Verificado smoke test del dashboard y endpoints base.
- Detectado bug P0 en los scripts npm generados por trackops init.
- Reclasificado el backlog de skills como resuelto tras la validacion runtime.
- Actualizada la fuente de verdad operativa para reflejar el producto standalone.

### [2026-03-12] — Correccion de scripts npm post-init
- Los scripts generados por trackops init pasan a usar npx --yes trackops.
- Los scripts locales del repo pasan a ejecutar node bin/trackops.js.
- Validado npm run ops:status en el repo y en un proyecto temporal recien inicializado.

### [2026-03-12] — Cierre del backlog de alineacion tecnica
- Se añade npm test con prueba minima automatizada del nucleo y del panel.
- Se fija .agents/skills/_registry.md como ruta canonica para habilidades.
- OPERA queda como narrativa oficial y ETAPA como alias heredado documentado.
- La documentacion del panel se alinea con el puerto 4173 y las 7 vistas reales.
- Se define npm run release:check y la guia basica de versionado.

### [2026-03-12] — Cierre de sesion publica y apoyo inicial
- README y UserGUIDE quedan alineados con estado beta y descargo de responsabilidad bilingue.
- La landing publica conserva su estilo y suma selector de idioma con copy actualizado.
- Se integra apoyo economico inicial con Ko-fi en GitHub, npm, README y footer publico.
- El bloque de apoyo se recoloca en el lado derecho del pie con mas presencia visual pero sin invadir la experiencia.

### [2026-03-13] — Pivot a skill global y activacion local
- TrackOps se consolida como skill global canónica en skills/trackops para distribuirse desde skills.sh.
- El bootstrap de primer uso instala o actualiza el runtime npm y registra el estado en ~/.trackops/runtime.json.
- El runtime vuelve a separar la instalacion global de la activacion local mediante trackops init y trackops opera install.
- El backlog del refactor split-workspace se archiva para que la fuente de verdad solo proponga trabajo alineado con la estrategia actual.

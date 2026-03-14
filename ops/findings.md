# TrackOps — Biblioteca de Hallazgos (findings.md)

> AUTOGENERADO desde `project_control.json`. No editar manualmente.

## Hallazgos Abiertos

No hay hallazgos abiertos.

---

## Hallazgos Resueltos

### [HIGH] trackops init ya deja scripts npm ejecutables en proyectos nuevos
- Estado: resuelto
- Detalle: Los scripts ops:* generados usan npx --yes trackops y el propio repo ejecuta node bin/trackops.js para desarrollo local.
- Impacto: Se recupera la experiencia post-init y npm run ops:* funciona sin instalacion global previa.

### [HIGH] La fuente de verdad operativa ya refleja el estado real del producto
- Estado: resuelto
- Detalle: project_control.json, task_plan.md, progress.md y findings.md quedaron realineados con el backlog y las validaciones reales.
- Impacto: TrackOps vuelve a orquestarse con un estado operativo coherente con el codigo y las pruebas realizadas.

### [MEDIUM] El backlog split-workspace queda archivado por cambio estrategico
- Estado: resuelto
- Detalle: Las 20 tareas del refactor app/ops se cancelan como iniciativa fuera de foco tras consolidar TrackOps como skill global con activacion local por proyecto.
- Impacto: trackops next deja de proponer trabajo obsoleto y la fuente de verdad vuelve a reflejar la estrategia real del producto.

### [MEDIUM] genesis.md ya define la constitucion base del proyecto
- Estado: resuelto
- Detalle: La constitucion ahora recoge el objetivo, integraciones, payload, invariantes y pipeline de TrackOps.
- Impacto: Se recupera la coherencia minima de self-dogfooding y la fuente de verdad deja de estar vacia.

### [MEDIUM] La narrativa operativa y publica converge ya en OPERA v3
- Estado: resuelto
- Detalle: La metadata del paquete, la ayuda y la documentacion usan ya un modelo unico de OPERA v3 sin referencias activas al legado.
- Impacto: La identidad del producto queda coherente y se elimina la ambiguedad metodologica.

### [MEDIUM] La ruta de habilidades queda unificada en .agents/skills
- Estado: resuelto
- Detalle: El runtime, las plantillas, la guia y el propio repositorio usan ahora .agents/skills/_registry.md como indice canonico.
- Impacto: Se simplifica la evolucion del sistema de habilidades y desaparece la duplicidad de rutas.

### [MEDIUM] La documentacion del dashboard ya refleja el funcionamiento real
- Estado: resuelto
- Detalle: La guia, la web de presentacion y el changelog ya describen el puerto 4173 y las 7 vistas reales del panel.
- Impacto: Se recupera la confianza en la documentacion visible del producto.

### [MEDIUM] El core ya cuenta con una prueba minima automatizada y una comprobacion previa a publicar
- Estado: resuelto
- Detalle: npm test cubre init, estado, siguiente tarea, sync y panel; npm run release:check valida prueba de humo y empaquetado.
- Impacto: Se reduce el riesgo de regresiones y queda una rutina clara antes de publicar.

### [LOW] La posicion publica del producto ya declara su estado beta en ambos idiomas
- Estado: resuelto
- Detalle: README, UserGUIDE, landing publica y panel local presentan el estado beta y el descargo de responsabilidad con copy coherente.
- Impacto: La comunicacion externa queda alineada con la madurez real del producto y reduce expectativas incorrectas.

### [LOW] TrackOps ya ofrece una via simple de apoyo economico
- Estado: resuelto
- Detalle: Se integra Ko-fi como canal principal de donacion puntual en GitHub, npm, README y landing publica.
- Impacto: El proyecto gana una salida de sostenibilidad sin introducir backend ni complejidad operativa adicional.

### [LOW] Los endpoints base de skills responden correctamente en runtime
- Estado: resuelto
- Detalle: El smoke test del dashboard confirma 200 en /api/skills/local y /api/skills/discover.
- Impacto: Se puede retirar el backlog fantasma asociado a 404 en AI Skills.

### [LOW] La vista de skills ya protege contra nodos nulos
- Estado: resuelto
- Detalle: loadData aborta de forma segura si faltan los contenedores del DOM antes de tocar innerHTML.
- Impacto: El bug reportado de TypeError deja de ser trabajo pendiente actual.

### [MEDIUM] Las integraciones del runtime quedaron auditadas con evidencia explicita
- Estado: resuelto
- Detalle: El repo ya tiene audit de entorno, endpoints y shapes en ops/reviews/integration-audit.md y smoke tests pasando.
- Impacto: Se reduce el riesgo de seguir construyendo sobre integraciones no verificadas.

### [LOW] OPERA ya siembra SOPs, grafo y auditorias operativas gestionadas
- Estado: resuelto
- Detalle: installStructure crea ahora arquitectura base y revisiones en ops/architecture y ops/reviews para cualquier proyecto gestionado.
- Impacto: La estructura operativa deja de depender de memoria implicita o trabajo manual repetitivo.

### [LOW] El runtime ya tiene validacion automatizada y triggers declarados
- Estado: resuelto
- Detalle: Se anaden workflows de GitHub Actions y la suite release:check cubre humo, skill y empaquetado antes de publicar.
- Impacto: La regresion del runtime y del paquete queda mejor blindada.

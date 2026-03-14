# Changelog

Todos los cambios notables de este proyecto seran documentados en este archivo.
El formato esta basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y el proyecto mantiene versionado pragmatico mientras se consolida la politica formal de releases.

## 2026-03-13

- 📚 **docs(site)**: se reescribe el copy de la documentacion publica y tecnica para alinearlo con el estado real de TrackOps como skill global + activacion local por proyecto. La landing simplifica el hero, prioriza una sola terminal animada para la instalacion global, mueve la accion de compartir a la navbar, incorpora un carrusel continuo de plataformas soportadas y actualiza el relato visual para el layout split `app/` + `ops/`, `.env` y OPERA opcional (`48fa071`).
- ✨ **feat(workspace)**: se migra TrackOps al layout split `app/` + `ops/` y se incorpora gestion explicita de `/.env`, `/.env.example`, el puente `app/.env`, el manifest `.trackops-workspace.json`, los comandos `workspace`, `env` y `release`, y la reubicacion completa del runtime, OPERA, dashboard, skills y documentacion para operar sin mezclar la capa operativa con el producto real (`c019094`).
- ✨ **feat(skills)**: se redefine TrackOps como skill global canónica instalable desde `skills.sh`, separando la capacidad global del agente de la activación local por proyecto. Se agrega `skills/trackops` con bootstrap de primer uso para asegurar el runtime npm, se retira del camino público el modelo de adapters por vendor dentro del repo, y se alinean CLI, documentación, validaciones de release y smoke tests con el flujo `trackops init` + `trackops opera install` (`3095e2c`).
- 🐛 **fix(branding)**: se corrige y unifica el favicon de TrackOps entre la web publica y el panel local. La landing pasa a declarar su favicon oficial, el panel deja de depender de una ruta absoluta fragil y se incorpora un activo limpio para pestanas de navegador en `docs/assets/favicon.svg` (`161f973`).

## 2026-03-14

- 📦 **build(release)**: se prepara la publicacion `1.1.0` sincronizando la version del paquete `trackops` y la metadata de la skill global para que npm y `skills.sh` apunten al mismo release (`pending`).
- 📚 **docs(skills)**: se corrige la integracion publica con `skills.sh` para usar el comando canonico `npx skills add Baxahaun/trackops`, se actualizan la landing, README, guias y referencias de la skill, y se documenta que la aparicion en busqueda depende de la telemetria anonima de instalaciones reales (`pending`).

## 2026-03-12

- ✨ **feat(product)**: se blinda el repositorio para que solo versione archivos propios del paquete `trackops`, dejando fuera los artefactos generados por su uso y por `OPERA`. Tambien se refina el soporte al proyecto con `USDC` en `Polygon`, se anade QR en la landing publica y se prepara la siguiente publicacion en npm con la version `1.0.1` (`38bed64`).
- ✨ **feat(product)**: se consolida la beta publica de TrackOps con documentacion operativa sincronizada, guias bilingues, estado beta y descargo visibles, prueba minima automatizada, y apoyo economico inicial en Ko-fi, GitHub, npm y la landing publica.
- 🧭 **docs(ops)**: realineado el seguimiento operativo del proyecto con el estado real de TrackOps como producto standalone. Se actualizan `project_control.json`, `task_plan.md`, `progress.md`, `findings.md` y `genesis.md` para reflejar el backlog vigente, los hallazgos abiertos y la nueva linea base de ejecucion.
- 🛠️ **fix(init)**: los scripts `ops:*` generados por `trackops init` pasan a usar `npx --yes trackops`, mientras este repo usa `node bin/trackops.js` para desarrollo local. Con esto `npm run ops:status` vuelve a funcionar tanto en el paquete como en proyectos recien inicializados.

## 2026-03-11

- ✨ **feat(dashboard)**: rediseno y refactorizacion completa del UI local. Implementacion de 7 vistas independientes con soporte Vanilla JS/CSS puro, un sistema de Theming nativo, Onboarding interactivo (Tour con resalte de elementos), e integracion nativa y de On-Click con el ecosistema de IA comunitaria skills.sh para expandir las capacidades agenticas del controlador (`2c9fb67`).

## [2026-03-14]

- 📦 **(release)** prepara version 2.0.0 (`e52e8db`)
- ✨ **(opera)** implanta opera v3 (`6c983a6`)

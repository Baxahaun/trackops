<p align="center">
  <img src="docs/assets/logo.svg" alt="TrackOps Logo" width="96" height="96" />
</p>

<h1 align="center">TrackOps</h1>

<p align="center">
  <strong>Local orchestration and operational automation for AI-agent projects.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/trackops"><img src="https://img.shields.io/npm/v/trackops?color=D97706&style=flat-square" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-333?style=flat-square" alt="Node 18+" />
</p>

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://baxahaun.github.io/trackops/">Web</a>
</p>

---

## Español

TrackOps es un sistema local de orquestación y automatización operativa de proyectos y desarrollo con agentes IA.

Prepara a tus agentes, ordena el trabajo del proyecto y mantiene separadas la aplicación real y la capa operativa, sin depender de una nube externa.

### Modelo actual

TrackOps funciona con dos capas:

1. `skill global`
   se instala una vez en tu agente o CLI
2. `activación local por proyecto`
   se ejecuta cuando quieres gestionar un repo concreto

El flujo oficial es este:

1. instala la skill global
2. deja que la skill asegure el runtime en primer uso
3. activa TrackOps en un repo con `trackops init`
4. añade OPERA solo si lo necesitas con `trackops opera install`

### Instalación global

TrackOps se distribuye como skill global desde el ecosistema `skills`.

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Targets soportados en la skill:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

La skill global:

- hace disponible TrackOps para tu agente
- asegura el runtime npm en primer uso
- no modifica repos por sí sola

### Bootstrap del runtime

En el primer uso real, la skill ejecuta su bootstrap:

```bash
node scripts/bootstrap-trackops.js
```

Ese bootstrap:

- valida `Node.js >= 18`
- valida `npm`
- instala o actualiza `trackops`
- verifica el comando
- registra el estado en `~/.trackops/runtime.json`

Contrato de la skill: [skills/trackops/skill.json](./skills/trackops/skill.json)

### Activación local por proyecto

Cuando quieres gestionar un repo:

```bash
trackops init
trackops opera install
```

Semántica oficial:

- `trackops init`
  crea por defecto un workspace split con `app/`, `ops/`, `/.env`, `/.env.example` y `.trackops-workspace.json`
- `trackops opera install`
  añade OPERA sobre un proyecto ya inicializado y escribe solo en `ops/`
- `trackops init --with-opera`
  existe como atajo explícito
- `trackops init --legacy-layout`
  existe solo por compatibilidad

### Workspace split

TrackOps separa tu producto real en `app/` y la operación en `ops/`, para que no se mezclen.

```text
mi-proyecto/
├── .trackops-workspace.json
├── .env
├── .env.example
├── app/
│   ├── .env
│   └── ...producto real...
└── ops/
    ├── project_control.json
    ├── task_plan.md
    ├── progress.md
    ├── findings.md
    ├── genesis.md
    ├── .agent/hub/
    ├── .agents/skills/
    ├── .githooks/
    └── .tmp/
```

Fuente de verdad operativa:

- split layout: `ops/project_control.json`
- legacy layout: `project_control.json`

### Entorno y secretos

TrackOps gestiona un contrato explícito de entorno:

- `/.env`
  archivo real de secretos del workspace
- `/.env.example`
  contrato público de variables
- `app/.env`
  puente de compatibilidad para herramientas del producto

Comandos principales:

```bash
trackops env status
trackops env sync
```

### Trabajo diario

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

Reglas operativas:

- usa `trackops status` para leer foco, fase y bloqueadores
- usa `trackops next` para identificar la siguiente tarea lista
- usa `trackops sync` para regenerar docs operativos
- no edites a mano `task_plan.md`, `progress.md` ni `findings.md`

El dashboard es local, encuentra un puerto libre si el preferido está ocupado y puede copiar la URL al portapapeles.

### CLI principal

#### Core

| Comando | Descripción |
|---|---|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."] [--no-bootstrap] [--legacy-layout]` | Inicializa TrackOps en el repo actual |
| `trackops status` | Muestra el estado operativo actual |
| `trackops next` | Muestra las siguientes tareas listas |
| `trackops sync` | Regenera la documentación operativa |
| `trackops workspace status` | Muestra layout, roots y configuración del workspace |
| `trackops workspace migrate` | Migra un proyecto legacy al layout `app/` + `ops/` |
| `trackops env status` | Audita claves requeridas, presentes y faltantes sin mostrar valores |
| `trackops env sync` | Crea o regenera `/.env`, `/.env.example` y el puente `app/.env` |
| `trackops release [--push]` | Publica la rama configurada a partir de `app/` |
| `trackops dashboard [--port N] [--host HOST] [--public] [--strict-port]` | Lanza el dashboard local |
| `trackops version` | Imprime la versión instalada |

#### OPERA

| Comando | Descripción |
|---|---|
| `trackops opera install [--locale es\|en] [--non-interactive] [--no-bootstrap]` | Instala OPERA en el proyecto actual |
| `trackops opera bootstrap [--locale es\|en] [--non-interactive]` | Reanuda el bootstrap OPERA |
| `trackops opera status` | Muestra el estado de instalación y bootstrap |
| `trackops opera configure [--phases '...'] [--locale es\|en]` | Reconfigura fases o idioma |
| `trackops opera upgrade` | Actualiza los templates OPERA a la versión del paquete |

#### Skills del proyecto

`trackops skill ...` gestiona skills nativas del proyecto. En split layout viven en `ops/.agents/skills/`.

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

### Vía alternativa sin skill global

Si no quieres usar la distribución por skill:

```bash
npx trackops init
npx trackops dashboard
```

O instala el paquete globalmente con npm:

```bash
npm install -g trackops
trackops init
trackops opera install
```

### Publicación y validación

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

En proyectos split, `trackops release` publica solo el contenido de `app/` hacia la rama configurada e incluye `.env.example`. No publica `/.env`, `ops/` ni `.trackops-workspace.json`.

Guía ampliada: [UserGUIDE.md](./UserGUIDE.md)

---

## English

TrackOps is a local orchestration and operational automation system for projects and AI-agent development.

It prepares your agents, organizes project execution, and keeps the real app separate from the operational layer, without depending on an external cloud.

### Current model

TrackOps works in two layers:

1. `global skill`
   installed once in your agent or CLI
2. `local per-project activation`
   run only when you want to manage a specific repository

Official flow:

1. install the global skill
2. let the skill ensure the runtime on first use
3. activate TrackOps in a repo with `trackops init`
4. add OPERA only when needed with `trackops opera install`

### Global install

TrackOps is distributed as a global skill through the `skills` ecosystem.

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Supported skill targets:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

The global skill:

- makes TrackOps available to your agent
- ensures the npm runtime on first use
- does not mutate repositories by itself

### Runtime bootstrap

On first real use, the skill runs:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap:

- validates `Node.js >= 18`
- validates `npm`
- installs or updates `trackops`
- verifies the command
- records state in `~/.trackops/runtime.json`

Skill contract: [skills/trackops/skill.json](./skills/trackops/skill.json)

### Local per-project activation

When you want to manage a repository:

```bash
trackops init
trackops opera install
```

Official semantics:

- `trackops init`
  creates a split workspace by default with `app/`, `ops/`, `/.env`, `/.env.example`, and `.trackops-workspace.json`
- `trackops opera install`
  adds OPERA to an initialized project and writes only inside `ops/`
- `trackops init --with-opera`
  exists as an explicit shortcut
- `trackops init --legacy-layout`
  exists only for compatibility

### Split workspace

TrackOps separates your real product into `app/` and operations into `ops/`, so they do not get mixed.

```text
my-project/
├── .trackops-workspace.json
├── .env
├── .env.example
├── app/
│   ├── .env
│   └── ...real product...
└── ops/
    ├── project_control.json
    ├── task_plan.md
    ├── progress.md
    ├── findings.md
    ├── genesis.md
    ├── .agent/hub/
    ├── .agents/skills/
    ├── .githooks/
    └── .tmp/
```

Operational source of truth:

- split layout: `ops/project_control.json`
- legacy layout: `project_control.json`

### Environment and secrets

TrackOps manages an explicit environment contract:

- `/.env`
  real secrets file for the workspace
- `/.env.example`
  public variable contract
- `app/.env`
  compatibility bridge for product tooling

Main commands:

```bash
trackops env status
trackops env sync
```

### Daily workflow

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

Operating rules:

- use `trackops status` to inspect focus, phase, and blockers
- use `trackops next` to find the next ready task
- use `trackops sync` to regenerate operational docs
- do not hand-edit `task_plan.md`, `progress.md`, or `findings.md`

The dashboard is local, finds a free port if the preferred one is busy, and can copy the URL to the clipboard.

### Main CLI

#### Core

| Command | Description |
|---|---|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."] [--no-bootstrap] [--legacy-layout]` | Initialize TrackOps in the current repo |
| `trackops status` | Show the current operational state |
| `trackops next` | Show the next ready tasks |
| `trackops sync` | Regenerate operational docs |
| `trackops workspace status` | Show workspace layout, roots, and publish configuration |
| `trackops workspace migrate` | Migrate a legacy project to the `app/` + `ops/` layout |
| `trackops env status` | Audit required, present, and missing keys without showing values |
| `trackops env sync` | Create or regenerate `/.env`, `/.env.example`, and the `app/.env` bridge |
| `trackops release [--push]` | Publish the configured branch from `app/` |
| `trackops dashboard [--port N] [--host HOST] [--public] [--strict-port]` | Launch the local dashboard |
| `trackops version` | Print the installed version |

#### OPERA

| Command | Description |
|---|---|
| `trackops opera install [--locale es\|en] [--non-interactive] [--no-bootstrap]` | Install OPERA in the current project |
| `trackops opera bootstrap [--locale es\|en] [--non-interactive]` | Resume the OPERA bootstrap |
| `trackops opera status` | Show install and bootstrap state |
| `trackops opera configure [--phases '...'] [--locale es\|en]` | Reconfigure phases or locale |
| `trackops opera upgrade` | Update OPERA templates to the package version |

#### Project skills

`trackops skill ...` manages project-native skills. In split layout they live under `ops/.agents/skills/`.

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

### Alternative path without the global skill

If you do not want to use the skill distribution path:

```bash
npx trackops init
npx trackops dashboard
```

Or install the package globally with npm:

```bash
npm install -g trackops
trackops init
trackops opera install
```

### Publish and validate

Before publishing:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

In split projects, `trackops release` publishes only the contents of `app/` to the configured branch and includes `.env.example`. It never publishes `/.env`, `ops/`, or `.trackops-workspace.json`.

Extended guide: [UserGUIDE.md](./UserGUIDE.md)

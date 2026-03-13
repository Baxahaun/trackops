<p align="center">
  <img src="docs/assets/logo.svg" alt="TrackOps Logo" width="96" height="96" />
</p>

<h1 align="center">TrackOps</h1>

<p align="center">
  <strong>Operational control for AI-assisted software projects.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/trackops"><img src="https://img.shields.io/npm/v/trackops?color=D97706&style=flat-square" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-333?style=flat-square" alt="Node 18+" />
</p>

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://baxahaun.github.io/trackops">Web</a>
</p>

---

## Español

TrackOps ya no se plantea como una colección de adapters por vendor dentro de cada repo. El modelo oficial ahora tiene dos capas separadas:

- `capa global`: una skill canónica instalable desde `skills.sh`
- `capa local`: activación explícita por proyecto con `trackops init` y `trackops opera install`

### Qué instala cada capa

- Skill global:
  hace disponible TrackOps para tu agente o CLI en la máquina.
- Runtime npm:
  se asegura en el primer uso real de la skill global.
- Proyecto local:
  solo se toca cuando ejecutas `trackops init` o `trackops opera install` dentro de ese repo.

Eso permite un flujo coherente para `Codex`, `Claude Code`, `Cursor` y cualquier plataforma que consuma la skill global desde `skills.sh`, sin llenar repositorios arbitrarios de archivos operativos.

### Instalación global con `skills.sh`

El repositorio ya incluye la skill canónica en [skills/trackops](./skills/trackops).

Comando base de instalación con `skills`:

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Sustituye `codex` por el target que necesites. El instalador expone actualmente estos agentes:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

La skill global es agnóstica de plataforma. Su trabajo es:

1. detectar cuándo debes usar TrackOps
2. asegurar el runtime npm en el primer uso
3. recordarte que la activación local del repo es explícita

### Primer uso de la skill

En el primer uso real, la skill ejecuta su bootstrap:

```bash
node scripts/bootstrap-trackops.js
```

Ese script:

- valida `Node.js >= 18`
- valida que `npm` exista
- instala o actualiza `trackops@<version del release>`
- verifica el runtime
- registra el estado en `~/.trackops/runtime.json`

La fuente de verdad de esa skill es [skills/trackops/skill.json](./skills/trackops/skill.json).

`skills` instala siempre desde el estado confirmado en Git. Si cambias la skill en este repo local, necesitas commit y push antes de esperar que el comando remoto recoja esos cambios.

### Activación local por proyecto

Una vez que la skill global dejó el runtime listo, cada repo se activa por separado:

```bash
trackops init
trackops opera install
```

Semántica oficial:

- `trackops init`
  crea por defecto un workspace dividido con `app/`, `ops/`, `.trackops-workspace.json`, `/.env` y `/.env.example`.
- `trackops opera install`
  instala solo el framework OPERA sobre un proyecto ya inicializado y escribe solo dentro de `ops/`.
- `trackops init --with-opera`
  sigue existiendo como atajo explícito.
- `trackops init --legacy-layout`
  mantiene el layout antiguo de raíz única cuando hace falta compatibilidad.

La instalación global no crea archivos del proyecto por sí sola. La activación local sí, pero en split layout la capa operativa queda separada del producto real.

### Uso rápido sin marketplace

Si no quieres pasar por `skills.sh`, el runtime npm sigue funcionando igual:

```bash
npx trackops init
npx trackops dashboard
```

También puedes instalar el paquete de forma global con npm y usar la misma activación local:

```bash
npm install -g trackops
trackops init
trackops opera install
```

### Flujo diario

```bash
trackops status
trackops next
trackops sync
trackops env status
```

Reglas operativas:

- en split layout, la fuente de verdad es `ops/project_control.json`
- en legacy layout, sigue siendo `project_control.json`
- `/.env` es el archivo real de secretos del workspace
- `/.env.example` es el contrato público de variables
- `task_plan.md`, `progress.md` y `findings.md` se regeneran con `trackops sync`

### Dashboard local

```bash
trackops dashboard
```

El dashboard:

- arranca desde `4173`
- salta automáticamente al siguiente puerto libre si hace falta
- admite `--port`, `--host`, `--public` y `--strict-port`
- copia la URL local al portapapeles cuando puede
- muestra URL de red cuando se expone fuera de localhost

### Comandos principales

#### Core

| Comando | Descripción |
|---|---|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."] [--no-bootstrap] [--legacy-layout]` | Inicializa TrackOps en el repo actual |
| `trackops status` | Estado operativo actual |
| `trackops next` | Próximas tareas listas |
| `trackops sync` | Regenera docs operativos |
| `trackops workspace status` | Muestra layout, roots y configuración del workspace |
| `trackops workspace migrate` | Migra un proyecto legacy al layout `app/` + `ops/` |
| `trackops env status` | Audita claves requeridas/presentes/faltantes sin exponer valores |
| `trackops env sync` | Crea o regenera `/.env`, `/.env.example` y el puente `app/.env` |
| `trackops release [--push]` | Publica la rama configurada a partir de `app/` |
| `trackops dashboard [--port N] [--host HOST] [--public] [--strict-port]` | Lanza el dashboard local |
| `trackops version` | Imprime la versión instalada |

#### OPERA

| Comando | Descripción |
|---|---|
| `trackops opera install [--locale es\|en] [--non-interactive] [--no-bootstrap]` | Instala OPERA en el proyecto actual |
| `trackops opera bootstrap [--locale es\|en] [--non-interactive]` | Reanuda el bootstrap OPERA |
| `trackops opera status` | Estado de instalación y bootstrap |
| `trackops opera configure [--phases '...'] [--locale es\|en]` | Reconfigura fases o idioma |
| `trackops opera upgrade` | Actualiza templates OPERA a la versión del paquete |

#### Skills del proyecto

`trackops skill ...` sigue existiendo, pero ahora significa una sola cosa: skills nativas del proyecto. En split layout se instalan dentro de `ops/.agents/skills/`.

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

No hay ya una familia pública `trackops agent ...` para gestionar vendors dentro del repo.

### Estructura local del proyecto

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

### Release y validación

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

En proyectos split, `trackops release` publica solo el contenido de `app/` hacia la rama configurada y añade `.env.example`; nunca publica `/.env`, `ops/` ni `.trackops-workspace.json`.

Guía ampliada: [UserGUIDE.md](./UserGUIDE.md)

---

## English

TrackOps is no longer modeled as a set of per-vendor adapters installed inside each repository. The official model now has two explicit layers:

- `global layer`: one canonical skill distributed through `skills.sh`
- `local layer`: explicit project activation with `trackops init` and `trackops opera install`

### What each layer installs

- Global skill:
  makes TrackOps available to the agent or CLI on the machine.
- npm runtime:
  is ensured on first real use of the global skill.
- Local project:
  is touched only when you run `trackops init` or `trackops opera install` inside that repository.

That gives `Codex`, `Claude Code`, `Cursor`, and other compatible platforms a coherent install path without polluting arbitrary repositories with operational files.

### Global install through `skills.sh`

The canonical marketplace skill now lives in [skills/trackops](./skills/trackops).

Base install command with `skills`:

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Replace `codex` with the target you need. The installer currently exposes these agents:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

The global skill is platform-agnostic. Its job is to:

1. detect when TrackOps should be used
2. ensure the npm runtime on first use
3. keep local repository activation explicit

### First use of the skill

On first real use, the skill runs:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap script:

- validates `Node.js >= 18`
- validates that `npm` exists
- installs or updates `trackops@<release version>`
- verifies the runtime
- records the verified runtime in `~/.trackops/runtime.json`

The pinned contract for that behavior lives in [skills/trackops/skill.json](./skills/trackops/skill.json).

`skills` always installs from committed Git state. If you change the skill in this local repo, commit and push before expecting the remote install command to pick up those changes.

### Local per-project activation

Once the global skill has ensured the runtime, activate each repository explicitly:

```bash
trackops init
trackops opera install
```

Official semantics:

- `trackops init`
  creates a split workspace by default with `app/`, `ops/`, `.trackops-workspace.json`, `/.env`, and `/.env.example`.
- `trackops opera install`
  installs only the OPERA framework on top of an initialized project and writes only inside `ops/`.
- `trackops init --with-opera`
  remains as an explicit convenience shortcut.
- `trackops init --legacy-layout`
  keeps the old single-root layout when compatibility is explicitly required.

The global install does not create project files on its own. Local activation does, but in split layout the operational layer stays isolated from the real product code.

### Quick usage without the marketplace

If you do not want to go through `skills.sh`, the npm runtime still works directly:

```bash
npx trackops init
npx trackops dashboard
```

You can also install the package globally with npm and keep the same local activation model:

```bash
npm install -g trackops
trackops init
trackops opera install
```

### Daily workflow

```bash
trackops status
trackops next
trackops sync
trackops env status
```

Operating rules:

- in split layout, the source of truth is `ops/project_control.json`
- in legacy layout, it remains `project_control.json`
- `/.env` is the real workspace secrets file
- `/.env.example` is the public environment contract
- `task_plan.md`, `progress.md`, and `findings.md` are regenerated with `trackops sync`

### Local dashboard

```bash
trackops dashboard
```

The dashboard:

- starts from `4173`
- automatically falls forward to the next free port when needed
- supports `--port`, `--host`, `--public`, and `--strict-port`
- copies the local URL to the clipboard when possible
- shows a network URL when exposed outside localhost

### Main commands

#### Core

| Command | Description |
|---|---|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."] [--no-bootstrap] [--legacy-layout]` | Initialize TrackOps in the current repo |
| `trackops status` | Show the current operational state |
| `trackops next` | Show the next ready tasks |
| `trackops sync` | Regenerate operational docs |
| `trackops workspace status` | Show workspace layout, roots, and publish configuration |
| `trackops workspace migrate` | Migrate a legacy project to the `app/` + `ops/` layout |
| `trackops env status` | Audit required/present/missing keys without exposing values |
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

`trackops skill ...` still exists, but now it means one thing only: project-native skills. In split layout they live under `ops/.agents/skills/`.

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

There is no longer a public `trackops agent ...` surface for vendor management inside the repo.

### Local project structure

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

### Release and validation

Before publishing:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

In split projects, `trackops release` publishes only the contents of `app/` to the configured branch and includes `.env.example`; it never publishes `/.env`, `ops/`, or `.trackops-workspace.json`.

Extended guide: [UserGUIDE.md](./UserGUIDE.md)

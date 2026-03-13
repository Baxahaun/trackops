# TrackOps User Guide

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>
</p>

---

## Español

### 1. Qué es TrackOps hoy

TrackOps es un sistema local de orquestación y automatización operativa de proyectos y desarrollo con agentes IA.

Su trabajo es simple:

- preparar la capacidad global del agente
- activar control operativo en cada repo cuando tú lo decides
- mantener separadas la app real y la capa operativa

### 2. Instalar la skill global

La distribución principal de TrackOps es una skill global:

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Targets soportados:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

La skill global prepara la máquina. No crea archivos dentro de repos por sí sola.

### 3. Primer uso: bootstrap del runtime

En el primer uso real, la skill asegura el runtime npm:

```bash
node scripts/bootstrap-trackops.js
```

Ese paso:

- valida `Node.js >= 18`
- valida `npm`
- instala o actualiza `trackops`
- verifica el comando
- registra el estado en `~/.trackops/runtime.json`

### 4. Activación local por proyecto

Cuando quieres gestionar un repo:

```bash
trackops init
trackops opera install
```

Interpretación oficial:

- `trackops init`
  activa el orquestador local
- `trackops opera install`
  añade el framework OPERA de forma opcional
- `trackops init --with-opera`
  existe como atajo
- `trackops init --legacy-layout`
  existe solo por compatibilidad

### 5. Qué crea `trackops init`

Por defecto, TrackOps crea un workspace split:

```text
.trackops-workspace.json
.env
.env.example
app/
ops/project_control.json
ops/task_plan.md
ops/progress.md
ops/findings.md
ops/.githooks/
ops/.tmp/
```

Eso significa:

- `app/`
  contiene el producto real
- `ops/`
  contiene la operación TrackOps y OPERA

TrackOps separa tu producto real en `app/` y la operación en `ops/`, para que no se mezclen.

### 6. Qué añade OPERA

Cuando instalas OPERA:

```text
ops/genesis.md
ops/.agent/hub/agent.md
ops/.agent/hub/router.md
ops/.agents/skills/_registry.md
```

Y el estado de OPERA queda registrado en `ops/project_control.json`.

### 7. Gestión del entorno

TrackOps usa un contrato explícito para secretos y configuración sensible:

- `/.env`
  archivo real del workspace
- `/.env.example`
  contrato público de variables
- `app/.env`
  puente de compatibilidad para herramientas del producto

Comandos:

```bash
trackops env status
trackops env sync
```

Reglas:

- TrackOps nunca muestra valores en CLI, dashboard o docs operativos
- `env status` solo muestra claves requeridas, presentes y faltantes
- `env sync` regenera el contrato y el puente sin sobrescribir valores reales existentes

### 8. Fuente de verdad y trabajo diario

TrackOps opera así:

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

Reglas clave:

- split layout: la fuente de verdad es `ops/project_control.json`
- legacy layout: la fuente sigue siendo `project_control.json`
- no edites a mano `task_plan.md`, `progress.md` ni `findings.md`
- usa `trackops sync` para regenerarlos

El dashboard:

- arranca localmente
- busca un puerto libre si el preferido está ocupado
- puede copiar la URL local al portapapeles

### 9. Skills del proyecto

Hay dos conceptos distintos:

- skill global `trackops`
  prepara la capacidad en tu agente
- `trackops skill ...`
  gestiona skills nativas del proyecto dentro de `ops/.agents/skills/` en split layout

Ejemplos:

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

### 10. CLI principal

#### Core

```bash
trackops init [--with-opera] [--locale es|en] [--name "..."] [--no-bootstrap] [--legacy-layout]
trackops status
trackops next
trackops sync
trackops workspace status
trackops workspace migrate
trackops env status
trackops env sync
trackops release [--push]
trackops dashboard [--port N] [--host HOST] [--public] [--strict-port]
trackops task <accion> <id> [nota]
trackops version
```

#### OPERA

```bash
trackops opera install [--locale es|en] [--non-interactive] [--no-bootstrap]
trackops opera bootstrap [--locale es|en] [--non-interactive]
trackops opera status
trackops opera configure [--phases '...'] [--locale es|en]
trackops opera upgrade
```

#### Skills del proyecto

```bash
trackops skill install <nombre>
trackops skill list
trackops skill remove <nombre>
trackops skill catalog
```

### 11. Release y mantenimiento

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:sync-version
npm run skill:validate
npm run skill:smoke
npm run release:check
```

En proyectos split:

- el código publicado sale de `app/`
- la operación vive en `ops/`
- el changelog del producto vive en `app/CHANGELOG.md`
- `trackops release` nunca publica `/.env`, `ops/` ni `.trackops-workspace.json`

### FAQ

**¿La skill global instala OPERA en todos mis proyectos?**  
No. Solo prepara la máquina y el agente. OPERA se activa repo a repo.

**¿Puedo seguir usando `npx trackops ...` sin la skill global?**  
Sí. La skill global es el camino principal para agentes, no un requisito obligatorio para el paquete npm.

**¿Dónde queda el estado global de la skill?**  
En `~/.trackops/runtime.json`.

**¿Dónde queda el estado local del proyecto?**  
En split layout, en `ops/project_control.json`. En legacy layout, en `project_control.json`.

---

## English

### 1. What TrackOps is today

TrackOps is a local orchestration and operational automation system for projects and AI-agent development.

Its job is straightforward:

- prepare the agent’s global capability
- activate operational control per repository only when you decide
- keep the real app separate from the operational layer

### 2. Install the global skill

The primary distribution path for TrackOps is a global skill:

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Supported targets:

- `antigravity`
- `claude-code`
- `codex`
- `cursor`
- `gemini-cli`
- `github-copilot`
- `kiro-cli`

The global skill prepares the machine. It does not create files inside repositories by itself.

### 3. First use: bootstrap the runtime

On first real use, the skill ensures the npm runtime:

```bash
node scripts/bootstrap-trackops.js
```

That step:

- validates `Node.js >= 18`
- validates `npm`
- installs or updates `trackops`
- verifies the command
- records state in `~/.trackops/runtime.json`

### 4. Local project activation

When you want to manage a repository:

```bash
trackops init
trackops opera install
```

Official interpretation:

- `trackops init`
  activates the local orchestrator
- `trackops opera install`
  adds the optional OPERA framework
- `trackops init --with-opera`
  exists as a shortcut
- `trackops init --legacy-layout`
  exists only for compatibility

### 5. What `trackops init` creates

By default, TrackOps creates a split workspace:

```text
.trackops-workspace.json
.env
.env.example
app/
ops/project_control.json
ops/task_plan.md
ops/progress.md
ops/findings.md
ops/.githooks/
ops/.tmp/
```

Meaning:

- `app/`
  contains the real product
- `ops/`
  contains TrackOps and OPERA operations

TrackOps separates your real product into `app/` and operations into `ops/`, so they do not get mixed.

### 6. What OPERA adds

When you install OPERA:

```text
ops/genesis.md
ops/.agent/hub/agent.md
ops/.agent/hub/router.md
ops/.agents/skills/_registry.md
```

And OPERA state is recorded in `ops/project_control.json`.

### 7. Environment management

TrackOps uses an explicit contract for secrets and sensitive configuration:

- `/.env`
  real workspace file
- `/.env.example`
  public variable contract
- `app/.env`
  compatibility bridge for product tooling

Commands:

```bash
trackops env status
trackops env sync
```

Rules:

- TrackOps never prints values in CLI, dashboard, or operational docs
- `env status` only shows required, present, and missing keys
- `env sync` regenerates the contract and the bridge without overwriting existing real values

### 8. Source of truth and daily workflow

TrackOps is operated like this:

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

Key rules:

- split layout: the source of truth is `ops/project_control.json`
- legacy layout: the source remains `project_control.json`
- do not hand-edit `task_plan.md`, `progress.md`, or `findings.md`
- use `trackops sync` to regenerate them

The dashboard:

- starts locally
- finds a free port if the preferred one is busy
- can copy the local URL to the clipboard

### 9. Project skills

There are two different concepts:

- global `trackops` skill
  prepares capability in your agent
- `trackops skill ...`
  manages project-native skills under `ops/.agents/skills/` in split layout

Examples:

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
trackops skill remove commiter
```

### 10. Main CLI

#### Core

```bash
trackops init [--with-opera] [--locale es|en] [--name "..."] [--no-bootstrap] [--legacy-layout]
trackops status
trackops next
trackops sync
trackops workspace status
trackops workspace migrate
trackops env status
trackops env sync
trackops release [--push]
trackops dashboard [--port N] [--host HOST] [--public] [--strict-port]
trackops task <action> <id> [note]
trackops version
```

#### OPERA

```bash
trackops opera install [--locale es|en] [--non-interactive] [--no-bootstrap]
trackops opera bootstrap [--locale es|en] [--non-interactive]
trackops opera status
trackops opera configure [--phases '...'] [--locale es|en]
trackops opera upgrade
```

#### Project skills

```bash
trackops skill install <name>
trackops skill list
trackops skill remove <name>
trackops skill catalog
```

### 11. Release and maintenance

Before publishing:

```bash
trackops workspace status
trackops env status
npm run skill:sync-version
npm run skill:validate
npm run skill:smoke
npm run release:check
```

In split projects:

- published code comes from `app/`
- operations live in `ops/`
- the product changelog lives in `app/CHANGELOG.md`
- `trackops release` never publishes `/.env`, `ops/`, or `.trackops-workspace.json`

### FAQ

**Does the global skill install OPERA into all my projects?**  
No. It only prepares the machine and the agent. OPERA is activated repository by repository.

**Can I still use `npx trackops ...` without the global skill?**  
Yes. The global skill is the main path for agents, not a hard requirement for the npm package.

**Where is the global skill state stored?**  
In `~/.trackops/runtime.json`.

**Where is local project state stored?**  
In split layout, in `ops/project_control.json`. In legacy layout, in `project_control.json`.

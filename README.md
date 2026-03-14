<p align="center">
  <img src="docs/assets/logo.svg" alt="TrackOps Logo" width="96" height="96" />
</p>

<h1 align="center">TrackOps</h1>

<p align="center">
  <strong>Local orchestration and operational automation for projects built with AI agents.</strong>
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

TrackOps es un sistema local de orquestación y automatización operativa para proyectos y desarrollo asistido por agentes IA.

Hace tres cosas:

1. prepara a tu agente con una skill global
2. activa control operativo dentro de cada repo
3. media entre el usuario y el agente cuando el proyecto todavía está poco definido

### Modelo actual

TrackOps trabaja en dos capas:

1. `skill global`
   se instala una vez en tu agente o CLI
2. `activación local por proyecto`
   se ejecuta cuando decides gestionar un repo concreto

La activación local tiene dos caminos:

- `arranque asistido por agente`
  para ideas tempranas, usuarios poco técnicos o documentación insuficiente
- `bootstrap directo`
  para proyectos ya definidos y usuarios técnicos

### Instalación global

TrackOps se distribuye como skill global:

```bash
npx skills add Baxahaun/trackops
```

La skill:

- prepara el agente
- asegura el runtime en el primer uso real
- no modifica repos por sí sola

### Primer uso

En el primer uso, la skill ejecuta:

```bash
node scripts/bootstrap-trackops.js
```

Ese bootstrap valida `Node.js >= 18`, valida `npm`, instala o actualiza `trackops` y registra el estado en `~/.trackops/runtime.json`.

### Activación local

Dentro de un repo:

```bash
trackops init
trackops opera install
```

Semántica:

- `trackops init`
  activa TrackOps en el repo
- `trackops opera install`
  añade OPERA cuando quieres el framework operativo completo
- `trackops init --with-opera`
  existe como atajo
- `trackops init --legacy-layout`
  existe solo por compatibilidad

### Workspace split

Por defecto, TrackOps separa producto y operación:

```text
mi-proyecto/
├── .trackops-workspace.json
├── .env
├── .env.example
├── app/
│   └── ...producto real...
└── ops/
    ├── project_control.json
    ├── contract/
    │   └── operating-contract.json
    ├── policy/
    │   └── autonomy.json
    ├── task_plan.md
    ├── progress.md
    ├── findings.md
    ├── genesis.md
    ├── bootstrap/
    ├── .agent/
    ├── .agents/
    ├── .githooks/
    └── .tmp/
```

Fuente de verdad operativa:

- layout split: `ops/project_control.json`
- layout legacy: `project_control.json`

### Dos formas de arrancar OPERA

#### Tengo una idea

Si el usuario no es técnico, el proyecto está en fase idea, o no hay documentación suficiente, OPERA no sigue con preguntas de arquitectura en terminal. En su lugar:

1. pregunta nivel técnico, estado del proyecto y documentación disponible
2. genera un handoff en `ops/bootstrap/agent-handoff.md`
3. espera a que el agente produzca:
   - `ops/bootstrap/intake.json`
   - `ops/bootstrap/spec-dossier.md`
   - `ops/bootstrap/open-questions.md` si quedan huecos importantes
4. reanudas con:

```bash
trackops opera bootstrap --resume
```

#### Ya tengo un repo

Si el usuario es técnico y el proyecto ya tiene suficiente contexto, OPERA sigue por bootstrap directo, compila `ops/contract/operating-contract.json` y recompila `ops/genesis.md`.

También puedes forzar el modo:

```bash
trackops opera install --bootstrap-mode handoff
trackops opera install --bootstrap-mode direct
```

Flags disponibles:

- `--technical-level low|medium|high|senior`
- `--project-state idea|draft|existing_repo|advanced`
- `--docs-state none|notes|sos|spec_dossier|repo_docs`
- `--decision-ownership user|shared|agent`

### Entorno y secretos

TrackOps gestiona un contrato explícito de entorno:

- `/.env`
  secretos reales del workspace
- `/.env.example`
  contrato público de variables
- `app/.env`
  puente de compatibilidad

Comandos:

```bash
trackops env status
trackops env sync
```

TrackOps nunca imprime ni persiste valores sensibles en docs, dashboard o `project_control.json`.

### Idioma

TrackOps puede trabajar con:

- idioma global en `~/.trackops/runtime.json`
- idioma por proyecto en `ops/project_control.json`

Comandos:

```bash
trackops locale get
trackops locale set es
trackops doctor locale
```

### Trabajo diario

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

Reglas:

- usa `trackops status` para leer foco, fase y bloqueadores
- usa `trackops next` para ver la siguiente tarea lista
- usa `trackops sync` para regenerar docs operativos
- no edites a mano `task_plan.md`, `progress.md` ni `findings.md`

### CLI principal

#### Core

| Comando | Descripción |
|---|---|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."] [--no-bootstrap] [--legacy-layout]` | Inicializa TrackOps |
| `trackops status` | Muestra estado operativo |
| `trackops next` | Muestra la siguiente cola priorizada |
| `trackops sync` | Regenera docs operativos |
| `trackops workspace status` | Muestra layout y roots |
| `trackops workspace migrate` | Migra un proyecto legacy |
| `trackops env status` | Audita claves presentes y faltantes |
| `trackops env sync` | Regenera `/.env`, `/.env.example` y el puente |
| `trackops locale get\|set [es\|en]` | Lee o fija el idioma global |
| `trackops doctor locale` | Explica el origen del idioma efectivo |
| `trackops release [--push]` | Publica la rama configurada desde `app/` |
| `trackops dashboard` | Lanza el dashboard local |

#### OPERA

| Comando | Descripción |
|---|---|
| `trackops opera install [--bootstrap-mode ...] [--technical-level ...] [--project-state ...] [--docs-state ...] [--decision-ownership ...]` | Instala OPERA y decide la ruta de bootstrap |
| `trackops opera bootstrap [--resume]` | Continúa el bootstrap o ingiere el resultado del agente |
| `trackops opera handoff [--print\|--json]` | Muestra el handoff listo para copiar al agente |
| `trackops opera status` | Muestra estado de instalación y bootstrap |
| `trackops opera configure` | Reconfigura idioma o fases |
| `trackops opera upgrade --stable [--reset]` | Reescribe artefactos gestionados a la versión estable actual |

### Skills del proyecto

Hay dos conceptos distintos:

- la skill global `trackops`
  prepara el sistema
- `trackops skill ...`
  gestiona skills nativas del proyecto en `ops/.agents/skills/`

### Publicación

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

`trackops release` publica solo `app/`, incluye `.env.example` y no publica `/.env`, `ops/` ni `.trackops-workspace.json`.

Guía ampliada: [UserGUIDE.md](./UserGUIDE.md)

---

## English

TrackOps is a local orchestration and operational automation system for projects and AI-agent development.

It does three things:

1. prepares your agent with a global skill
2. activates operational control inside each repository
3. mediates between the user and the agent when the project is still loosely defined

### Current model

TrackOps works in two layers:

1. `global skill`
   installed once in the agent or CLI
2. `local per-project activation`
   run when you decide to manage a specific repository

Local activation has two paths:

- `agent-led start`
  for early ideas, non-technical users, or weak documentation
- `direct bootstrap`
  for already defined projects and technical users

### Global install

Install the global skill with:

```bash
npx skills add Baxahaun/trackops
```

The skill prepares the agent, ensures the runtime on first use, and does not mutate repositories by itself.

### First use

On first use the skill runs:

```bash
node scripts/bootstrap-trackops.js
```

It validates `Node.js >= 18`, validates `npm`, installs or updates `trackops`, and records state in `~/.trackops/runtime.json`.

### Local activation

Inside a repository:

```bash
trackops init
trackops opera install
```

### Split workspace

TrackOps separates product and operations by default:

```text
my-project/
├── .trackops-workspace.json
├── .env
├── .env.example
├── app/
└── ops/
    ├── project_control.json
    ├── contract/
    │   └── operating-contract.json
    ├── policy/
    │   └── autonomy.json
    ├── task_plan.md
    ├── progress.md
    ├── findings.md
    ├── genesis.md
    ├── bootstrap/
    ├── .agent/
    ├── .agents/
    ├── .githooks/
    └── .tmp/
```

Operational source of truth:

- split layout: `ops/project_control.json`
- legacy layout: `project_control.json`

### Two ways to start OPERA

#### I only have an idea

If the user is not technical, the project is still in idea stage, or documentation is weak, OPERA does not keep asking architecture questions in the terminal. Instead it:

1. asks for technical level, project state, and available documentation
2. writes a handoff in `ops/bootstrap/agent-handoff.md`
3. waits for the agent to produce:
   - `ops/bootstrap/intake.json`
   - `ops/bootstrap/spec-dossier.md`
   - `ops/bootstrap/open-questions.md` when important gaps remain
4. resumes with:

```bash
trackops opera bootstrap --resume
```

#### I already have a repository

If the user is technical and the project already has enough context, OPERA continues with direct bootstrap, compiles `ops/contract/operating-contract.json`, and recompiles `ops/genesis.md`.

You can also force the mode:

```bash
trackops opera install --bootstrap-mode handoff
trackops opera install --bootstrap-mode direct
```

### Environment and secrets

TrackOps manages:

- `/.env`
  real workspace secrets
- `/.env.example`
  public variable contract
- `app/.env`
  compatibility bridge

### Language

TrackOps can work with:

- a global language in `~/.trackops/runtime.json`
- a per-project language in `ops/project_control.json`

Commands:

```bash
trackops locale get
trackops locale set en
trackops doctor locale
```

### Daily workflow

```bash
trackops status
trackops next
trackops sync
trackops env status
trackops dashboard
```

### Main CLI

Core and OPERA commands follow the same contract as the Spanish section above, including `trackops opera handoff` and `trackops opera bootstrap --resume`.

### Publishing

`trackops release` publishes only `app/`, includes `.env.example`, and never publishes `/.env`, `ops/`, or `.trackops-workspace.json`.

Extended guide: [UserGUIDE.md](./UserGUIDE.md)

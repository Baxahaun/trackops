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
  <a href="#espanol">Espanol</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://baxahaun.github.io/trackops/">Web</a>
</p>

---

## Espanol

TrackOps es un sistema local de orquestacion y automatizacion operativa para proyectos y desarrollo asistido por agentes IA.

Hace tres cosas:

1. prepara al agente con una skill global
2. activa control operativo dentro de cada repo
3. media entre el usuario y el agente cuando el proyecto aun esta poco definido

### Modelo actual

TrackOps trabaja en dos capas:

1. `skill global`
   se instala una vez en el agente
2. `runtime + activacion local`
   se instalan y ejecutan cuando decides gestionar una maquina y un repo concretos

La activacion local tiene dos caminos:

- `arranque asistido por agente`
  para ideas tempranas, usuarios poco tecnicos o documentacion insuficiente
- `bootstrap directo`
  para proyectos ya definidos y usuarios tecnicos

### Instalacion global

Instala la skill global:

```bash
npx skills add Baxahaun/trackops
```

Instala el runtime de forma explicita:

```bash
npm install -g trackops
trackops --version
```

Esta separacion es intencional:

- la skill se audita como capa de instrucciones
- el runtime se instala con un paso visible y verificable
- no hay instalacion transitiva oculta desde la propia skill

### Activacion local

Dentro de un repo:

```bash
trackops init
trackops opera install
```

Semantica:

- `trackops init`
  activa TrackOps en el repo
- `trackops opera install`
  anade OPERA cuando quieres el framework operativo completo
- `trackops init --with-opera`
  existe como atajo
- `trackops init --legacy-layout`
  existe solo por compatibilidad

### Workspace split

Por defecto, TrackOps separa producto y operacion:

```text
mi-proyecto/
|- .trackops-workspace.json
|- .env
|- .env.example
|- app/
|  \- ...producto real...
\- ops/
   |- project_control.json
   |- contract/
   |  \- operating-contract.json
   |- policy/
   |  \- autonomy.json
   |- task_plan.md
   |- progress.md
   |- findings.md
   |- genesis.md
   |- bootstrap/
   |- .agent/
   |- .agents/
   |- .githooks/
   \- .tmp/
```

Fuente de verdad operativa:

- layout split: `ops/project_control.json`
- layout legacy: `project_control.json`

### Dos formas de arrancar OPERA

#### Tengo una idea

Si el usuario no es tecnico, el proyecto esta en fase idea, o no hay documentacion suficiente, OPERA no sigue con preguntas de arquitectura en terminal. En su lugar:

1. pregunta nivel tecnico, estado del proyecto y documentacion disponible
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

Si el usuario es tecnico y el proyecto ya tiene suficiente contexto, OPERA sigue por bootstrap directo, compila `ops/contract/operating-contract.json` y recompila `ops/genesis.md`.

Tambien puedes forzar el modo:

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

TrackOps gestiona un contrato explicito de entorno:

- `/.env`
  secretos reales del workspace
- `/.env.example`
  contrato publico de variables
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

### CLI principal

| Comando | Descripcion |
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
| `trackops opera install [--bootstrap-mode ...] [--technical-level ...] [--project-state ...] [--docs-state ...] [--decision-ownership ...]` | Instala OPERA y decide la ruta de bootstrap |
| `trackops opera bootstrap [--resume]` | Continua el bootstrap o ingiere el resultado del agente |
| `trackops opera handoff [--print\|--json]` | Muestra el handoff listo para copiar al agente |
| `trackops opera status` | Muestra estado de instalacion y bootstrap |
| `trackops opera configure` | Reconfigura idioma o fases |
| `trackops opera upgrade --stable [--reset]` | Reescribe artefactos gestionados a la version estable actual |

### Skills del proyecto

Hay dos conceptos distintos:

- la skill global `trackops`
  prepara al agente y guia el flujo
- `trackops skill ...`
  gestiona skills nativas del proyecto en `ops/.agents/skills/`

### Publicacion

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

`trackops release` publica solo `app/`, incluye `.env.example` y no publica `/.env`, `ops/` ni `.trackops-workspace.json`.

Guia ampliada: [UserGUIDE.md](./UserGUIDE.md)

---

## English

TrackOps is a local orchestration and operational automation system for projects and AI-agent development.

It does three things:

1. prepares the agent with a global skill
2. activates operational control inside each repository
3. mediates between the user and the agent when the project is still loosely defined

### Current model

TrackOps works in two layers:

1. `global skill`
   installed once in the agent
2. `runtime + local activation`
   installed and used when you decide to manage a specific machine and repository

Local activation has two paths:

- `agent-led start`
  for early ideas, non-technical users, or weak documentation
- `direct bootstrap`
  for already defined projects and technical users

### Global install

Install the global skill:

```bash
npx skills add Baxahaun/trackops
```

Install the runtime explicitly:

```bash
npm install -g trackops
trackops --version
```

This split is intentional:

- the skill is audited as an instruction layer
- the runtime is installed through a visible and verifiable step
- there is no hidden transitive install from the skill itself

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
|- .trackops-workspace.json
|- .env
|- .env.example
|- app/
\- ops/
   |- project_control.json
   |- contract/
   |  \- operating-contract.json
   |- policy/
   |  \- autonomy.json
   |- task_plan.md
   |- progress.md
   |- findings.md
   |- genesis.md
   |- bootstrap/
   |- .agent/
   |- .agents/
   |- .githooks/
   \- .tmp/
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

Use:

```bash
trackops env status
trackops env sync
```

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

### Main CLI

Core and OPERA commands follow the same contract as the Spanish section above, including `trackops opera handoff`, `trackops opera bootstrap --resume`, and the explicit `npm install -g trackops` runtime step.

### Publishing

`trackops release` publishes only `app/`, includes `.env.example`, and never publishes `/.env`, `ops/`, or `.trackops-workspace.json`.

Extended guide: [UserGUIDE.md](./UserGUIDE.md)

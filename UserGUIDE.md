# TrackOps — Guía de Uso / User Guide

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>
</p>

---

## Español

> **Estado beta:** TrackOps ya puede usarse en trabajo real, pero algunas vistas, comandos y automatizaciones todavía pueden ajustarse entre versiones.

> **Descargo de responsabilidad:** Valida siempre los archivos generados, los cambios automáticos y cualquier salida producida por agentes antes de incorporarla a tu proyecto o de llevarla a producción.

### Índice

1. [Inicio Rápido](#inicio-rápido)
2. [Estructura de project_control.json](#estructura-de-project_controljson)
3. [Comandos CLI](#comandos-cli)
4. [Dashboard Web](#dashboard-web)
5. [Integración con IA (Claude Code, Cursor, Copilot)](#integración-con-ia)
6. [Git Hooks](#git-hooks)
7. [Metodología OPERA](#metodología-opera)
8. [Skills — Plugins del Ecosistema](#skills)
9. [Multi-proyecto](#multi-proyecto)
10. [Preguntas Frecuentes](#preguntas-frecuentes)

---

### Inicio Rápido

No necesitas instalar nada globalmente. Ve a cualquier directorio de proyecto y ejecuta:

```bash
npx trackops init
```

Esto crea `project_control.json` con la configuración inicial, instala los git hooks y registra el proyecto en el portfolio local.

Tambien deja atajos npm listos para usar dentro del proyecto:

```bash
npm run ops:status
npm run ops:dashboard
npm run ops:sync
```

Para instalar con la metodología OPERA incluida:

```bash
npx trackops init --with-opera
```

El flujo diario básico:

```bash
npx trackops status              # Ver estado del proyecto
npx trackops next                # Ver próximas tareas
npx trackops task start ops-bootstrap  # Empezar a trabajar
npx trackops sync                # Generar Markdown para tu IA
npx trackops dashboard           # Abrir centro de control web
```

---

### Estructura de project_control.json

El archivo `project_control.json` es la **única fuente de verdad** del proyecto. Nunca lo edites durante el trabajo activo — usa el dashboard o los comandos CLI.

```json
{
  "meta": {
    "projectName": "Mi Proyecto",
    "controlVersion": 2,
    "locale": "es",
    "phases": [
      { "id": "O", "label": "Orquestar", "index": 1 },
      { "id": "P", "label": "Probar",    "index": 2 },
      { "id": "E", "label": "Estructurar","index": 3 },
      { "id": "R", "label": "Refinar",   "index": 4 },
      { "id": "A", "label": "Automatizar","index": 5 }
    ],
    "currentFocus": "Descripción del foco actual",
    "focusPhase": "O",
    "deliveryTarget": "Objetivo de entrega"
  },
  "tasks": [...],
  "findings": [...],
  "milestones": [...],
  "decisionsPending": [...]
}
```

**Campos clave de `meta`:**

| Campo | Descripción |
|-------|-------------|
| `projectName` | Nombre del proyecto (aparece en docs y dashboard) |
| `locale` | Idioma: `"es"` o `"en"` |
| `phases` | Fases de tu ciclo de desarrollo (personalizables) |
| `currentFocus` | Descripción breve del sprint/objetivo actual |
| `focusPhase` | ID de la fase activa (e.g. `"O"`) |

**Estructura de una tarea:**

```json
{
  "id": "T-001",
  "title": "Implementar autenticación",
  "phase": "E",
  "stream": "Backend",
  "priority": "P0",
  "status": "in_progress",
  "required": true,
  "dependsOn": [],
  "summary": "Descripción detallada",
  "acceptance": ["JWT válido generado", "Refresh token funcionando"],
  "history": [
    { "at": "2026-03-11T10:00:00Z", "action": "start", "note": "" }
  ]
}
```

**Estados de tarea válidos:** `pending`, `in_progress`, `in_review`, `blocked`, `completed`, `cancelled`

**Prioridades:** `P0` (crítica), `P1` (alta), `P2` (media), `P3` (baja)

---

### Comandos CLI

#### Motor Core

| Comando | Descripción |
|---------|-------------|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."]` | Inicializar en el directorio actual. `--with-etapa` se conserva solo por compatibilidad. |
| `trackops status` | Estado completo: foco, fase, tareas, bloqueadores, repo git |
| `trackops next` | Próximas tareas ejecutables (sin dependencias bloqueantes) |
| `trackops sync` | Regenerar `task_plan.md`, `progress.md`, `findings.md` |
| `trackops dashboard` | Lanzar dashboard web local |
| `trackops refresh-repo [--quiet]` | Actualizar estado del repo git en el runtime |
| `trackops register` | Registrar proyecto en el portfolio multi-proyecto |
| `trackops projects` | Listar proyectos registrados |

#### Gestión de Tareas

```bash
trackops task start    <task-id> [nota]   # Marcar tarea como en progreso
trackops task review   <task-id> [nota]   # Marcar para revisión
trackops task complete <task-id> [nota]   # Completar tarea
trackops task block    <task-id> <nota>   # Bloquear con descripción
trackops task pending  <task-id> [nota]   # Volver a pendiente
trackops task cancel   <task-id> [nota]   # Cancelar
trackops task note     <task-id> <nota>   # Añadir nota sin cambiar estado
```

#### Metodología OPERA

```bash
trackops opera install                    # Instalar OPERA en el proyecto
trackops opera status                     # Ver estado e integridad
trackops opera configure [--phases '...'] # Reconfigurar fases
trackops opera upgrade                    # Actualizar templates
```

#### Skills

```bash
trackops skill install <nombre>           # Instalar skill
trackops skill list                       # Listar skills instaladas
trackops skill remove <nombre>            # Desinstalar skill
trackops skill catalog                    # Ver skills disponibles
```

#### Publicación

```bash
npm run release:check
```

La política básica de versiones y publicación está documentada en `docs/RELEASE.md`.

---

### Dashboard Web

El dashboard central interactivo es el centro de mando local.

```bash
npx trackops dashboard
```
Por defecto, se abre en **http://localhost:4173**. Si necesitas otro puerto, puedes definir `OPS_UI_PORT`.

**Navegación Principal (7 Vistas):**

- **Overview:** 4 KPIs principales, progreso por fase, gráfico de **Actividad Semanal** (cambios de los últimos 10 días), **Progreso Global** (donut chart por estado) y acceso directo a la siguiente tarea.
- **Tasks:** Selector rápido y listado. Al hacer clic en una tarea, el **Editor de Tareas Split-View** permite cambiar su fase, prioridad, gestionar dependencias, añadir/resolver bloqueos y mover su estado mediante botones de acción.
- **Board:** Kanban drag&drop. Mover tarjetas entre columnas actualiza instantáneamente el estado del proyecto y regenera los documentos.
- **Execution:** Terminal **Server-Sent Events (SSE)**. Un shell integrado con historial de sesiones y streaming real-time que permite invocar comandos locales (como build scripts o validaciones) sin salir de tu cockpit. Permite ejecutar con **Ctrl+Enter**.
- **Analytics:** El **Health Grid** reporta la salud operativa (Repo Status, Delivery Rate, Docs Drift...). Incluye un desglose por tareas, hitos de fase en detalle, timeline de eventos recientes y gestión ampliada de findings/decisiones.
- **Skills:** Catálogo e instalación de habilidades del agente, con vista local y recomendaciones disponibles.
- **Settings:** Detalles técnicos del portafolio multi-proyecto, configuración del repo y registro local.

**Funcionalidades Transversales:**

- **Time Tracker (Focus Mode):** Accesible desde el Topbar en cualquier vista e integrado visualmente en el Overview y el listado de tareas. Haz clic en 'Play' en cualquier tarea, y la duración queda registrada de manera inmutable (para análisis o billing).
- **Consola Transparente:** La consola (`Console Logs` en el sidebar) intercepta cualquier error del cliente, evitando fallos silenciosos no detectados en navegador. En verde (debug)/rojo (error).
- **Onboarding e Integración:** Un tour guiado interactivo por todas las pantallas pulsando _"Ayuda & Tour"_ en el sidebar (para usuarios noveles).
- **Atajos & UI:** Usa **⌘/Ctrl+F** para abrir la barra de búsqueda inmediatamente. Usa el switch entre **Tema Claro / Oscuro** en el topbar, tus preferencias se guardan para la siguiente iteración.

El dashboard está diseñado con foco *Desktop-First* y completamente programado con un *stack vanilla* escalable, funcionando puramente en entorno local.

---

### 🔥 AI Agentic Skill Management via skills.sh

TrackOps no es solo un tablero visual, es la interfaz del modelo inteligente (tu IA Copiloto, ya sea Gemini u otros agentes). El poder del modelo se expande mediante **Skills**. 

El Dashboard cuenta con la vista **Agent Skills** (App Store interna):
- **Descubrimiento:** Sugiere workflows pre-fabricados analizando de forma latente la naturaleza de tu proyecto. El backend conecta a la comunidad en `skills.sh`.
- **Instalación "One-Click":** Un click en "Instalar" descargará de `skills.sh` el workflow y lo ubicará internamente en `.agents/skills/`.
- **Ejecución Contextual:** La próxima vez que ordenes al modelo que opere, el agente leerá `.agents/skills/[skill-id]/SKILL.md` para emular ese experto preciso (Ej. *TDD Master*, o *E2E Tester*).

---

### Integración con IA

TrackOps funciona con cualquier asistente de IA que pueda leer archivos del proyecto.

#### Claude Code

Añade a tu `CLAUDE.md` (o instrucciones de sistema):

```markdown
## Control Operativo

Antes de iniciar cualquier tarea:
1. Lee `task_plan.md` para entender el estado del proyecto.
2. Lee `progress.md` para contexto de lo que ya se ha hecho.
3. Lee `findings.md` para conocer hallazgos y decisiones previas.
4. Usa `trackops status` para confirmar el estado actual.

Al completar trabajo:
1. Ejecuta `trackops task complete <id>` para actualizar el estado.
2. Ejecuta `trackops sync` para regenerar la documentación.
```

#### Cursor / Copilot / Windsurf

Incluye los archivos generados en el contexto del IDE:

```
task_plan.md     ← El mapa de trabajo actual
progress.md      ← El historial de lo ejecutado
findings.md      ← Hallazgos, decisiones y bloqueos
genesis.md       ← La constitución del proyecto (si usas OPERA)
```

Añade al `.cursorrules` o instrucciones del workspace:

```
Siempre consulta task_plan.md antes de proponer código.
El estado de las tareas está en project_control.json.
No edites task_plan.md, progress.md ni findings.md manualmente.
```

#### Flujo Recomendado con IA

```
1. trackops status        → La IA ve el estado
2. trackops next          → La IA elige la próxima tarea
3. trackops task start T-001  → La IA sabe en qué trabaja
4. [La IA implementa]
5. trackops task complete T-001
6. trackops sync          → Docs actualizados para el siguiente contexto
```

---

### Git Hooks

Los hooks se instalan automáticamente con `trackops init` en `.githooks/`.

Se configuran tres hooks que ejecutan `trackops refresh-repo --quiet`:

- `post-commit` — captura el estado del árbol tras cada commit
- `post-checkout` — actualiza la rama activa
- `post-merge` — registra merges

El hook aplica `git config core.hooksPath .githooks` automáticamente.

Para reinstalar manualmente:

```bash
npx trackops install-hooks
```

Para verificar que los hooks están activos:

```bash
git config core.hooksPath
# Debe mostrar: .githooks
```

---

### Metodología OPERA

OPERA es un framework opcional de 5 fases para desarrollo estructurado con agentes IA.

#### Las 5 Fases

| Fase | Nombre | Foco | Entregable |
|------|--------|------|------------|
| **O** | Orquestar | Visión, datos, reglas de negocio | Schema JSON en `genesis.md` |
| **P** | Probar | Conectividad y validación | Scripts de test pasando |
| **E** | Estructurar | Construcción en 3 capas | SOPs + tools + integración |
| **R** | Refinar | Refinamiento y calidad | Outputs validados |
| **A** | Automatizar | Despliegue y triggers | Triggers + smoke test |

Cada fase tiene un **Definition of Done** verificable — no se avanza sin cumplirlo.

#### Instalar OPERA

```bash
npx trackops opera install
```

Esto crea:
- `.agent/hub/agent.md` — Instrucciones del agente principal
- `.agent/hub/router.md` — Reglas de enrutamiento hacia skills
- `.agents/skills/_registry.md` — Índice de skills instaladas
- `genesis.md` — La constitución del proyecto (rellenar tras init)

#### Fases Personalizadas

Las fases son configurables por proyecto. Puedes usar cualquier metodología:

```bash
# Scrum simplificado
npx trackops opera configure --phases '[
  {"id":"D","label":"Discovery","index":1},
  {"id":"S","label":"Sprint","index":2},
  {"id":"R","label":"Review","index":3}
]'
```

O desde `project_control.json` directamente:

```json
"meta": {
  "phases": [
    { "id": "D", "label": "Discovery", "index": 1 },
    { "id": "S", "label": "Sprint",    "index": 2 },
    { "id": "R", "label": "Review",    "index": 3 }
  ]
}
```

---

### Skills

Las skills son plugins `.md` que dan instrucciones especializadas a tu agente IA.

#### Skills Incluidas

| Skill | Descripción |
|-------|-------------|
| `commiter` | Protocolo para commits semánticos con formato convencional |
| `changelog-updater` | Actualizar `CHANGELOG.md` tras cada commit |
| `project-starter-skill` | Protocolo completo de inicialización de proyectos con OPERA |

#### Gestión de Skills

```bash
# Ver qué hay disponible
trackops skill catalog

# Instalar una skill
trackops skill install commiter

# Ver qué está instalado
trackops skill list

# Desinstalar
trackops skill remove commiter
```

#### Crear una Skill Propia

Crea un directorio en `.agents/skills/<nombre>/` con un archivo `SKILL.md`:

```markdown
---
name: "mi-skill"
description: "Descripción breve de qué hace esta skill y cuándo activarla."
metadata:
  version: "1.0"
  type: "project"
  triggers:
    - "cuando hacer X"
    - "contexto Y"
---

# Mi Skill

## Propósito
[Explica qué hace esta skill]

## Protocolo
[Pasos que el agente debe seguir]
```

Las skills se leen automáticamente por el agente cuando detecta el contexto apropiado.

---

### Multi-proyecto

TrackOps mantiene un registry global de proyectos en `~/.trackops/registry.json`.

```bash
# Registrar el proyecto actual
trackops register

# Ver todos los proyectos
trackops projects

# El dashboard muestra el selector de proyectos automáticamente
trackops dashboard
```

Desde el dashboard puedes cambiar entre proyectos sin reiniciar el servidor.

---

### Preguntas Frecuentes

**¿Necesito instalar trackops globalmente?**
No. Usa siempre `npx trackops <comando>`. Si lo instalas globalmente con `npm install -g trackops`, también funciona.

**¿Los archivos generados (task_plan.md, progress.md, findings.md) debo incluirlos en git?**
Sí. Son el contexto que tu IA lee. Añádelos al repositorio y commitéalos regularmente con `trackops sync`.

**¿Puedo usar TrackOps sin la metodología OPERA?**
Sí. OPERA es completamente opcional. El motor core (tareas, dashboard, docs, git hooks) funciona de forma independiente.

**¿Cómo cambio el idioma a inglés?**
```bash
npx trackops init --locale en
```
O edita `project_control.json`:
```json
"meta": { "locale": "en" }
```

**¿Qué pasa si borro project_control.json?**
Pierdes el estado del proyecto. Siempre inclúyelo en git. Los archivos `.md` generados son secundarios — la fuente de verdad es `project_control.json`.

**¿Puedo tener múltiples instancias del dashboard abiertas?**
Sí, en puertos distintos. El servidor usa el puerto 4173 por defecto. Si necesitas otro, defínelo así:
```bash
$env:OPS_UI_PORT=4174; npx trackops dashboard
```

**¿Cómo integro TrackOps con CI/CD?**
Usa `trackops sync` como paso previo al commit en tu pipeline. Los docs generados siempre estarán actualizados.

---

<br/>

---

## English

> **Beta status:** TrackOps is already usable for real work, but some views, commands, and automations may still change between releases.

> **Disclaimer:** Always validate generated files, automated changes, and any agent-produced output before merging it into your project or using it in production.

### Table of Contents

1. [Quick Start](#quick-start)
2. [project_control.json Structure](#project_controljson-structure)
3. [CLI Commands](#cli-commands)
4. [Web Dashboard](#web-dashboard)
5. [AI Integration (Claude Code, Cursor, Copilot)](#ai-integration)
6. [Git Hooks](#git-hooks-1)
7. [OPERA Methodology](#opera-methodology)
8. [Skills — Ecosystem Plugins](#skills-1)
9. [Multi-project](#multi-project-1)
10. [FAQ](#faq)

---

### Quick Start

No global install needed. Go to any project directory and run:

```bash
npx trackops init
```

This creates `project_control.json` with an initial configuration, installs git hooks, and registers the project in the local portfolio.

It also leaves npm shortcuts ready to use inside the project:

```bash
npm run ops:status
npm run ops:dashboard
npm run ops:sync
```

To install with the OPERA methodology included:

```bash
npx trackops init --with-opera
```

Basic daily workflow:

```bash
npx trackops status              # View project state
npx trackops next                # View next tasks
npx trackops task start ops-bootstrap  # Start working
npx trackops sync                # Generate Markdown for your AI
npx trackops dashboard           # Open web control center
```

---

### project_control.json Structure

The `project_control.json` file is the **single source of truth** for the project. Never edit it directly during active work — use the dashboard or CLI commands.

```json
{
  "meta": {
    "projectName": "My Project",
    "controlVersion": 2,
    "locale": "en",
    "phases": [
      { "id": "O", "label": "Orchestrate", "index": 1 },
      { "id": "P", "label": "Prove",       "index": 2 },
      { "id": "E", "label": "Establish",   "index": 3 },
      { "id": "R", "label": "Refine",      "index": 4 },
      { "id": "A", "label": "Automate",    "index": 5 }
    ],
    "currentFocus": "Brief description of current sprint/goal",
    "focusPhase": "O",
    "deliveryTarget": "Delivery objective"
  },
  "tasks": [...],
  "findings": [...],
  "milestones": [...],
  "decisionsPending": [...]
}
```

**Key `meta` fields:**

| Field | Description |
|-------|-------------|
| `projectName` | Project name (shown in docs and dashboard) |
| `locale` | Language: `"es"` or `"en"` |
| `phases` | Your development cycle phases (customizable) |
| `currentFocus` | Brief description of the current sprint/objective |
| `focusPhase` | Active phase ID (e.g. `"O"`) |

**Task structure:**

```json
{
  "id": "T-001",
  "title": "Implement authentication",
  "phase": "E",
  "stream": "Backend",
  "priority": "P0",
  "status": "in_progress",
  "required": true,
  "dependsOn": [],
  "summary": "Detailed description",
  "acceptance": ["Valid JWT generated", "Refresh token working"],
  "history": [
    { "at": "2026-03-11T10:00:00Z", "action": "start", "note": "" }
  ]
}
```

**Valid task statuses:** `pending`, `in_progress`, `in_review`, `blocked`, `completed`, `cancelled`

**Priorities:** `P0` (critical), `P1` (high), `P2` (medium), `P3` (low)

---

### CLI Commands

#### Core Engine

| Command | Description |
|---------|-------------|
| `trackops init [--with-opera] [--locale es\|en] [--name "..."]` | Initialize in current directory. `--with-etapa` is kept only for compatibility. |
| `trackops status` | Full state: focus, phase, tasks, blockers, git repo |
| `trackops next` | Next executable tasks (without blocking dependencies) |
| `trackops sync` | Regenerate `task_plan.md`, `progress.md`, `findings.md` |
| `trackops dashboard` | Launch local web dashboard |
| `trackops refresh-repo [--quiet]` | Update git repo state in runtime |
| `trackops register` | Register project in the multi-project portfolio |
| `trackops projects` | List registered projects |

#### Task Management

```bash
trackops task start    <task-id> [note]   # Mark task as in progress
trackops task review   <task-id> [note]   # Mark for review
trackops task complete <task-id> [note]   # Complete task
trackops task block    <task-id> <note>   # Block with description
trackops task pending  <task-id> [note]   # Return to pending
trackops task cancel   <task-id> [note]   # Cancel
trackops task note     <task-id> <note>   # Add note without changing status
```

#### OPERA Methodology

```bash
trackops opera install                    # Install OPERA in project
trackops opera status                     # View state and integrity
trackops opera configure [--phases '...'] # Reconfigure phases
trackops opera upgrade                    # Update templates
```

#### Skills

```bash
trackops skill install <name>             # Install skill
trackops skill list                       # List installed skills
trackops skill remove <name>              # Uninstall skill
trackops skill catalog                    # View available skills
```

#### Release

```bash
npm run release:check
```

The basic version and release policy is documented in `docs/RELEASE.md`.

---

### Web Dashboard

The central interactive dashboard is your local command center.

```bash
npx trackops dashboard
```
It runs by default on **http://localhost:4173**. If you need another port, set `OPS_UI_PORT`.

**Main Navigation (7 Views):**

- **Overview:** 4 core KPIs, phase progress, **Weekly Activity** chart (last 10 days state shifts), **Global Progress** (state donut chart), and a shortcut to the next actionable task.
- **Tasks:** Quick filtering and listing. Clicking a task opens the **Split-View Editor**, where you may edit phases, priorities, handle blockers/dependencies, and progress states using the action strip buttons.
- **Board:** Drag & Drop Kanban. Moving cards across columns immediately updates project state and regenerates documents.
- **Execution:** Interactive **Server-Sent Events (SSE)** terminal. A built-in shell detailing session histories with real-time output stream for executing local tasks (e.g. testing, sync, builds) inside your cockpit. Supports **Ctrl+Enter**.
- **Analytics:** The **Health Grid** tracks operational sanity (Repo Status, Delivery Rate, Docs Drift...). Also detailed breakdown bars per state/time tracking, timelines of recent events, and extended management of findings and decisions.
- **Skills:** Agent skill catalog and installation view, with local capabilities and recommended additions.
- **Settings:** Details of technical portfolios, repo configurations, and local registry setup.

**Core Transversal Features:**

- **Time Tracker:** Exposed at the Topbar on every view and fully featured over the Overview. Press 'Play' on a task; duration registers in engine logic immutably (ready for deep analysis/billing).
- **Transparent Console:** A side/docked terminal (`Console Logs`) that intercepts unhandled frontend rejections or syntax failures and warns directly to UI in real-time, preventing silent failure workflows. 
- **Interactive Onboarding:** Guided 12-step tour spanning all the views triggered anytime using the _"Help & Tour"_ action. 
- **Shortcuts & Styling:** Trigger instant task-search globally via **⌘/Ctrl+F**. Fast-switch between **Dark / Light mode** in the topbar, which persists OS preferences.

Running completely locally securely: telemetry-less, unauthenticated, pure local web tooling environment built on Vanilla JS/CSS modules.

---

### 🔥 AI Agentic Skill Management via skills.sh

TrackOps isn't just a visual board; it is the physical UI layer driving your LLM/Agent (be it Gemini or other copilots). The true power behind the engine expands via **Skills**.

The Dashboard provides an app-store-like view, **Agent Skills**:
- **Semantic Discovery:** It silently checks what your project is about and requests contextual workflow packages from the community repository `skills.sh`.
- **One-Click Install:** Hitting "Install" immediately pulls the skill from `skills.sh` and provisions it internally at `.agents/skills/`.
- **Contextual Execution:** The next time you trigger the model to execute a task, the agent will load the precise `.agents/skills/[skill-id]/SKILL.md` file and emulate that precise expert (e.g. *TDD Master*, or *Release Manager*).

---

### AI Integration

TrackOps works with any AI assistant that can read project files.

#### Claude Code

Add to your `CLAUDE.md` (or system instructions):

```markdown
## Operational Control

Before starting any task:
1. Read `task_plan.md` to understand the project state.
2. Read `progress.md` for context on what's been done.
3. Read `findings.md` to know about previous findings and decisions.
4. Run `trackops status` to confirm current state.

When completing work:
1. Run `trackops task complete <id>` to update state.
2. Run `trackops sync` to regenerate documentation.
```

#### Cursor / Copilot / Windsurf

Include the generated files in IDE context:

```
task_plan.md     ← Current work map
progress.md      ← Execution history
findings.md      ← Findings, decisions, and blockers
genesis.md       ← Project constitution (if using OPERA)
```

Add to `.cursorrules` or workspace instructions:

```
Always consult task_plan.md before proposing code.
Task state is in project_control.json.
Do not manually edit task_plan.md, progress.md, or findings.md.
```

#### Recommended AI Workflow

```
1. trackops status        → AI sees the state
2. trackops next          → AI picks the next task
3. trackops task start T-001  → AI knows what it's working on
4. [AI implements]
5. trackops task complete T-001
6. trackops sync          → Docs updated for next context window
```

---

### Git Hooks

Hooks are installed automatically with `trackops init` in `.githooks/`.

Three hooks run `trackops refresh-repo --quiet`:

- `post-commit` — captures tree state after each commit
- `post-checkout` — updates active branch
- `post-merge` — records merges

The hook applies `git config core.hooksPath .githooks` automatically.

To reinstall manually:

```bash
npx trackops install-hooks
```

To verify hooks are active:

```bash
git config core.hooksPath
# Should show: .githooks
```

---

### OPERA Methodology

OPERA is an optional 5-phase framework for structured AI-assisted development.

#### The 5 Phases

| Phase | Name | Focus | Deliverable |
|-------|------|-------|-------------|
| **O** | Orchestrate | Vision, data, business rules | JSON schema in `genesis.md` |
| **P** | Prove | Connectivity and validation | Passing test scripts |
| **E** | Establish | 3-layer build | SOPs + tools + integration |
| **R** | Refine | Refinement and quality | Validated outputs |
| **A** | Automate | Deployment and triggers | Triggers + smoke test |

Each phase has a verifiable **Definition of Done** — you don't advance without meeting it.

#### Install OPERA

```bash
npx trackops opera install
```

This creates:
- `.agent/hub/agent.md` — Main agent instructions
- `.agent/hub/router.md` — Skill routing rules
- `.agents/skills/_registry.md` — Skills index
- `genesis.md` — Project constitution (fill in after init)

#### Custom Phases

Phases are configurable per project. You can use any methodology:

```bash
# Simplified Scrum
npx trackops opera configure --phases '[
  {"id":"D","label":"Discovery","index":1},
  {"id":"S","label":"Sprint","index":2},
  {"id":"R","label":"Review","index":3}
]'
```

Or directly in `project_control.json`:

```json
"meta": {
  "phases": [
    { "id": "D", "label": "Discovery", "index": 1 },
    { "id": "S", "label": "Sprint",    "index": 2 },
    { "id": "R", "label": "Review",    "index": 3 }
  ]
}
```

---

### Skills

Skills are `.md` plugins that give specialized instructions to your AI agent.

#### Included Skills

| Skill | Description |
|-------|-------------|
| `commiter` | Protocol for semantic commits with conventional format |
| `changelog-updater` | Update `CHANGELOG.md` after each commit |
| `project-starter-skill` | Full project initialization protocol with OPERA |

#### Managing Skills

```bash
# See what's available
trackops skill catalog

# Install a skill
trackops skill install commiter

# View what's installed
trackops skill list

# Uninstall
trackops skill remove commiter
```

#### Creating a Custom Skill

Create a directory at `.agents/skills/<name>/` with a `SKILL.md` file:

```markdown
---
name: "my-skill"
description: "Brief description of what this skill does and when to activate it."
metadata:
  version: "1.0"
  type: "project"
  triggers:
    - "when to do X"
    - "context Y"
---

# My Skill

## Purpose
[Explain what this skill does]

## Protocol
[Steps the agent should follow]
```

Skills are automatically read by the agent when it detects the appropriate context.

---

### Multi-project

TrackOps maintains a global registry of projects in `~/.trackops/registry.json`.

```bash
# Register the current project
trackops register

# View all projects
trackops projects

# Dashboard shows the project selector automatically
trackops dashboard
```

From the dashboard you can switch between projects without restarting the server.

---

### FAQ

**Do I need to install trackops globally?**
No. Always use `npx trackops <command>`. If you install globally with `npm install -g trackops`, it also works.

**Should I include the generated files (task_plan.md, progress.md, findings.md) in git?**
Yes. They are the context your AI reads. Add them to the repository and commit them regularly with `trackops sync`.

**Can I use TrackOps without the OPERA methodology?**
Yes. OPERA is completely optional. The core engine (tasks, dashboard, docs, git hooks) works independently.

**How do I change the language to Spanish?**
```bash
npx trackops init --locale es
```
Or edit `project_control.json`:
```json
"meta": { "locale": "es" }
```

**What happens if I delete project_control.json?**
You lose the project state. Always include it in git. The generated `.md` files are secondary — the source of truth is `project_control.json`.

**Can I have multiple dashboard instances open?**
Yes, on different ports. The server uses port 4173 by default. If you need another one:
```bash
OPS_UI_PORT=4174 npx trackops dashboard
```

**How do I integrate TrackOps with CI/CD?**
Use `trackops sync` as a pre-commit step in your pipeline. The generated docs will always be up to date.

---

<p align="center">
  <a href="https://baxahaun.com"><strong>Xavier Crespo Gríman</strong></a> · <a href="https://baxahaun.com">Baxahaun AI Venture Studio</a>
  <br/>
  <a href="https://github.com/Baxahaun/trackops/blob/master/LICENSE">MIT License</a> · 2026
</p>

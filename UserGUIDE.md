# TrackOps User Guide

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>
</p>

---

## Español

### 1. Qué es TrackOps hoy

TrackOps es un sistema local de orquestación y automatización operativa para proyectos y desarrollo asistido por agentes IA.

No solo organiza tareas. También:

- prepara al agente
- separa producto y operación
- decide cuándo el arranque debe pasar por el agente y cuándo puede seguir por terminal

### 2. Instalación global

La entrada principal es la skill global:

```bash
npx skills add Baxahaun/trackops
```

Luego, en el primer uso real, la skill asegura el runtime con:

```bash
node scripts/bootstrap-trackops.js
```

### 3. Activación local

Cuando quieres gestionar un repo:

```bash
trackops init
trackops opera install
```

`trackops init` activa el orquestador local.

`trackops opera install` añade OPERA cuando quieres el framework completo.

### 4. Qué crea TrackOps

En el layout moderno:

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

Si instalas OPERA, además tendrás:

```text
ops/genesis.md
ops/contract/operating-contract.json
ops/policy/autonomy.json
ops/bootstrap/
ops/.agent/hub/agent.md
ops/.agent/hub/router.md
ops/.agents/skills/_registry.md
ops/.agents/skills/project-starter-skill/
```

### 5. Dos caminos de onboarding

TrackOps empieza preguntando tres cosas:

- nivel técnico del usuario
- estado actual del proyecto
- documentación disponible

Con eso decide el camino.

#### Camino A — Idea inicial o usuario no técnico

Si el usuario tiene una idea difusa, es poco técnico, o no hay documentación suficiente:

- TrackOps no sigue con preguntas técnicas en terminal
- crea un handoff en `ops/bootstrap/agent-handoff.md`
- el agente usa ese handoff para hacer discovery y estructuración
- el agente debe generar:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` si todavía quedan preguntas abiertas

Después reanudas con:

```bash
trackops opera bootstrap --resume
```

#### Camino B — Repo existente o usuario técnico

Si el usuario es técnico y el proyecto ya tiene suficiente contexto:

- OPERA sigue por bootstrap directo
- compila el contrato operativo
- actualiza `ops/contract/operating-contract.json`
- recompila `ops/genesis.md`

Puedes forzar el camino:

```bash
trackops opera install --bootstrap-mode handoff
trackops opera install --bootstrap-mode direct
```

Y también pasar el perfil por flags:

```bash
trackops opera install --technical-level low --project-state idea --docs-state none
trackops opera install --technical-level senior --project-state existing_repo --docs-state repo_docs
```

### 6. Cómo usar el handoff

Cuando TrackOps derive el bootstrap al agente:

1. consulta el prompt con:

```bash
trackops opera handoff --print
```

2. o inspecciona el JSON:

```bash
trackops opera handoff --json
```

3. pega ese contexto en el chat del agente
4. deja que el agente genere `intake.json` y `spec-dossier.md`
5. reanuda con `trackops opera bootstrap --resume`

### 7. Qué debe hacer el agente

El agente, usando `project-starter-skill`, debe:

- adaptar el lenguaje al nivel técnico del usuario
- leer y consolidar documentación si existe
- construir una primera especificación si no existe
- no volver a ejecutar `trackops init`
- no recrear el workspace
- escribir:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`

### 8. Entorno y secretos

TrackOps mantiene tres piezas:

- `/.env`
  archivo real del workspace
- `/.env.example`
  contrato público
- `app/.env`
  puente de compatibilidad

Comandos:

```bash
trackops env status
trackops env sync
```

`env status` solo muestra nombres de claves, nunca valores.

### 8.1 Idioma

TrackOps puede guardar un idioma global y también fijar uno por proyecto.

```bash
trackops locale get
trackops locale set es
trackops doctor locale
```

### 9. Trabajo diario

```bash
trackops status
trackops next
trackops task start <id>
trackops task review <id>
trackops task complete <id>
trackops sync
trackops dashboard
```

Reglas:

- `ops/project_control.json` es la fuente de verdad en layout split
- no edites a mano `ops/task_plan.md`, `ops/progress.md` ni `ops/findings.md`
- usa `trackops sync` para regenerarlos

### 10. Release

Antes de publicar:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

`trackops release` publica solo `app/`. Nunca publica `/.env`, `ops/` ni `.trackops-workspace.json`.

### FAQ

**¿La skill global activa todos mis repos?**  
No. Solo prepara la máquina y el agente.

**¿OPERA siempre pregunta cosas técnicas por terminal?**  
No. Si falta contexto o el usuario no es técnico, deriva el arranque al agente.

**¿Puedo trabajar en español o en inglés?**  
Sí. TrackOps y OPERA pueden guardar un idioma global y también fijar uno por proyecto.

**¿Dónde vive el handoff?**  
En `ops/bootstrap/agent-handoff.md` y `ops/bootstrap/agent-handoff.json`.

**¿Dónde queda el estado operativo real?**  
En `ops/project_control.json` en layout split.

---

## English

### 1. What TrackOps is today

TrackOps is a local orchestration and operational automation system for projects and AI-agent development.

It prepares the agent, separates product from operations, and decides when onboarding should stay in the terminal versus when it should move into an agent-led conversation.

### 2. Global install

Primary entry point:

```bash
npx skills add Baxahaun/trackops
```

First real use ensures the runtime with:

```bash
node scripts/bootstrap-trackops.js
```

### 3. Local activation

Inside a repository:

```bash
trackops init
trackops opera install
```

### 4. What TrackOps creates

Modern layout:

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

With OPERA installed:

```text
ops/genesis.md
ops/contract/operating-contract.json
ops/policy/autonomy.json
ops/bootstrap/
ops/.agent/hub/agent.md
ops/.agent/hub/router.md
ops/.agents/skills/_registry.md
ops/.agents/skills/project-starter-skill/
```

### 5. Two onboarding paths

TrackOps always starts by classifying:

- user technical level
- current project state
- available documentation

#### Path A — Early idea or non-technical user

If the project is still an idea, the user is non-technical, or documentation is weak:

- TrackOps stops asking architecture questions in the terminal
- it writes a handoff in `ops/bootstrap/agent-handoff.md`
- the agent must produce:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` when major gaps remain
- then you resume with:

```bash
trackops opera bootstrap --resume
```

#### Path B — Existing repo or technical user

If the user is technical and the project already has enough context:

- OPERA continues through direct bootstrap
- compiles the operating contract
- updates `ops/contract/operating-contract.json`
- recompiles `ops/genesis.md`

### 6. Using the handoff

```bash
trackops opera handoff --print
trackops opera handoff --json
trackops opera bootstrap --resume
```

### 7. What the agent must do

With `project-starter-skill`, the agent must:

- adapt language to the user's technical level
- read and consolidate existing documentation
- build a first workable specification if none exists
- not rerun `trackops init`
- not recreate the workspace
- write:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` when uncertainty remains

### 8. Environment and secrets

TrackOps manages:

- `/.env`
- `/.env.example`
- `app/.env`

Use:

```bash
trackops env status
trackops env sync
```

### 8.1 Language

TrackOps can keep one global language and also override it per project.

```bash
trackops locale get
trackops locale set en
trackops doctor locale
```

### 9. Daily workflow

```bash
trackops status
trackops next
trackops task start <id>
trackops task review <id>
trackops task complete <id>
trackops sync
trackops dashboard
```

### 10. Release

Before publishing:

```bash
trackops workspace status
trackops env status
npm run skill:validate
npm run skill:smoke
npm run release:check
```

`trackops release` publishes only `app/`. It never publishes `/.env`, `ops/`, or `.trackops-workspace.json`.

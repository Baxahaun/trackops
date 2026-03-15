# TrackOps User Guide

<p align="center">
  <a href="#espanol">Espanol</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>
</p>

---

## Espanol

### 1. Que es TrackOps hoy

TrackOps es un sistema local de orquestacion y automatizacion operativa para proyectos y desarrollo asistido por agentes IA.

No solo organiza tareas. Tambien:

- prepara al agente
- separa producto y operacion
- decide cuando el arranque debe pasar por el agente y cuando puede seguir por terminal

### 2. Instalacion global

La entrada principal es la skill global:

```bash
npx skills add Baxahaun/trackops
```

Despues instala el runtime de forma explicita:

```bash
npm install -g trackops
trackops --version
```

Esta separacion es intencional:

- la skill queda auditable como capa de instrucciones
- la instalacion del runtime queda visible y controlada por el usuario
- no hay bootstrap remoto ejecutado desde la propia skill

Si el `postinstall` global no te pregunta idioma, fijalo manualmente:

```bash
trackops locale set es
trackops locale set en
```

### 3. Activacion local

Cuando quieres gestionar un repo:

```bash
trackops init
trackops opera install
```

`trackops init` activa el orquestador local.

`trackops opera install` anade OPERA cuando quieres el framework completo.

### 3.1 Flujo completo sin huecos

Este es el recorrido lineal recomendado:

```bash
npx skills add Baxahaun/trackops --skill trackops --agent "*" --global -y
npm install -g trackops@latest
trackops --version
cd ruta/a/tu/proyecto
trackops init
trackops opera install
```

Durante `trackops init`, si no pasas `--locale`, TrackOps debe ofrecer el idioma del proyecto.

Durante `trackops opera install`, responde asi:

- nivel tecnico:
  `low|medium|high|senior`
  tambien acepta `bajo|medio|alto`
- estado del proyecto:
  `idea|draft|existing_repo|advanced`
- documentacion:
  `none|notes|sos|spec_dossier|repo_docs`
- decisiones:
  `user|shared|agent`
  tambien acepta `usuario|compartido|agente`

### 3.2 Como desinstalarlo

#### Desinstalacion global

Quita la skill global:

```bash
npx skills remove --global trackops -y
```

Quita el runtime global:

```bash
npm uninstall -g trackops
```

Comprueba que ya no queden restos:

```bash
npx skills ls -g
trackops --version
```

#### Desinstalacion local

No existe aun un comando `trackops uninstall` para el repo.

Si quieres retirar TrackOps de un proyecto, hazlo manualmente revisando:

- `.trackops-workspace.json`
- `ops/`
- `app/.env` si solo era el bridge de compatibilidad

No borres automaticamente `/.env` ni `/.env.example` sin revisarlos primero, porque pueden seguir formando parte del proyecto aunque dejes de usar TrackOps.

### 4. Que crea TrackOps

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

Si instalas OPERA, ademas tendras:

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

TrackOps empieza preguntando:

- nivel tecnico del usuario
- estado actual del proyecto
- documentacion disponible

Con eso decide el camino.

#### Camino A - Idea inicial o usuario no tecnico

Si el usuario tiene una idea difusa, es poco tecnico, o no hay documentacion suficiente:

- TrackOps no sigue con preguntas tecnicas en terminal
- crea un handoff en `ops/bootstrap/agent-handoff.md`
- el agente usa ese handoff para hacer discovery y estructuracion
- el agente debe generar:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` si todavia quedan preguntas abiertas

Despues reanudas con:

```bash
trackops opera bootstrap --resume
```

#### Camino B - Repo existente o usuario tecnico

Si el usuario es tecnico y el proyecto ya tiene suficiente contexto:

- OPERA sigue por bootstrap directo
- compila el contrato operativo
- actualiza `ops/contract/operating-contract.json`
- recompila `ops/genesis.md`

Puedes forzar el camino:

```bash
trackops opera install --bootstrap-mode handoff
trackops opera install --bootstrap-mode direct
```

Y tambien pasar el perfil por flags:

```bash
trackops opera install --technical-level low --project-state idea --docs-state none
trackops opera install --technical-level senior --project-state existing_repo --docs-state repo_docs
```

### 6. Como usar el handoff

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

Despues del handoff, la terminal debe decirte explicitamente que ese es el siguiente paso.

### 7. Que debe hacer el agente

El agente, usando `project-starter-skill`, debe:

- adaptar el lenguaje al nivel tecnico del usuario
- leer y consolidar documentacion si existe
- construir una primera especificacion si no existe
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
  contrato publico
- `app/.env`
  puente de compatibilidad

Comandos:

```bash
trackops env status
trackops env sync
```

`env status` solo muestra nombres de claves, nunca valores.

### 8.1 Idioma

TrackOps puede guardar un idioma global y tambien fijar uno por proyecto.

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

**Por que la skill y el runtime se instalan por separado?**  
Porque la skill debe mantenerse auditable como capa de instrucciones y el runtime debe instalarse con un paso npm visible y verificable.

**La skill global activa todos mis repos?**  
No. La skill global prepara al agente, pero cada repo se activa de forma explicita con `trackops init`.

**OPERA siempre pregunta cosas tecnicas por terminal?**  
No. Si falta contexto o el usuario no es tecnico, deriva el arranque al agente.

**Puedo trabajar en espanol o en ingles?**  
Si. TrackOps y OPERA pueden guardar un idioma global y tambien fijar uno por proyecto.

**Donde vive el handoff?**  
En `ops/bootstrap/agent-handoff.md` y `ops/bootstrap/agent-handoff.json`.

**Donde queda el estado operativo real?**  
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

Then install the runtime explicitly:

```bash
npm install -g trackops
trackops --version
```

This split is intentional:

- the skill stays auditable as an instruction layer
- runtime installation stays visible and user-controlled
- there is no remote bootstrap executed from the skill itself

If global `postinstall` does not ask for the language, set it manually:

```bash
trackops locale set es
trackops locale set en
```

### 3. Local activation

Inside a repository:

```bash
trackops init
trackops opera install
```

### 3.1 Full flow without gaps

This is the recommended linear path:

```bash
npx skills add Baxahaun/trackops --skill trackops --agent "*" --global -y
npm install -g trackops@latest
trackops --version
cd path/to/your/project
trackops init
trackops opera install
```

During `trackops init`, if you do not pass `--locale`, TrackOps should offer the project language.

During `trackops opera install`, answer like this:

- technical level:
  `low|medium|high|senior`
- project state:
  `idea|draft|existing_repo|advanced`
- documentation:
  `none|notes|sos|spec_dossier|repo_docs`
- decisions:
  `user|shared|agent`

### 3.2 How to uninstall it

#### Global uninstall

Remove the global skill:

```bash
npx skills remove --global trackops -y
```

Remove the global runtime:

```bash
npm uninstall -g trackops
```

Check that nothing is left:

```bash
npx skills ls -g
trackops --version
```

#### Local uninstall

There is no `trackops uninstall` command for the repository yet.

If you want to remove TrackOps from a project, do it manually by reviewing:

- `.trackops-workspace.json`
- `ops/`
- `app/.env` if it was only the compatibility bridge

Do not automatically delete `/.env` or `/.env.example` without reviewing them first, because the project may still depend on them even if you stop using TrackOps.

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

#### Path A - Early idea or non-technical user

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

#### Path B - Existing repo or technical user

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

### FAQ

**Why are the skill and the runtime installed separately?**  
Because the skill should remain auditable as an instruction layer, while the runtime should be installed through a visible and verifiable npm step.

**Does the global skill activate all repositories?**  
No. The global skill prepares the agent, but each repository is activated explicitly with `trackops init`.

**How do I uninstall TrackOps?**  
Globally, remove the skill with `npx skills remove --global trackops -y` and the runtime with `npm uninstall -g trackops`. Inside a repository, local removal is still manual.

**Does OPERA always ask technical questions in the terminal?**  
No. If context is weak or the user is non-technical, it routes onboarding to the agent.

**Can I work in Spanish or English?**  
Yes. TrackOps and OPERA can store one global language and also override it per project.

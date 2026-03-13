# TrackOps User Guide

<p align="center">
  <a href="#español">Español</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="#english">English</a>
</p>

---

## Español

### Modelo operativo

TrackOps ahora se usa con dos capas separadas:

1. `global`
   la skill `trackops` instalada desde `skills.sh`
2. `local por proyecto`
   la activación explícita del repo con `trackops init` y, si se quiere, `trackops opera install`

La skill global no debe crear archivos dentro de repos arbitrarios. Solo deja preparada la capacidad en la máquina.

### 1. Instalar la skill global

La skill canónica está en [skills/trackops](./skills/trackops).

Instálala desde `skills.sh` usando el comando de instalación desde GitHub que soporte tu plataforma y apuntando a:

- repo: `Baxahaun/trackops`
- ruta de skill: `skills/trackops`

Soporte oficial v1:

- `skills.sh`
- `Codex`
- `Claude Code`
- `Cursor`

### 2. Primer uso: bootstrap del runtime

La skill global asegura el runtime npm cuando se usa por primera vez:

```bash
node scripts/bootstrap-trackops.js
```

Ese bootstrap:

- valida `Node.js >= 18`
- valida `npm`
- instala o actualiza `trackops`
- verifica el comando
- escribe `~/.trackops/runtime.json`

Si necesitas revisar el contrato exacto, mira [skills/trackops/skill.json](./skills/trackops/skill.json).

### 3. Activación local del proyecto

Dentro de un repo concreto:

```bash
trackops init
trackops opera install
```

Interpretación oficial:

- `trackops init`
  instala el orquestador local
- `trackops opera install`
  instala OPERA sobre un proyecto ya inicializado
- `trackops init --with-opera`
  sigue disponible como atajo

La instalación global no autoriza a TrackOps a tocar repos sin una orden local explícita.

### 4. Qué crea `trackops init`

```text
project_control.json
task_plan.md
progress.md
findings.md
.githooks/
.tmp/
```

Además añade scripts `ops:*` a `package.json`.

### 5. Qué añade `trackops opera install`

```text
genesis.md
.agent/hub/agent.md
.agent/hub/router.md
.agents/skills/_registry.md
```

Y registra OPERA en `project_control.json`.

### 6. Flujo diario

```bash
trackops status
trackops next
trackops task start ops-bootstrap
trackops sync
```

Reglas clave:

- `project_control.json` es la fuente de verdad
- no edites a mano `task_plan.md`, `progress.md` ni `findings.md`
- usa `trackops sync` para regenerarlos

### 7. Dashboard

```bash
trackops dashboard
```

Comportamiento:

- intenta `4173` primero
- si está ocupado, busca el siguiente puerto libre
- acepta `--port`, `--host`, `--public`, `--strict-port`
- copia la URL local al portapapeles cuando puede
- muestra URL de red cuando lo expones fuera de localhost

### 8. Skills del proyecto vs skill global

Hay dos conceptos distintos:

- skill global `trackops`
  vive en `skills.sh` y prepara la máquina
- `trackops skill ...`
  gestiona skills nativas del proyecto dentro de `.agents/skills/`

Ejemplos:

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
```

### 9. CLI

#### Core

```bash
trackops init [--with-opera] [--locale es|en] [--name "..."] [--no-bootstrap]
trackops status
trackops next
trackops sync
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

### 10. Release y mantenimiento

```bash
npm run skill:sync-version
npm run skill:validate
npm run release:check
```

`skill:sync-version` mantiene alineado [skills/trackops/skill.json](./skills/trackops/skill.json) con `package.json`.

### FAQ

**¿La skill global instala OPERA en todos mis proyectos?**  
No. Solo prepara la máquina y el agente. OPERA se activa repo a repo con `trackops opera install`.

**¿Puedo seguir usando `npx trackops ...` sin `skills.sh`?**  
Sí. La skill global es el camino recomendado para agentes, no un reemplazo obligatorio del paquete npm.

**¿Dónde queda el estado global de la skill?**  
En `~/.trackops/runtime.json`.

**¿Dónde queda el estado local del proyecto?**  
En `project_control.json`.

---

## English

### Operating model

TrackOps now works with two clearly separated layers:

1. `global`
   the `trackops` skill installed from `skills.sh`
2. `local per project`
   explicit repo activation with `trackops init` and, optionally, `trackops opera install`

The global skill must not create files inside arbitrary repositories. It only prepares the capability on the machine.

### 1. Install the global skill

The canonical skill lives in [skills/trackops](./skills/trackops).

Install it from `skills.sh` using your platform's GitHub install command and target:

- repo: `Baxahaun/trackops`
- skill path: `skills/trackops`

Official v1 support:

- `skills.sh`
- `Codex`
- `Claude Code`
- `Cursor`

### 2. First use: bootstrap the runtime

The global skill ensures the npm runtime on first use:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap:

- validates `Node.js >= 18`
- validates `npm`
- installs or updates `trackops`
- verifies the command
- writes `~/.trackops/runtime.json`

If you need the pinned contract, see [skills/trackops/skill.json](./skills/trackops/skill.json).

### 3. Local project activation

Inside a specific repository:

```bash
trackops init
trackops opera install
```

Official interpretation:

- `trackops init`
  installs the local orchestrator
- `trackops opera install`
  installs OPERA on top of an initialized project
- `trackops init --with-opera`
  remains available as a shortcut

The global install does not give TrackOps permission to mutate repositories without an explicit local command.

### 4. What `trackops init` creates

```text
project_control.json
task_plan.md
progress.md
findings.md
.githooks/
.tmp/
```

It also adds the `ops:*` scripts to `package.json`.

### 5. What `trackops opera install` adds

```text
genesis.md
.agent/hub/agent.md
.agent/hub/router.md
.agents/skills/_registry.md
```

And it records OPERA inside `project_control.json`.

### 6. Daily flow

```bash
trackops status
trackops next
trackops task start ops-bootstrap
trackops sync
```

Key rules:

- `project_control.json` is the source of truth
- do not hand-edit `task_plan.md`, `progress.md`, or `findings.md`
- use `trackops sync` to regenerate them

### 7. Dashboard

```bash
trackops dashboard
```

Behavior:

- tries `4173` first
- falls forward to the next free port when needed
- accepts `--port`, `--host`, `--public`, `--strict-port`
- copies the local URL to the clipboard when possible
- shows a network URL when exposed outside localhost

### 8. Project skills vs the global skill

There are two different concepts:

- global `trackops` skill
  lives in `skills.sh` and prepares the machine
- `trackops skill ...`
  manages project-native skills inside `.agents/skills/`

Examples:

```bash
trackops skill catalog
trackops skill install commiter
trackops skill list
```

### 9. CLI

#### Core

```bash
trackops init [--with-opera] [--locale es|en] [--name "..."] [--no-bootstrap]
trackops status
trackops next
trackops sync
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

### 10. Release and maintenance

```bash
npm run skill:sync-version
npm run skill:validate
npm run release:check
```

`skill:sync-version` keeps [skills/trackops/skill.json](./skills/trackops/skill.json) aligned with `package.json`.

### FAQ

**Does the global skill install OPERA into all my projects?**  
No. It only prepares the machine and the agent. OPERA is activated repo by repo with `trackops opera install`.

**Can I still use `npx trackops ...` without `skills.sh`?**  
Yes. The global skill is the recommended path for agents, not a mandatory replacement for the npm package.

**Where is the global skill state stored?**  
In `~/.trackops/runtime.json`.

**Where is the local project state stored?**  
In `project_control.json`.

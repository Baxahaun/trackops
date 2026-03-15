---
name: "trackops"
description: "Global TrackOps skill for explaining what TrackOps does, requiring explicit npm runtime installation, and guiding local project and OPERA activation inside each repository."
---

# TrackOps

Use this localized file when the conversation and project should run in English.

TrackOps is for working with agents on real projects without mixing the product itself with the operational layer.

Use this skill when someone:

- wants to start a project with AI agents
- already has a repository and needs operational structure
- needs to activate TrackOps and, if needed, OPERA
- wants the same workflow in English or Spanish

## What this skill does

This skill:

- explains what TrackOps is and when to use it
- requires an explicit and visible runtime installation
- guides per-repository activation
- helps route OPERA into either `direct bootstrap` or `agent handoff`

## What this skill does not do

This skill does not:

- install packages by itself
- execute remote code silently
- modify a repository before the runtime exists
- replace the `trackops` runtime

## Quick flow

Install the marketplace skill with:

```bash
npx skills add Baxahaun/trackops
```

Then confirm that the `trackops` runtime exists. If it is missing, ask the user to install it explicitly:

```bash
npm install -g trackops
trackops --version
```

Rules:

- the skill must not install packages or execute remote code by itself
- the runtime is installed through a visible and auditable npm step
- the skill may verify `trackops --version`, but it must not chain silent installs
- the skill must not create repository files by itself

## Project activation

Inside the repository:

```bash
trackops init
trackops opera install
```

Core rules:

- treat the global skill as an instruction layer
- treat runtime installation as explicit and separate
- use `ops/contract/operating-contract.json` as the machine contract when it exists
- use `ops/project_control.json` as the operational source of truth
- use `ops/policy/autonomy.json` before approval-sensitive actions
- use `/.env` and `/.env.example` as the environment contract
- keep generated operational docs under `ops/`
- use `trackops locale get|set` and `trackops doctor locale` when language matters

## How OPERA enters the flow

OPERA no longer assumes every user is technical.

TrackOps classifies:

- user technical level
- current project state
- available documentation

Then it chooses one of two routes:

- `direct bootstrap`
  for technical users and already-defined repositories
- `agent handoff`
  for early ideas, non-technical users, or weak documentation

If TrackOps routes bootstrap to the agent:

- read `ops/bootstrap/agent-handoff.md`
- or print it with `trackops opera handoff --print`
- require these outputs:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` when important gaps remain
- resume with:

```bash
trackops opera bootstrap --resume
```

## What someone arriving from skills.sh should understand

- the global skill installs instructions into the agent
- the runtime is installed separately with npm
- `trackops init` activates the project
- `trackops opera install` adds the full operating framework only when needed
- TrackOps separates product and operations so the repository stays manageable

## Which reference to read and when

- read `locales/en/references/activation.md` only for installation, runtime verification, locale bootstrap, and repository activation
- read `locales/en/references/workflow.md` only when TrackOps is already active and you need day-to-day repository operations
- read `locales/en/references/troubleshooting.md` only when explicit installation, `trackops` detection, resume, or environment contract handling fails

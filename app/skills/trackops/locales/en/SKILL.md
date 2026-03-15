---
name: "trackops"
description: "Global TrackOps skill for preparing the agent, requiring explicit npm runtime installation, and guiding local TrackOps and OPERA activation inside each repository."
---

# TrackOps

Use this localized file when the conversation and project should run in English.

## Global layer

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

## Local project layer

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

## OPERA onboarding

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

## Which reference to read and when

- read `locales/en/references/activation.md` only for installation, runtime verification, locale bootstrap, and repository activation
- read `locales/en/references/workflow.md` only when TrackOps is already active and you need day-to-day repository operations
- read `locales/en/references/troubleshooting.md` only when explicit installation, `trackops` detection, resume, or environment contract handling fails

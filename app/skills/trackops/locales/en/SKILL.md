---
name: "trackops"
description: "Global TrackOps skill for installing and activating local project orchestration with OPERA, environment management, and agent handoff. Use it when the user wants to install TrackOps from skills.sh, bootstrap the runtime with `node scripts/bootstrap-trackops.js`, run `trackops init`, run `trackops opera install`, inspect `trackops opera handoff`, or work through the operational flow of a repository."
---

# TrackOps

Use this localized file when the conversation and project should run in English.

## Global layer

Install the marketplace skill with:

```bash
npx skills add Baxahaun/trackops
```

Before relying on the CLI, run the bundled skill script:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap:

- ensures the npm `trackops` runtime
- verifies that the global binary can be executed
- records state in `~/.trackops/runtime.json`

It must not create repository files on its own.

## Local project layer

Inside the repository:

```bash
trackops init
trackops opera install
```

Core rules:

- treat the global install as non-invasive
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

- read `locales/en/references/activation.md` only for installation, first use, locale bootstrap, and repository activation
- read `locales/en/references/workflow.md` only when TrackOps is already active and you need day-to-day repository operations
- read `locales/en/references/troubleshooting.md` only when installation, bootstrap, resume, or environment contract handling fails

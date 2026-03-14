---
name: "trackops"
description: "Global TrackOps skill that prepares your agent for local project orchestration and operational automation, ensures the runtime on first use, and guides per-project activation with optional OPERA."
metadata:
  version: "2.0.0"
  type: "global"
  triggers:
    - "install trackops"
    - "skills.sh"
    - "trackops init"
    - "trackops opera install"
    - "opera handoff"
---

# TrackOps

Use this skill in two layers.

## 1. Global skill layer

Install it with:

```bash
npx skills add Baxahaun/trackops
```

Before relying on the CLI, run:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap ensures the `trackops` runtime and records state in `~/.trackops/runtime.json`.

## 2. Local project layer

Inside a repository:

```bash
trackops init
trackops opera install
```

Core rules:

- treat the global skill install as non-invasive
- use `ops/contract/operating-contract.json` as the machine contract when it exists
- use `ops/project_control.json` as the operational source of truth for backlog and state
- use `ops/policy/autonomy.json` before approval-sensitive actions
- use `/.env` and `/.env.example` as the environment contract
- keep generated operational docs under `ops/`
- support `trackops locale get|set` and `trackops doctor locale` when language matters

## OPERA onboarding

OPERA no longer assumes every user is technical.

When OPERA starts, TrackOps classifies:

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
- the agent must produce:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` when important gaps remain
- then resume with:

```bash
trackops opera bootstrap --resume
```

Read references only when needed:

- `references/activation.md`
- `references/workflow.md`
- `references/troubleshooting.md`

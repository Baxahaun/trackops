---
name: "project-starter-skill"
description: "Global skill to initialize complete projects using the O.P.E.R.A. protocol. Use it when the user wants to start a new project, scaffold a repo, initialize an agent structure, or kick off a new automation."
metadata:
  version: "3.0"
  type: "global"
---

# Project Starter Skill

You are the system pilot. Your job is to initialize deterministic, recoverable projects under the O.P.E.R.A. protocol.

## Protocol

1. Ask discovery questions about the desired outcome, integrations, source of truth, payload, and behavior rules.
2. Run `npx trackops init --with-opera`.
3. Populate `genesis.md` with schemas, constraints, and invariants.
4. Regenerate docs with `trackops sync` and refine the plan.
5. Ensure base skills are present: `commiter` and `changelog-updater`.
6. Suggest optional repo governance tasks if needed.

## Rule

Do not write delivery code before the data contract exists in `genesis.md`.

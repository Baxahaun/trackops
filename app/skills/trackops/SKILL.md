---
name: "trackops"
description: "Global TrackOps skill that prepares your agent for local project orchestration and operational automation, ensures the runtime on first use, and guides per-project activation with optional OPERA."
metadata:
  version: "1.1.0"
  type: "global"
  triggers:
    - "install trackops"
    - "skills.sh"
    - "bootstrap trackops"
    - "trackops init"
    - "trackops opera install"
---

# TrackOps

Use this skill in two layers:

1. Global skill layer
   Install it with:

   ```bash
   npx skills add Baxahaun/trackops
   ```

   Replace `codex` with any supported target: `antigravity`, `claude-code`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, or `kiro-cli`.

   Before relying on the CLI, run:

   ```bash
   node scripts/bootstrap-trackops.js
   ```

2. Local project layer
   Activate TrackOps inside the current repository with:

   ```bash
   trackops init
   ```

   Add OPERA only when explicitly requested:

   ```bash
   trackops opera install
   ```

Core rules:

- Treat the global skill install as non-invasive.
- In split workspaces, use `ops/project_control.json` as the operational source of truth.
- In legacy repos, use `project_control.json` at the repository root.
- Prefer `trackops status`, `trackops next`, and `trackops sync` over hand-editing generated docs.
- Treat `trackops init --with-opera` as a shortcut, not as the primary mental model.
- TrackOps manages `/.env` and `/.env.example` at workspace root. Do not print or persist secret values.
- Remember that skills installs from committed Git state.

Read references only when needed:

- `references/activation.md`
  for install and activation flow
- `references/workflow.md`
  for day-to-day repo operation
- `references/troubleshooting.md`
  for bootstrap or environment issues

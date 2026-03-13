---
name: "trackops"
description: "Global TrackOps operating skill for coding agents. Use when the user wants to install TrackOps through skills.sh, bootstrap the TrackOps runtime on a machine, activate TrackOps in a repository with trackops init, add OPERA with trackops opera install, or operate inside an existing TrackOps-managed repository."
metadata:
  version: "1.0.1"
  type: "global"
  triggers:
    - "install trackops"
    - "skills.sh"
    - "bootstrap trackops"
    - "trackops init"
    - "trackops opera install"
---

# TrackOps

Run this skill in two clearly separated layers:

1. Global skill layer:
   Install from the repository root with:

   ```bash
   npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
   ```

   Replace `codex` with any supported skills.sh agent: `antigravity`, `claude-code`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, or `kiro-cli`.

   Run `node scripts/bootstrap-trackops.js` before relying on the `trackops` CLI.
   This step installs or updates the TrackOps npm runtime for the current machine.

2. Local project layer:
   Use `trackops init` to activate the TrackOps orchestrator inside the current repo.
   Use `trackops opera install` only when the user explicitly wants the OPERA framework added to that repo.

Core operating rules:

- Treat the global skill install as non-invasive. Do not create project files during global setup.
- In split workspaces, treat `ops/project_control.json` as the operational source of truth. In legacy repos, the source remains `project_control.json` at the repository root.
- Prefer `trackops status`, `trackops next`, and `trackops sync` over editing generated operational docs by hand.
- Use `trackops init --with-opera` only as an explicit convenience shortcut. The primary mental model stays `init` first, `opera install` second.
- Preserve the project's chosen locale and workflow. The skill is global; activation remains per project.
- TrackOps now manages a canonical workspace `.env` and `.env.example` at the workspace root. Do not print or persist secret values.
- Remember that skills.sh installs from committed Git state. Push the repository before expecting the marketplace install command to pick up new skill changes.

Read references only when needed:

- For local project activation and repo-state decisions, read `references/activation.md`.
- For day-to-day operating behavior once a repo is managed, read `references/workflow.md`.
- For bootstrap or npm install failures, read `references/troubleshooting.md`.

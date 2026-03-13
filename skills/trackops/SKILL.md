---
name: trackops
description: Global TrackOps operating skill for coding agents. Use when a user wants to install TrackOps as a machine-wide capability, activate TrackOps inside a specific repository, run OPERA on top of an initialized project, or operate on an existing TrackOps-managed repo. On first use, ensure the runtime is installed or updated by running `node scripts/bootstrap-trackops.js`. Then use `trackops init` for local orchestrator activation and `trackops opera install` for explicit OPERA activation.
---

# TrackOps

Run this skill in two clearly separated layers:

1. Global skill layer:
   Run `node scripts/bootstrap-trackops.js` before relying on the `trackops` CLI.
   This step installs or updates the TrackOps npm runtime for the current machine.

2. Local project layer:
   Use `trackops init` to activate the TrackOps orchestrator inside the current repo.
   Use `trackops opera install` only when the user explicitly wants the OPERA framework added to that repo.

Core operating rules:

- Treat the global skill install as non-invasive. Do not create project files during global setup.
- Treat `project_control.json` as the operational source of truth once TrackOps is active in a repo.
- Prefer `trackops status`, `trackops next`, and `trackops sync` over editing generated operational docs by hand.
- Use `trackops init --with-opera` only as an explicit convenience shortcut. The primary mental model stays `init` first, `opera install` second.
- Preserve the project's chosen locale and workflow. The skill is global; activation remains per project.

Read references only when needed:

- For local project activation and repo-state decisions, read `references/activation.md`.
- For day-to-day operating behavior once a repo is managed, read `references/workflow.md`.
- For bootstrap or npm install failures, read `references/troubleshooting.md`.

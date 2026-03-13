# Activation

## Global install

The marketplace skill only makes TrackOps available to the agent globally.
It must not create repo files on its own.

Before using TrackOps commands, run:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap verifies Node and npm, installs the pinned TrackOps runtime, and records the verified runtime stamp in `~/.trackops/runtime.json`.

## Local project activation

Inside a repository:

```bash
trackops init
trackops opera install
```

Rules:

- Use `trackops init` when the repo does not yet contain `project_control.json`.
- Use `trackops opera install` only after `trackops init` when the user explicitly wants OPERA.
- Use `trackops init --with-opera` only when the user asks for a combined setup.
- Never infer that a global skill install authorizes local repo mutations by default.

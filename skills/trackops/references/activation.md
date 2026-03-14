# Activation

## Global install

The marketplace skill prepares TrackOps globally for the agent. It must not create repo files by itself.

Install it with:

```bash
npx skills add Baxahaun/trackops
```

Replace `codex` with any supported target: `antigravity`, `claude-code`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, or `kiro-cli`.

Before using TrackOps commands, run:

```bash
node scripts/bootstrap-trackops.js
```

That bootstrap validates prerequisites, installs or updates the TrackOps runtime, and records state in `~/.trackops/runtime.json`.

## Local activation

Inside a repository, the normal flow is:

```bash
trackops init
trackops opera install
```

Rules:

- Use `trackops init` when the repo is not yet managed by TrackOps.
- By default, `trackops init` creates a split workspace with `app/`, `ops/`, `/.env`, `/.env.example`, and `.trackops-workspace.json`.
- Use `trackops opera install` only after `trackops init` and only when the user wants OPERA.
- Use `trackops init --with-opera` only as an explicit shortcut.
- Use `trackops init --legacy-layout` only for compatibility with the old single-root layout.
- Never assume that a global skill install authorizes local repo mutations by default.

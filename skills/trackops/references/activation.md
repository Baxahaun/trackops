# Activation

## Global install

The marketplace skill only makes TrackOps available to the agent globally.
It must not create repo files on its own.

Install it from the repository root with:

```bash
npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y
```

Replace `codex` with any supported skills.sh target: `antigravity`, `claude-code`, `codex`, `cursor`, `gemini-cli`, `github-copilot`, or `kiro-cli`.
Remember that skills.sh installs from committed Git state, so new skill changes are not visible until they are pushed.

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

- Use `trackops init` when the repo does not yet contain TrackOps control state.
- By default, `trackops init` creates a split workspace: `app/`, `ops/`, `/.env`, `/.env.example`, and `.trackops-workspace.json`.
- Use `trackops init --legacy-layout` only when the user explicitly wants the old single-root layout.
- Use `trackops opera install` only after `trackops init` when the user explicitly wants OPERA.
- Use `trackops init --with-opera` only when the user asks for a combined setup.
- Never infer that a global skill install authorizes local repo mutations by default.

# Workflow

Once TrackOps is active in a repository, operate in this order:

1. Run `trackops status` to inspect focus, phase, blockers, and repo state.
2. Run `trackops next` to identify the next ready task.
3. Update task state with `trackops task ...` as work progresses.
4. Run `trackops sync` after meaningful changes so generated docs stay aligned.
5. Run `trackops env status` when the project depends on credentials or external services.

Operational rules:

- In split workspaces, use `ops/project_control.json` as the source of truth.
- In legacy repos, use `project_control.json` at repo root.
- In split workspaces, generated operational docs live under `ops/`.
- Product code lives under `app/`.
- Use `/.env` for real secrets and `/.env.example` for the public environment contract.
- `app/.env` is only a compatibility bridge.
- If OPERA is installed, use `ops/genesis.md`, `ops/.agent/hub/`, and `ops/.agents/skills/_registry.md` as managed framework artifacts.
- Keep the global skill layer separate from the local project layer.

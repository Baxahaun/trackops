# Workflow

Once TrackOps is active in a repository, operate with this order:

1. Run `trackops status` to inspect focus, phase, blockers, and repo state.
2. Run `trackops next` to identify the next ready task.
3. Update task state with `trackops task ...` as work progresses.
4. Run `trackops sync` after meaningful changes so generated docs stay aligned.

Operational rules:

- In split workspaces, treat `ops/project_control.json` as the source of truth. In legacy repos, use `project_control.json` at the repo root.
- Do not hand-edit `task_plan.md`, `progress.md`, or `findings.md`.
- In split workspaces, generated operational docs live under `ops/`. Product code lives under `app/`.
- TrackOps-managed secrets live in `/.env`; the public contract lives in `/.env.example`; `app/.env` is only a compatibility bridge.
- If OPERA is installed, use `genesis.md`, `.agent/hub/`, and `.agents/skills/_registry.md` as managed framework artifacts under `ops/` in split layout.
- Keep the global skill layer separate from the local project layer.

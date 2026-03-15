# Workflow

Once TrackOps is active in a repository:

1. Run `trackops status`.
2. Run `trackops next`.
3. Move task state with `trackops task ...`.
4. Run `trackops sync` after meaningful changes.
5. Run `trackops env status` when credentials matter.

Operational rules:

- In split workspaces, use `ops/project_control.json` as the source of truth.
- Generated operational docs live in `ops/`.
- Product code lives in `app/`.
- Real secrets live in `/.env`.
- Public environment contract lives in `/.env.example`.
- `app/.env` is only a compatibility bridge.

If OPERA is installed:

- `ops/contract/operating-contract.json` holds the machine contract.
- `ops/genesis.md` holds the compiled human view.
- `ops/policy/autonomy.json` holds the executable autonomy policy.
- `ops/bootstrap/` holds onboarding artifacts.
- `ops/.agent/hub/` and `ops/.agents/skills/` hold managed agent artifacts.

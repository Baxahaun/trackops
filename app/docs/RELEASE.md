# TrackOps Release Flow

## Repository state

This repository already uses the split layout:

- `app/`
  publishable product
- `ops/`
  local operational layer for the project itself

Working branch: `develop`  
Published branch: `master`

## Versioning rule

Use a new package version only when delivered behavior changes for users.

- `major`
  incompatible changes or manual migrations
- `minor`
  new capabilities without breaking the public contract
- `patch`
  fixes, documentation, copy, or operational adjustments without contract breakage

## Release checklist

Before publishing:

```bash
node app/bin/trackops.js workspace status
node app/bin/trackops.js env status
npm --prefix app run release:check
```

Then verify:

1. `ops/project_control.json` is up to date.
2. `ops/contract/operating-contract.json` matches the current operating contract.
3. `ops/policy/autonomy.json` exists and reflects the current approval policy.
4. `ops/task_plan.md`, `ops/progress.md`, and `ops/findings.md` are synchronized.
5. `app/CHANGELOG.md` reflects the public change.
6. `app/package.json` version matches the intended release scope.
7. The git worktree is clean.

## What `trackops release` publishes

In the split model:

- only `app/` is published
- `.env.example` is included
- `/.env` is never published
- `ops/` is never published
- `.trackops-workspace.json` is never published

## Rule of record

If a change affects installation, commands, onboarding, layout, dashboard behavior, global skill behavior, or OPERA bootstrap semantics, update:

- `app/CHANGELOG.md`
- `app/README.md` and/or `app/UserGUIDE.md`
- `ops/project_control.json` if the operational backlog or findings changed

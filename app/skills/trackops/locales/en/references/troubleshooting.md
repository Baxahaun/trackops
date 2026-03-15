# Troubleshooting

## Missing prerequisites

- Install Node 18+ if Node is missing or too old.
- Install a Node distribution that includes npm if npm is missing.

## The skill is installed, but `trackops` does not start

- Confirm that the global skill exists:
  `npx skills add Baxahaun/trackops`
- Install or reinstall the runtime explicitly:
  `npm install -g trackops`
- Verify:
  `trackops --version`
- If the binary still does not respond:
  - check Node.js (`>= 18`)
  - check that `npm` exists and works
  - check PATH and reopen the terminal

## Explicit runtime installation fails

- Re-run `npm install -g trackops`.
- If `npm` errors, fix that first; the skill cannot continue without the CLI.
- If the issue is global permissions, use the recommended method for your system or a user-controlled npm prefix.

## OPERA routed bootstrap to the agent

This is expected when:

- the user is non-technical
- the project is still in idea stage
- documentation is weak

Use:

```bash
trackops opera handoff --print
trackops opera bootstrap --resume
```

## Resume does not complete

TrackOps will not invent missing context.

Check that both files exist and contain usable data:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`

## Environment looks inconsistent

- Run `trackops env status`.
- Run `trackops env sync`.
- If bridge mode is `copy`, do not edit `app/.env` directly.

## I want to remove TrackOps completely

- Remove the global skill:
  `npx skills remove --global trackops -y`
- Remove the global runtime:
  `npm uninstall -g trackops`
- Inside the repository, local removal is still manual:
  - review `.trackops-workspace.json`
  - review `ops/`
  - review `app/.env` if it was only the bridge
- Do not delete `/.env` or `/.env.example` before checking whether the project still depends on them

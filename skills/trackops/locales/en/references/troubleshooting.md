# Troubleshooting

## Missing prerequisites

- Install Node 18+ if Node is missing or too old.
- Install a Node distribution that includes npm if npm is missing.

## Global install command failed

- Install from committed GitHub state:
  `npx skills add Baxahaun/trackops`
- Then ensure the local runtime with:
  `node scripts/bootstrap-trackops.js`
- If the install succeeded but the CLI still looks unavailable, confirm that `~/.trackops/runtime.json` exists.

## Runtime bootstrap failed

- Re-run `node scripts/bootstrap-trackops.js`.
- If npm global permissions fail, configure a user-writable npm prefix instead of using `sudo`.

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

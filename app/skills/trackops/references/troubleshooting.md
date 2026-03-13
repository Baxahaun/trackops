# Troubleshooting

## Missing prerequisites

- If Node is missing or older than 18, install Node 18+ first.
- If npm is missing, install a Node distribution that includes npm.

## skills cannot find the TrackOps skill

- Install from the repository root:
  `npx skills add Baxahaun/trackops --skill trackops --full-depth --global --agent codex -y`
- Confirm the remote repository already contains the latest committed skill changes.
- Remember that skills installs from committed Git state, not from uncommitted local changes.

## Global npm install failed

- Re-run `node scripts/bootstrap-trackops.js` and inspect stderr.
- If npm global permissions are blocked, configure a user-writable npm prefix instead of relying on `sudo`.

## Runtime cannot be verified

If installation succeeds but `trackops` is still not executable:

- Check whether the npm global bin directory is on `PATH`.
- Re-open the terminal after updating shell profile settings.
- Re-run `node scripts/bootstrap-trackops.js` once `trackops --version` works.

## Workspace environment looks inconsistent

If a split workspace is active and tools do not see the expected environment file:

- Run `trackops env status` to inspect required, present, and missing keys without exposing values.
- Run `trackops env sync` to recreate `/.env`, `/.env.example`, and the `app/.env` bridge.
- If bridge mode is `copy`, do not edit `app/.env` directly; TrackOps regenerates it from the root `.env`.

# Troubleshooting

## Missing prerequisites

- If Node is missing or older than 18, install Node 18+ first.
- If npm is missing, install a Node distribution that includes npm.

## Global npm install failed

- Re-run `node scripts/bootstrap-trackops.js` and inspect stderr.
- If npm global permissions are blocked, configure a user-writable npm prefix instead of using `sudo` automatically.

## Runtime cannot be verified

If installation succeeds but `trackops` still is not executable:

- Check whether the npm global bin directory is on `PATH`.
- Re-open the terminal after updating shell profile settings.
- Re-run `node scripts/bootstrap-trackops.js` once `trackops --version` works.

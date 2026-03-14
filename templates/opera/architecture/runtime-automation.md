# SOP - Runtime Automation

## Objective

Keep validation automatic on every relevant change.

## Trigger policy

- Validate on push to `develop` and `master`.
- Validate on pull requests targeting `develop` or `master`.
- Allow manual execution with workflow dispatch.

## Validation circuit

1. Install Node 18 and 20.
2. Install runtime dependencies.
3. Run `npm run release:check`.
4. Fail fast on any smoke, skill or packaging regression.

## Release hygiene

- Do not publish if `release:check` fails.
- Do not treat local runtime state as deployable proof.
- Re-run smoke after structural or locale changes.

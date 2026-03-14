# SOP - Runtime Operations

## Purpose

Define the minimum operating procedure to keep a TrackOps + OPERA workspace healthy.

## Inputs

- `ops/project_control.json`
- `ops/contract/operating-contract.json`
- `ops/policy/autonomy.json`
- `ops/bootstrap/quality-report.json`

## Core checks

1. Run `trackops status`.
2. Run `trackops opera status`.
3. Run `trackops env status`.
4. Confirm `contract readiness` is not `hypothesis` for active delivery work.
5. Confirm `legacyStatus` is `supported`.

## Recovery path

1. If bootstrap is incomplete, run `trackops opera handoff --print`.
2. If discovery artifacts already exist, run `trackops opera bootstrap --resume`.
3. If operational docs drift, run `trackops sync`.
4. If managed artifacts drift, run `trackops opera upgrade --stable`.

## Exit criteria

- Runtime status is readable.
- OPERA status is readable.
- Contract and policy files exist.
- No critical blocker remains undocumented.

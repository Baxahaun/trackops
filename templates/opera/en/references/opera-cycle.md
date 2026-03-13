# The O.P.E.R.A. Cycle — Complete Reference

This document describes each phase, its rules, its procedures, and its Definition of Done.

---

## O — Orchestrate

Answer the five discovery questions, define the input/output schema in `genesis.md`, document behavior rules, and make sure the plan is approved before moving forward.

### Definition of Done
- [ ] Discovery questions answered.
- [ ] Input/output schema defined in `genesis.md`.
- [ ] Behavior rules documented in `genesis.md`.
- [ ] `task_plan.md` reviewed and accepted.

---

## P — Prove

Validate credentials, run minimal connectivity checks, and confirm that external systems return data that matches the schema in `genesis.md`.

### Definition of Done
- [ ] Required credentials verified.
- [ ] Connectivity tests executed and passing.
- [ ] Response shapes validated against `genesis.md`.
- [ ] Findings documented.

---

## E — Establish

Build the three-layer structure: SOPs in `architecture/`, atomic tools in `tools/`, and explicit dependency flow in `genesis.md`.

### Definition of Done
- [ ] SOPs written.
- [ ] Tools implemented.
- [ ] Dependency graph documented.
- [ ] Integration tests passing.

---

## R — Refine

Validate outputs against templates and ensure delivery formats match the expected payload.

### Definition of Done
- [ ] Outputs validated against templates.
- [ ] Delivery formats reviewed.
- [ ] UI review completed when applicable.

---

## A — Automate

Clean temporary artifacts, configure triggers, deploy the final logic, and run a smoke test in the target environment.

### Definition of Done
- [ ] `.tmp/` cleaned.
- [ ] Deployment completed.
- [ ] Triggers configured.
- [ ] Smoke test passing.

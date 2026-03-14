---
name: "project-starter-skill"
description: "Skill for discovery and early project structuring with TrackOps and OPERA. Use it when an idea, notes, or partial documentation must become a clear project specification, especially for non-technical users or early-stage projects."
metadata:
  version: "4.0"
  type: "global"
---

# Project Starter Skill

Your job is to turn an idea or partial documentation into a structured, explainable project.

## Core rule

Start from the person, not from the architecture.

- identify the user's technical level
- adapt language and depth to that level
- if documentation exists, read it and consolidate it
- if documentation does not exist, build the first useful specification from the idea

## When TrackOps is already installed

If the repository already contains TrackOps or OPERA:

- do not run `trackops init`
- do not recreate `app/`, `ops/`, or the workspace
- use `ops/contract/operating-contract.json` as the machine source of truth when it already exists
- use `ops/genesis.md` as the compiled human view
- use `ops/project_control.json` for backlog and operational state
- work from `ops/bootstrap/agent-handoff.md`
- write:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` when important gaps remain

## What the skill must produce

`ops/bootstrap/intake.json` must include at least:

- `technicalLevel`
- `projectState`
- `documentationState`
- `decisionOwnership`
- `problemStatement`
- `targetUser`
- `singularDesiredOutcome`
- `userLanguage`
- `needsPlainLanguage`
- `recommendedStack`
- `externalServices`
- `sourceOfTruth`
- `payload`
- `behaviorRules`
- `architecturalInvariants`
- `inputSchema`
- `outputSchema`
- `pipeline`
- `templates`

`ops/bootstrap/spec-dossier.md` must explain:

- `## Problem statement`
- `## Target user`
- `## Singular desired outcome`
- `## Delivery target`
- `## Source of truth`
- the main functional flow
- recommended or inherited stack
- external integrations
- relevant constraints

`ops/bootstrap/open-questions.md` must list:

- questions still open
- contradictions between the idea, the repository, and the documents
- decisions that TrackOps or OPERA must not invent

## Minimum quality bar before handing off

Do not treat discovery as complete if any of these are missing:

- problem statement
- target user
- singular desired outcome
- delivery target
- source of truth
- input and output schema, even if still provisional

If something is still uncertain, write it to `open-questions.md` instead of inventing it.

## If TrackOps is not installed yet

Do not invent your own structure.

Explain the correct flow:

```bash
npx skills add Baxahaun/trackops
trackops init
trackops opera install
```

If the user only has an idea, make it explicit that TrackOps can route bootstrap into an agent-led discovery conversation.

---
name: "opera-policy-guard"
description: "Skill for interpreting the OPERA executable policy and deciding which actions require explicit approval."
metadata:
  version: "1.0"
  type: "project"
---

# OPERA Policy Guard

Use this skill before actions with operational risk, external side effects, or destructive changes.

## Primary source

- `ops/policy/autonomy.json`

## You must answer

- whether the action is green, yellow, or red
- whether it requires explicit approval
- what external side effect it causes
- what safe alternative exists if approval is missing

## Rule

If the policy is ambiguous, do not assume permission. Mark the action as blocked until it is clarified.

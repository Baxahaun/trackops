---
name: "opera-contract-auditor"
description: "Skill for auditing the OPERA operating contract, spotting gaps, contradictions, and false precision before execution continues."
metadata:
  version: "1.0"
  type: "project"
---

# OPERA Contract Auditor

Use this skill when `ops/contract/operating-contract.json` already exists or when OPERA has produced `ops/bootstrap/quality-report.json`.

## Goal

Validate whether the operating contract is coherent enough to move from discovery into execution.

## Review these files

- `ops/contract/operating-contract.json`
- `ops/bootstrap/quality-report.json`
- `ops/bootstrap/open-questions.md`
- `ops/genesis.md`

## Minimum checklist

- the problem and target user are defined
- the singular desired outcome is verifiable
- the source of truth is clear
- input and output schema do not contradict each other
- behavior rules are not ambiguous
- external integrations match the contract
- open questions are either explicitly open or clearly resolved

## Expected output

- identify concrete contradictions or gaps
- propose only the corrections that are actually needed
- do not invent unconfirmed business decisions

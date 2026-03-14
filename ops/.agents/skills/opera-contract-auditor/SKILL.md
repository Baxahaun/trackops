---
name: "opera-contract-auditor"
description: "Skill para auditar el contrato operativo de OPERA, detectar huecos, contradicciones y pseudoprecision antes de seguir ejecutando."
metadata:
  version: "1.0"
  type: "project"
---

# OPERA Contract Auditor

Usa esta skill cuando exista `ops/contract/operating-contract.json` o cuando OPERA haya dejado `ops/bootstrap/quality-report.json`.

## Objetivo

Validar si el contrato operativo ya es suficientemente coherente para pasar de discovery a ejecucion.

## Debes revisar

- `ops/contract/operating-contract.json`
- `ops/bootstrap/quality-report.json`
- `ops/bootstrap/open-questions.md`
- `ops/genesis.md`

## Checklist minimo

- el problema y el usuario objetivo estan definidos
- el resultado singular deseado es verificable
- la fuente de verdad esta clara
- input y output schema no se contradicen
- no hay reglas de comportamiento ambiguas
- las integraciones externas son coherentes con el contrato
- las preguntas abiertas siguen abiertas de forma explicita o estan resueltas

## Salida esperada

- identificar contradicciones o lagunas concretas
- proponer solo las correcciones necesarias
- no inventar decisiones de negocio no confirmadas

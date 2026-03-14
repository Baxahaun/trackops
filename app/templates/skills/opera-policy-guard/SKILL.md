---
name: "opera-policy-guard"
description: "Skill para interpretar la politica ejecutable de OPERA y decidir que acciones requieren aprobacion explicita."
metadata:
  version: "1.0"
  type: "project"
---

# OPERA Policy Guard

Usa esta skill cuando vayas a ejecutar acciones con riesgo operativo, efectos externos o cambios destructivos.

## Fuente principal

- `ops/policy/autonomy.json`

## Debes responder

- si la accion es verde, amarilla o roja
- si requiere aprobacion explicita
- que efecto externo produce
- que alternativa segura existe si no hay permiso

## Regla

Si la politica deja dudas, no asumas permiso. Marca la accion como bloqueada hasta aclararlo.

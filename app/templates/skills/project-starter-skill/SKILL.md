---
name: "project-starter-skill"
description: "Skill para discovery y estructuracion inicial de proyectos con TrackOps y OPERA. Usala cuando haya que convertir una idea, notas o documentacion parcial en una especificacion clara, especialmente si el usuario no es tecnico o el proyecto aun esta en fase temprana."
metadata:
  version: "4.0"
  type: "global"
  triggers:
    - "nuevo proyecto"
    - "iniciar proyecto"
    - "project starter"
    - "scaffold"
    - "idea de proyecto"
    - "spec dossier"
---

# Project Starter Skill

Tu trabajo es convertir una idea o una documentacion parcial en un proyecto estructurado y explicable.

## Regla principal

Empieza siempre por la persona, no por la arquitectura.

- identifica el nivel tecnico del usuario
- adapta el lenguaje y la profundidad a ese nivel
- si ya existe documentacion, leela y consolidala
- si no existe documentacion, construye la primera especificacion util desde la idea

## Cuando TrackOps ya esta instalado

Si el repo ya contiene TrackOps u OPERA:

- no ejecutes `trackops init`
- no recrees `app/`, `ops/` ni el resto del workspace
- usa `ops/contract/operating-contract.json` como fuente de verdad de maquina si ya existe
- usa `ops/genesis.md` como vista humana compilada
- usa `ops/project_control.json` para backlog y estado operativo
- trabaja sobre `ops/bootstrap/agent-handoff.md`
- escribe:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` si quedan vacios importantes

## Lo que debe producir la skill

`ops/bootstrap/intake.json` debe dejar, como minimo:

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

`ops/bootstrap/spec-dossier.md` debe explicar:

- `## Problem statement`
- `## Target user`
- `## Singular desired outcome`
- `## Delivery target`
- `## Source of truth`
- flujo funcional principal
- stack recomendado o stack heredado
- integraciones externas
- restricciones relevantes

`ops/bootstrap/open-questions.md` debe listar:

- preguntas que siguen abiertas
- contradicciones entre idea, repo y documentacion
- decisiones que TrackOps u OPERA no deben inventar

## Calidad minima antes de entregar

No des por cerrado el discovery si falta alguno de estos campos:

- problema principal
- usuario objetivo
- resultado singular deseado
- objetivo de entrega
- fuente de verdad
- schema de entrada y salida, aunque sea provisional

Si algo sigue incierto, dejalo en `open-questions.md` en lugar de inventarlo.

## Si TrackOps aun no esta instalado

No improvises una estructura propia.

Explica el flujo correcto:

```bash
npx skills add Baxahaun/trackops
trackops init
trackops opera install
```

Si el usuario solo tiene una idea, deja claro que TrackOps puede derivar el bootstrap a una conversacion guiada con el agente.
- flujo funcional principal
- decisiones de stack, si ya existen o si hay que proponerlas
- integraciones externas
- restricciones relevantes

## Si TrackOps aun no esta instalado

No improvises una estructura propia.

Explica el flujo correcto:

```bash
npx skills add Baxahaun/trackops
trackops init
trackops opera install
```

Si el usuario solo tiene una idea, deja claro que TrackOps puede derivar el bootstrap a una conversacion guiada con el agente.

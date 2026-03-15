---
name: "trackops"
description: "Skill global de TrackOps para instalar y activar la orquestacion local de proyectos con OPERA, entorno y handoff a agentes. Usala cuando el usuario quiera instalar TrackOps desde skills.sh, bootstrapear el runtime con `node scripts/bootstrap-trackops.js`, ejecutar `trackops init`, ejecutar `trackops opera install`, revisar `trackops opera handoff`, o trabajar sobre el flujo operativo de un repositorio."
---

# TrackOps

Si la conversacion y el proyecto deben trabajar en ingles, lee `locales/en/SKILL.md` antes de seguir.

## Capa global

Instala la skill del marketplace con:

```bash
npx skills add Baxahaun/trackops
```

Antes de depender del CLI, ejecuta el script empaquetado de la skill:

```bash
node scripts/bootstrap-trackops.js
```

Ese bootstrap:

- asegura el runtime npm de `trackops`
- valida que el binario global sea ejecutable
- registra estado en `~/.trackops/runtime.json`

No debe crear archivos dentro de un repositorio por si solo.

## Capa local del proyecto

Dentro del repositorio:

```bash
trackops init
trackops opera install
```

Reglas base:

- trata la instalacion global como no invasiva
- usa `ops/contract/operating-contract.json` como contrato de maquina cuando exista
- usa `ops/project_control.json` como fuente de verdad operativa
- usa `ops/policy/autonomy.json` antes de acciones sensibles
- usa `/.env` y `/.env.example` como contrato de entorno
- deja la documentacion operativa generada dentro de `ops/`
- usa `trackops locale get|set` y `trackops doctor locale` cuando el idioma importe

## Onboarding de OPERA

OPERA ya no asume que todo usuario es tecnico.

TrackOps clasifica:

- nivel tecnico del usuario
- estado actual del proyecto
- documentacion disponible

Luego elige una de dos rutas:

- `direct bootstrap`
  para usuarios tecnicos y repos ya definidos
- `agent handoff`
  para ideas tempranas, usuarios no tecnicos o documentacion debil

Si TrackOps deriva al agente:

- lee `ops/bootstrap/agent-handoff.md`
- o imprimelo con `trackops opera handoff --print`
- exige como salida:
  - `ops/bootstrap/intake.json`
  - `ops/bootstrap/spec-dossier.md`
  - `ops/bootstrap/open-questions.md` cuando queden huecos importantes
- reanuda con:

```bash
trackops opera bootstrap --resume
```

## Que referencia leer y cuando

- lee `references/activation.md` solo para instalacion, primer uso, locale bootstrap y activacion de un repo
- lee `references/workflow.md` solo cuando TrackOps ya esta activo y haga falta operar el dia a dia del repositorio
- lee `references/troubleshooting.md` solo cuando fallen la instalacion, el bootstrap, el resume o el contrato de entorno

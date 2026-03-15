---
name: "trackops"
description: "Skill global de TrackOps para preparar al agente, exigir la instalacion explicita del runtime con npm y guiar la activacion local de TrackOps y OPERA dentro de cada repositorio."
---

# TrackOps

Si la conversacion y el proyecto deben trabajar en ingles, lee `locales/en/SKILL.md` antes de seguir.

## Capa global

Instala la skill del marketplace con:

```bash
npx skills add Baxahaun/trackops
```

Despues, confirma que el runtime `trackops` existe. Si no esta disponible, pide al usuario que lo instale de forma explicita:

```bash
npm install -g trackops
trackops --version
```

Reglas:

- la skill no debe instalar paquetes ni ejecutar codigo remoto por si sola
- el runtime se instala con un paso visible y auditable
- la skill puede verificar `trackops --version`, pero no debe encadenar instalaciones silenciosas
- la skill no debe crear archivos dentro de un repositorio por si sola

## Capa local del proyecto

Dentro del repositorio:

```bash
trackops init
trackops opera install
```

Reglas base:

- trata la skill global como capa de instrucciones
- trata la instalacion del runtime como explicita y separada
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

- lee `references/activation.md` solo para instalacion, verificacion del runtime, locale bootstrap y activacion de un repo
- lee `references/workflow.md` solo cuando TrackOps ya esta activo y haga falta operar el dia a dia del repositorio
- lee `references/troubleshooting.md` solo cuando fallen la instalacion explicita, la deteccion de `trackops`, el resume o el contrato de entorno

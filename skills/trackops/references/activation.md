# Activacion

## Instalacion global

```bash
npx skills add Baxahaun/trackops
npm install -g trackops
trackops --version
```

La skill global instala instrucciones para el agente.

El runtime `trackops` se instala aparte con npm para que el paso sea visible, auditable y facil de verificar.

Antes de seguir:

- confirma que `trackops --version` devuelve una version valida
- si no aparece, resuelve PATH o reinstala `trackops`
- la skill no debe intentar instalar el runtime por su cuenta

## Activacion local

Dentro del repo:

```bash
trackops init
trackops opera install
```

Por defecto, `trackops init` crea un workspace split con:

- `app/`
- `ops/`
- `/.env`
- `/.env.example`
- `.trackops-workspace.json`

## Routing de OPERA

OPERA siempre empieza clasificando:

- nivel tecnico
- estado del proyecto
- estado de documentacion

Si el proyecto esta en fase temprana o el usuario es no tecnico, TrackOps escribe:

- `ops/bootstrap/agent-handoff.md`
- `ops/bootstrap/agent-handoff.json`

El agente debe producir:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`
- `ops/bootstrap/open-questions.md` cuando haga falta

Cuando pasa el quality gate, OPERA compila:

- `ops/contract/operating-contract.json`
- `ops/genesis.md`
- `ops/policy/autonomy.json`

Reanuda con:

```bash
trackops opera bootstrap --resume
```

Controles de idioma:

```bash
trackops locale get
trackops locale set es
trackops doctor locale
```

## Desinstalacion

Global:

```bash
npx skills remove --global trackops -y
npm uninstall -g trackops
```

Local:

- no existe todavia `trackops uninstall`
- revisa y elimina manualmente `.trackops-workspace.json`, `ops/` y `app/.env` si solo era bridge
- no borres `/.env` ni `/.env.example` sin revisar si el proyecto sigue necesitandolos

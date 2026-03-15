# Activacion

## Instalacion global

Instala la skill del marketplace:

```bash
npx skills add Baxahaun/trackops
```

En primer uso, asegura el runtime con el script empaquetado de la skill:

```bash
node scripts/bootstrap-trackops.js
```

La skill global no debe crear archivos dentro de repositorios por si sola.

## Activacion local

Dentro de un repositorio:

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
- estado de la documentacion

Si el proyecto aun esta verde o el usuario no es tecnico, TrackOps escribe:

- `ops/bootstrap/agent-handoff.md`
- `ops/bootstrap/agent-handoff.json`

El agente debe producir:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`
- `ops/bootstrap/open-questions.md` cuando haga falta

Cuando el quality gate pasa, OPERA compila:

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
trackops locale set en
trackops doctor locale
```

# TrackOps — Publicacion y Versiones

## Estado del repositorio

Este repositorio ya usa layout split:

- `app/`
  producto publicable
- `ops/`
  capa operativa local del propio proyecto

La rama de trabajo es `develop`.
La rama publicada es `master`.

## Regla de versionado

TrackOps usa una politica simple:

- `major`
  cambios incompatibles o migraciones manuales
- `minor`
  capacidades nuevas compatibles
- `patch`
  correcciones, ajustes de documentacion y mejoras sin ruptura

La version del paquete solo debe cambiar cuando cambia el comportamiento entregado al usuario.

## Flujo de release

Antes de publicar, verifica:

```bash
node app/bin/trackops.js workspace status
node app/bin/trackops.js env status
npm --prefix app run release:check
```

Checklist:

1. Revisa el estado operativo en `ops/project_control.json`.
2. Asegura que `ops/task_plan.md`, `ops/progress.md` y `ops/findings.md` esten sincronizados.
3. Revisa `app/CHANGELOG.md`.
4. Ajusta la version en `app/package.json` solo si el alcance del cambio lo exige.
5. Haz el commit final.
6. Publica con `trackops release` cuando el worktree este limpio.

## Que publica TrackOps

En el modelo split:

- se publica solo el contenido de `app/`
- se incluye `.env.example`
- no se publica `/.env`
- no se publica `ops/`
- no se publica `.trackops-workspace.json`

## Regla de oro

Si el cambio modifica instalacion, comandos, layout, interfaz visible, skill global, dashboard o comportamiento operativo, debe quedar reflejado en:

- `app/CHANGELOG.md`
- `app/README.md` o `app/UserGUIDE.md`
- `ops/project_control.json` si afecta backlog, hallazgos o estado operativo

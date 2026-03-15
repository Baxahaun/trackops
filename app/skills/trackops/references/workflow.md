# Flujo diario

Precondicion:

- la skill global ya esta instalada
- `trackops --version` responde correctamente
- el repo ya fue activado con `trackops init`

Usa TrackOps cuando el repositorio ya esta gestionado y necesites operar el dia a dia.

1. Ejecuta `trackops status`.
2. Ejecuta `trackops next`.
3. Mueve el estado de tareas con `trackops task ...`.
4. Ejecuta `trackops sync` despues de cambios relevantes.
5. Ejecuta `trackops env status` cuando las credenciales importen.

Reglas operativas:

- en workspaces split, usa `ops/project_control.json` como fuente de verdad
- la documentacion operativa generada vive en `ops/`
- el codigo de producto vive en `app/`
- los secretos reales viven en `/.env`
- el contrato publico de entorno vive en `/.env.example`
- `app/.env` solo es un puente de compatibilidad

Si OPERA esta instalado:

- `ops/contract/operating-contract.json` guarda el contrato de maquina
- `ops/genesis.md` guarda la vista humana compilada
- `ops/policy/autonomy.json` guarda la politica ejecutable
- `ops/bootstrap/` guarda artefactos de onboarding
- `ops/.agent/hub/` y `ops/.agents/skills/` guardan artefactos gestionados de agente

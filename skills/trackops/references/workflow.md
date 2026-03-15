# Workflow

Una vez que TrackOps esta activo en un repositorio:

1. Ejecuta `trackops status`.
2. Ejecuta `trackops next`.
3. Mueve el estado de tareas con `trackops task ...`.
4. Ejecuta `trackops sync` tras cambios relevantes.
5. Ejecuta `trackops env status` cuando importen las credenciales.

Reglas operativas:

- En workspaces split, usa `ops/project_control.json` como fuente de verdad.
- La documentacion operativa generada vive en `ops/`.
- El codigo de producto vive en `app/`.
- Los secretos reales viven en `/.env`.
- El contrato publico de entorno vive en `/.env.example`.
- `app/.env` es solo un puente de compatibilidad.

Si OPERA esta instalado:

- `ops/contract/operating-contract.json` contiene el contrato de maquina.
- `ops/genesis.md` contiene la vista humana compilada.
- `ops/policy/autonomy.json` contiene la politica ejecutable.
- `ops/bootstrap/` contiene los artefactos de onboarding.
- `ops/.agent/hub/` y `ops/.agents/skills/` contienen artefactos gestionados de agentes.

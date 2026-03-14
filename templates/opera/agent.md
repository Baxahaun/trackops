# Agente del Proyecto: {{PROJECT_NAME}}

## Identidad
Eres el agente principal del proyecto **{{PROJECT_NAME}}**. Operas bajo el protocolo O.P.E.R.A. v3.0.

## Fuente de Verdad
Tu fuente de verdad de maquina es `ops/contract/operating-contract.json`.
Tu vista humana compilada es `ops/genesis.md`.
Para el seguimiento operativo y el estado del backlog, usa `ops/project_control.json`.

## Comportamiento
- Sigue las reglas definidas en `ops/contract/operating-contract.json` y reflejadas en `ops/genesis.md`.
- Respeta `ops/policy/autonomy.json` para determinar qué acciones puedes tomar sin aprobacion.
- Gestiona tareas y estados desde `ops/project_control.json`.
- No edites manualmente `ops/task_plan.md`, `ops/progress.md` ni `ops/findings.md`; se regeneran con `trackops sync`.

## Skills Disponibles
Consulta `ops/.agents/skills/_registry.md` para ver las skills instaladas.
También puedes buscar nuevas skills con `trackops skill catalog`.

## Ciclo de Trabajo
1. Ejecuta `trackops status` al inicio de cada bloque de trabajo.
2. Consulta `ops/contract/operating-contract.json` y `ops/genesis.md` para entender el contrato y su vista humana.
3. Usa `trackops next` para ver la siguiente cola priorizada.
4. Antes de implementar, marca la tarea con `trackops task start <task-id>`.
5. Usa el router (`ops/.agent/hub/router.md`) para saber que skill aplicar.
6. Al terminar, pasa la tarea a `review`, `complete` o `block` y ejecuta `trackops sync`.

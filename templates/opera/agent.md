# Agente del Proyecto: {{PROJECT_NAME}}

## Identidad
Eres el agente principal del proyecto **{{PROJECT_NAME}}**. Operas bajo el protocolo O.P.E.R.A. v3.0.

## Fuente de Verdad
Tu fuente de verdad es `genesis.md`. Antes de tomar cualquier decisión, consulta este archivo.
Para el seguimiento operativo y el estado del backlog, usa `project_control.json`.

## Comportamiento
- Sigue las reglas de comportamiento definidas en `genesis.md`.
- Respeta la Matriz de Autonomía (Semáforo) para determinar qué acciones puedes tomar.
- Gestiona tareas y estados desde `project_control.json`.
- No edites manualmente `task_plan.md`, `progress.md` ni `findings.md`; se regeneran con `trackops sync`.

## Skills Disponibles
Consulta `.agent/skills/_registry.md` para ver las skills instaladas.
También puedes buscar nuevas skills con `trackops skill catalog`.

## Ciclo de Trabajo
1. Ejecuta `trackops status` al inicio de cada bloque de trabajo.
2. Consulta `genesis.md` para entender los datos y reglas.
3. Usa `trackops next` para ver la siguiente cola priorizada.
4. Antes de implementar, marca la tarea con `trackops task start <task-id>`.
5. Usa el router (`.agent/hub/router.md`) para saber qué skill aplicar.
6. Al terminar, pasa la tarea a `review`, `complete` o `block` y ejecuta `trackops sync`.

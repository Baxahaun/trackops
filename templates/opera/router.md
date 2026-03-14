# Router de Skills

## Propósito
Este archivo define las reglas de enrutamiento entre el agente principal y las skills disponibles. Cuando el agente detecta un contexto específico, consulta estas reglas para decidir qué skill invocar.

## Reglas de Enrutamiento

### Contexto: Commit de código
- **Trigger**: El usuario pide hacer un commit o se completa un cambio de código.
- **Skill**: `commiter`
- **Acción**: Consulta la skill para formatear el mensaje de commit.

### Contexto: Post-commit
- **Trigger**: Se acaba de realizar un commit exitoso.
- **Skill**: `changelog-updater`
- **Acción**: Ejecuta el script de actualización del changelog.

### Contexto: Arranque asistido del proyecto
- **Trigger**: El usuario tiene una idea, una especificación parcial o TrackOps ha generado `ops/bootstrap/agent-handoff.md`.
- **Skill**: `project-starter-skill`
- **Acción**: Convertir el contexto del usuario en `ops/bootstrap/intake.json`, `ops/bootstrap/spec-dossier.md` y `ops/bootstrap/open-questions.md` cuando haga falta.

### Contexto: Auditoria del contrato
- **Trigger**: Existe `ops/contract/operating-contract.json` o `ops/bootstrap/quality-report.json` y hay dudas sobre huecos o contradicciones.
- **Skill**: `opera-contract-auditor`
- **Acción**: Auditar consistencia, huecos y pseudoprecision antes de seguir ejecutando.

### Contexto: Riesgo operativo
- **Trigger**: La accion afecta datos persistentes, despliegues, efectos externos o permisos sensibles.
- **Skill**: `opera-policy-guard`
- **Acción**: Consultar `ops/policy/autonomy.json` y decidir si hace falta aprobacion explicita.

### Contexto: Seguimiento operativo
- **Trigger**: Se va a empezar, retomar o cerrar un bloque de trabajo.
- **Skill**: No aplica skill externa.
- **Acción**: Ejecutar `trackops status`, tomar la siguiente tarea con `trackops next`, usar `ops/contract/operating-contract.json` como contrato de maquina y mantener `ops/project_control.json` como fuente de verdad operativa del backlog.

## Cómo Añadir Nuevas Reglas

Cada regla sigue este formato:

```markdown
### Contexto: [descripción]
- **Trigger**: [qué activa la regla]
- **Skill**: [nombre de la skill]
- **Acción**: [qué debe hacer el agente]
```

Al instalar una nueva skill con `trackops skill install <nombre>`, añade su regla de enrutamiento aquí.

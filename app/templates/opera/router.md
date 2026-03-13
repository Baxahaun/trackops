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

### Contexto: Inicialización de proyecto
- **Trigger**: El usuario quiere crear un nuevo proyecto.
- **Skill**: `project-starter-skill` (global)
- **Acción**: Ejecutar el protocolo de inicialización completo.

### Contexto: Seguimiento operativo
- **Trigger**: Se va a empezar, retomar o cerrar un bloque de trabajo.
- **Skill**: No aplica skill externa.
- **Acción**: Ejecutar `trackops status`, tomar la siguiente tarea con `trackops next` y mantener `project_control.json` como fuente de verdad operativa.

## Cómo Añadir Nuevas Reglas

Cada regla sigue este formato:

```markdown
### Contexto: [descripción]
- **Trigger**: [qué activa la regla]
- **Skill**: [nombre de la skill]
- **Acción**: [qué debe hacer el agente]
```

Al instalar una nueva skill con `trackops skill install <nombre>`, añade su regla de enrutamiento aquí.

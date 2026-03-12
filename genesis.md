# TrackOps — Genesis

> **La Constitución del proyecto.** Este documento es la fuente de verdad. Antes de tomar cualquier decisión arquitectónica o de implementación, consulta este archivo. Si un script contradice lo definido aquí, el script está mal.

---

## 1. Directriz Principal

_¿Cuál es el resultado singular deseado de este proyecto?_

> Construir un motor operativo local y standalone para orquestar proyectos de software asistidos por agentes IA, con contexto determinista, dashboard visual, CLI utilizable y documentación sincronizada.

---

## 2. Integraciones Externas

_¿Qué servicios externos necesitamos? ¿Están listas las claves?_

| Servicio | Estado | Clave / Config |
|----------|--------|----------------|
| Git local | Activo | Requiere repo inicializado para hooks y runtime |
| npm registry | Opcional | Necesario solo para distribución `npx trackops` |
| skills.sh | Simulado | Backend actual usa catálogo local/mock |

---

## 3. Fuente de la Verdad

_¿Dónde viven los datos primarios?_

> `project_control.json` es la fuente de verdad operativa. De ahí se derivan `task_plan.md`, `progress.md`, `findings.md` y el payload consumido por el dashboard.

---

## 4. Carga Útil (Payload)

_¿Cómo y dónde debe entregarse el resultado final?_

> El resultado final es un paquete npm/CLI local que instala y mantiene:
> - `project_control.json`
> - `task_plan.md`
> - `progress.md`
> - `findings.md`
> - `.tmp/project-control-runtime.json`
> - dashboard web local y portfolio multi-proyecto

---

## 5. Reglas de Comportamiento

_Restricciones, tono y reglas específicas del dominio._

- Privacidad local por defecto: no depender de SaaS ni telemetría para funcionar.
- Cero dependencias runtime siempre que sea razonable.
- El motor debe poder dogfoodearse a sí mismo.
- La documentación operativa debe regenerarse desde la fuente de verdad, no a mano.
- Las convenciones de instalación, nomenclatura y rutas internas deben ser únicas y explícitas.

---

## Esquema de Datos

> **Regla "Datos-Primero"**: Este schema debe estar definido antes de escribir cualquier código.

```json
{
  "input": {
    "source": "project_control.json",
    "schema": {
      "meta": "object",
      "checks": "object",
      "tasks": "array",
      "findings": "array",
      "milestones": "array",
      "decisionsPending": "array"
    }
  },
  "output": {
    "destination": [
      "task_plan.md",
      "progress.md",
      "findings.md",
      ".tmp/project-control-runtime.json",
      "dashboard local"
    ],
    "schema": {
      "markdown_docs": "string",
      "runtime_snapshot": "json",
      "ui_payload": "json"
    }
  }
}
```

---

## Invariantes Arquitectónicas

_Decisiones técnicas inamovibles. Cambiarlas requiere aprobación explícita (Nivel Rojo)._

- El core debe ejecutarse con Node.js >= 18 y sin dependencias runtime externas.
- El dashboard se sirve desde el propio proceso local de TrackOps.
- `project_control.json` es la única fuente de verdad operativa.
- El portfolio multi-proyecto vive en un registro local por usuario.
- OPERA es opcional; el motor core debe funcionar sin instalar la metodología.

---

## Pipeline

_Documenta el grafo de dependencias entre herramientas._

### `trackops init` -> `project_control.json`
- Output: configuración operativa inicial, scripts npm, hooks y registro de proyecto.
- Formato: JSON + archivos auxiliares.

### `project_control.json` -> `trackops sync`
- Output: `task_plan.md`, `progress.md`, `findings.md`
- Formato: Markdown autogenerado.

### `project_control.json` + Git -> `refresh-repo`
- Output: `.tmp/project-control-runtime.json`
- Formato: snapshot JSON del estado del repo.

### `dashboard local` -> API interna -> `project_control.json`
- Output: tareas, findings, sesiones y time tracking persistidos.
- Formato: JSON y Server-Sent Events.

---

## Templates

_Referencias a las plantillas de output definidas en `templates/`._

- `templates/opera/` — Estructura base de la metodología OPERA.
- `templates/etapa/` — Alias heredado mantenido solo por compatibilidad durante la transición a OPERA.
- `templates/skills/` — Catálogo local de skills instalables.
- `templates/hooks/` — Hooks Git para refresco del runtime.

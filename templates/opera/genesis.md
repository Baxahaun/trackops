# {{PROJECT_NAME}} — Genesis

> **La Constitución del proyecto.** Este documento es la fuente de verdad. Antes de tomar cualquier decisión arquitectónica o de implementación, consulta este archivo. Si un script contradice lo definido aquí, el script está mal.

---

## 1. Directriz Principal

_¿Cuál es el resultado singular deseado de este proyecto?_

> TODO: Definir el objetivo principal del proyecto.

---

## 2. Integraciones Externas

_¿Qué servicios externos necesitamos? ¿Están listas las claves?_

| Servicio | Estado | Clave / Config |
|----------|--------|----------------|
| —        | —      | —              |

---

## 3. Fuente de la Verdad

_¿Dónde viven los datos primarios?_

> TODO: Describir la fuente de datos principal.

---

## 4. Carga Útil (Payload)

_¿Cómo y dónde debe entregarse el resultado final?_

> TODO: Describir destino y formato de entrega.

---

## 5. Reglas de Comportamiento

_Restricciones, tono y reglas específicas del dominio._

> TODO: Definir restricciones de negocio.

---

## Esquema de Datos

> **Regla "Datos-Primero"**: Este schema debe estar definido antes de escribir cualquier código.

```json
{
  "input": {
    "source": "",
    "schema": {}
  },
  "output": {
    "destination": "",
    "schema": {}
  }
}
```

---

## Invariantes Arquitectónicas

_Decisiones técnicas inamovibles. Cambiarlas requiere aprobación explícita (Nivel Rojo)._

- TODO: Listar invariantes.

---

## Pipeline

_Documenta el grafo de dependencias entre herramientas._

<!-- Ejemplo:
### tool_fetch.py → tool_transform.py
- Output: `.tmp/raw_data.json`
- Formato: JSON array según schema X
-->

---

## Templates

_Referencias a las plantillas de output definidas en `templates/`._

<!-- Ejemplo:
- `templates/report.md` — Plantilla para reportes
-->

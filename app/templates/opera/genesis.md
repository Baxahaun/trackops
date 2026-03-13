# {{PROJECT_NAME}} — Genesis

> **La Constitución del proyecto.** Este documento es la fuente de verdad. Antes de tomar cualquier decisión arquitectónica o de implementación, consulta este archivo. Si un script contradice lo definido aquí, el script está mal.

---

## 1. Directriz Principal

_¿Cuál es el resultado singular deseado de este proyecto?_

> {{DESIRED_OUTCOME}}

---

## 2. Integraciones Externas

_¿Qué servicios externos necesitamos? ¿Están listas las claves?_

| Servicio | Estado | Clave / Config |
|----------|--------|----------------|
{{SERVICES_TABLE}}

---

## 3. Fuente de la Verdad

_¿Dónde viven los datos primarios?_

> {{SOURCE_OF_TRUTH}}

---

## 4. Carga Útil (Payload)

_¿Cómo y dónde debe entregarse el resultado final?_

> {{PAYLOAD}}

---

## 5. Reglas de Comportamiento

_Restricciones, tono y reglas específicas del dominio._

{{BEHAVIOR_RULES}}

---

## Esquema de Datos

> **Regla "Datos-Primero"**: Este schema debe estar definido antes de escribir cualquier código.

```json
{{DATA_SCHEMA}}
```

---

## Invariantes Arquitectónicas

_Decisiones técnicas inamovibles. Cambiarlas requiere aprobación explícita (Nivel Rojo)._

{{ARCHITECTURAL_INVARIANTS}}

---

## Pipeline

_Documenta el grafo de dependencias entre herramientas._

{{PIPELINE_ITEMS}}

---

## Templates

_Referencias a las plantillas de output definidas en `templates/`._

{{TEMPLATE_ITEMS}}

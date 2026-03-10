---
name: "project-starter-skill"
description: "Skill global para inicializar proyectos completos usando el protocolo E.T.A.P.A. (Estrategia, Tests, Arquitectura, Pulido, Automatización). Usa esta skill siempre que el usuario quiera crear un nuevo proyecto, inicializar una estructura de agente, configurar un repositorio, o arrancar cualquier automatización desde cero. También se activa cuando el usuario menciona 'nuevo proyecto', 'iniciar proyecto', 'configurar proyecto', 'etapa', 'project starter', 'scaffold', o cualquier intención de comenzar algo nuevo que necesite estructura."
metadata:
  version: "2.0"
  type: "global"
  triggers:
    - "iniciar proyecto"
    - "nuevo proyecto"
    - "configurar proyecto"
    - "etapa"
    - "project starter"
    - "scaffold"
    - "inicializar"
---

# 🚀 ProjectStarterSkill — E.T.A.P.A. v2.0

## Identidad

Eres el **Piloto del Sistema**. Tu misión es construir automatización determinista y autorreparable usando el protocolo E.T.A.P.A.

## Filosofía

- Fiabilidad sobre velocidad. Nunca adivines lógica de negocio.
- Los LLMs son probabilísticos, pero tu código debe ser **determinista**.
- Cada fase tiene un **Definition of Done** verificable. No avanzas sin cumplirlo.
- `genesis.md` es la ley. Si un script la contradice, el script está mal.

---

## Protocolo de Inicialización

Este protocolo se ejecuta secuencialmente y sin excepciones al crear un nuevo proyecto.

### Paso 1 — Descubrimiento

Antes de crear cualquier archivo, haz al usuario estas preguntas:

| # | Pregunta | Propósito |
|---|----------|-----------|
| 1 | ¿Cuál es el resultado singular deseado? | Directriz principal |
| 2 | ¿Qué servicios externos necesitamos? ¿Están listas las claves? | Integraciones |
| 3 | ¿Dónde viven los datos primarios? | Fuente de la verdad |
| 4 | ¿Cómo y dónde debe entregarse el resultado final? | Carga útil |
| 5 | ¿Restricciones, tono o reglas específicas? | Reglas de comportamiento |

También pregunta:
- ¿Repositorio **público o privado**?
- ¿Tipo de **licencia**? (MIT, Apache 2.0, GPL v3, Propietario)

### Paso 2 — Inicialización con Ops

Ejecuta la inicialización del sistema operativo:

```bash
npx trackops init --with-etapa
```

Esto crea `project_control.json`, instala ETAPA y registra el proyecto.

### Paso 3 — Poblar genesis.md

Con las respuestas del descubrimiento, completa `genesis.md` con:

1. **Esquema de Datos JSON** (Input/Output) — esto es obligatorio antes de escribir código.
2. **Reglas de comportamiento** — restricciones de negocio.
3. **Invariantes arquitectónicas** — decisiones técnicas inamovibles.

Esto es la regla "Datos-Primero": si el schema no está definido en `genesis.md`, no se escribe código.

### Paso 4 — Completar task_plan.md

Ejecuta `trackops sync` para regenerar `task_plan.md` y luego ajusta:
- Fases y objetivos.
- **Definition of Done** por cada fase (ver referencia `references/etapa-cycle.md`).
- Checklist verificable.

### Paso 5 — Skills Base

1. Instala las skills obligatorias:
   ```bash
   trackops skill install commiter
   trackops skill install changelog-updater
   ```
2. Analiza la definición del proyecto en `genesis.md`.
3. Busca skills adicionales con `trackops skill catalog` y **recomienda** (no instales sin aprobación) las que apliquen.

### Paso 6 — Repositorio

1. Crea el repositorio en GitHub (público o privado según elección).
2. Genera `README.md` con la descripción del proyecto basada en `genesis.md`.
3. Crea `LICENSE` según la elección del usuario.
4. Inicializa `CHANGELOG.md` con entrada de creación.
5. Realiza el primer commit (usa la skill `commiter`).

### Paso 7 — Freno de Mano 🛑

Tienes **prohibido** escribir scripts en `tools/` hasta que:

- [ ] Las preguntas de descubrimiento estén respondidas.
- [ ] El esquema de datos esté definido en `genesis.md`.
- [ ] `task_plan.md` tenga un plano aprobado con Definition of Done.
- [ ] La estructura `.agent/` y `.agents/` esté creada.
- [ ] El repositorio esté inicializado.

---

## El Ciclo E.T.A.P.A.

Una vez completada la inicialización, el proyecto avanza a través de las fases definidas. Para el detalle completo de cada fase, lee:
```
references/etapa-cycle.md
```

### Resumen de Fases ETAPA

| Fase | Nombre | Foco | Entregable clave |
|------|--------|------|-------------------|
| **E** | Estrategia | Visión y lógica | Schema JSON en `genesis.md` |
| **T** | Tests | Conectividad | Scripts de test pasando |
| **A** | Arquitectura | Construcción en 3 capas | SOPs + tools + tests de integración |
| **P** | Pulido | Refinamiento | Outputs validados contra templates |
| **AU** | Automatización | Despliegue | Triggers configurados + smoke test |

### La Arquitectura de 3 Capas

| Capa | Ubicación | Función |
|------|-----------|---------|
| Arquitectura | `architecture/` | SOPs técnicos en Markdown. Si la lógica cambia, actualiza el SOP **antes** que el código. |
| Navegación | El Agente | Capa de razonamiento. Enruta datos entre SOPs y herramientas. |
| Herramientas | `tools/` | Scripts atómicos y deterministas. Variables en `.env`. Temporales en `.tmp/`. |

---

## Gobernanza y Recuperación

Para la matriz de autonomía (semáforo), el protocolo de auto-reparación y el sistema de rollback, lee:
```
references/autonomy-and-recovery.md
```

### Resumen Rápido

**🔴 NIVEL ROJO** (Pide permiso): Modificar `genesis.md`, eliminar datos persistentes, desplegar a producción, enviar comunicaciones externas, crear repos.

**🟢 NIVEL VERDE** (Avanza): Crear/editar scripts, leer archivos, ejecutar tests, actualizar logs, auto-reparar (máx. 3 intentos).

---

## Estructura de Archivos

```
proyecto/
├── .agent/
│   ├── hub/
│   │   ├── agent.md              # Instrucciones del agente
│   │   └── router.md             # Enrutamiento a skills
│   └── skills/
│       └── _registry.md          # Índice de skills instaladas
├── .agents/
│   └── skills/
│       └── [skill-name]/
│           └── SKILL.md          # Contenido de skills
├── genesis.md                    # 📜 La Constitución
├── task_plan.md                  # 🗺️ El Mapa (autogenerado)
├── progress.md                   # 📓 El Diario (autogenerado)
├── findings.md                   # 📖 La Biblioteca (autogenerado)
├── CHANGELOG.md                  # 📋 El Historial
├── architecture/                 # 📘 El Manual (SOPs)
├── tools/                        # ⚙️ Los Motores
├── templates/                    # 📐 Las Plantillas
├── .tmp/                         # 🔧 El Taller
├── .env                          # 🔑 Las Llaves
├── project_control.json          # 🎛️ Control Operativo
├── README.md
├── LICENSE
└── .gitignore
```

---

## Checklist de Inicialización

```markdown
- [ ] Preguntas de descubrimiento respondidas
- [ ] trackops init ejecutado
- [ ] genesis.md poblado con schema y reglas
- [ ] task_plan.md con Definition of Done por fase
- [ ] progress.md generado
- [ ] findings.md generado
- [ ] .agent/hub/agent.md configurado
- [ ] .agent/hub/router.md configurado
- [ ] .agent/skills/_registry.md creado
- [ ] Skills base instaladas (commiter, changelog-updater)
- [ ] Repositorio GitHub creado
- [ ] README.md generado
- [ ] LICENSE creada
- [ ] CHANGELOG.md inicializado
- [ ] .gitignore configurado
- [ ] Primer commit realizado
```

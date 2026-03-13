# {{PROJECT_NAME}} — Genesis

> **The Constitution of the project.** This document is the source of truth. Before making any architectural or implementation decision, consult this file. If a script contradicts what is defined here, the script is wrong.

---

## 1. Desired Outcome

_What is the single desired outcome of this project?_

> {{DESIRED_OUTCOME}}

---

## 2. External Integrations

_Which external services do we need? Are credentials ready?_

| Service | Status | Key / Config |
|---------|--------|--------------|
{{SERVICES_TABLE}}

---

## 3. Source of Truth

_Where does the primary data live?_

> {{SOURCE_OF_TRUTH}}

---

## 4. Payload

_How and where should the final result be delivered?_

> {{PAYLOAD}}

---

## 5. Behavior Rules

_Domain constraints, tone, and specific rules._

{{BEHAVIOR_RULES}}

---

## Data Schema

> **Data-first rule**: this schema must exist before any code is written.

```json
{{DATA_SCHEMA}}
```

---

## Architectural Invariants

_Non-negotiable technical decisions. Changing them requires explicit approval._

{{ARCHITECTURAL_INVARIANTS}}

---

## Pipeline

_Document the dependency graph between tools._

{{PIPELINE_ITEMS}}

---

## Templates

_References to output templates defined under `templates/`._

{{TEMPLATE_ITEMS}}

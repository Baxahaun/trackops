# Dependency Graph

```mermaid
flowchart TD
    A[Explicit global runtime install] --> B[trackops init]
    B --> C[trackops opera install]
    C --> D{Routing}
    D -->|direct_cli| E[Direct intake]
    D -->|agent_handoff| F[agent-handoff.md/json]
    F --> G[intake.json + spec-dossier.md]
    E --> H[quality-report.json]
    G --> H
    H --> I[operating-contract.json]
    I --> J[genesis.md]
    I --> K[task_plan.md / progress.md / findings.md]
    I --> L[dashboard + API state]
    I --> M[env sync + policy enforcement]
```

## Notes

- `ops/project_control.json` is the operational source of truth for backlog and session state.
- `ops/contract/operating-contract.json` is the machine contract.
- `ops/genesis.md` is a compiled human view.

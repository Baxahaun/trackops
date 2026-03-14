# Skills Router

## Purpose
This file defines the routing rules between the main agent and the available skills. When the agent detects a specific context, it should consult these rules and choose the right skill.

## Routing Rules

### Context: Code commit
- **Trigger**: The user asks for a commit or a code change has just been completed.
- **Skill**: `commiter`
- **Action**: Use the skill to format the commit message.

### Context: Post-commit
- **Trigger**: A successful commit has just happened.
- **Skill**: `changelog-updater`
- **Action**: Run the changelog update flow.

### Context: Agent-led project start
- **Trigger**: The user has an idea, partial specification, or TrackOps has generated `ops/bootstrap/agent-handoff.md`.
- **Skill**: `project-starter-skill`
- **Action**: Turn the user context into `ops/bootstrap/intake.json`, `ops/bootstrap/spec-dossier.md`, and `ops/bootstrap/open-questions.md` when needed.

### Context: Contract audit
- **Trigger**: `ops/contract/operating-contract.json` or `ops/bootstrap/quality-report.json` exists and there are doubts about gaps or contradictions.
- **Skill**: `opera-contract-auditor`
- **Action**: Audit consistency, gaps, and false precision before execution continues.

### Context: Operational risk
- **Trigger**: The action affects persistent data, deployments, external side effects, or sensitive permissions.
- **Skill**: `opera-policy-guard`
- **Action**: Read `ops/policy/autonomy.json` and decide whether explicit approval is required.

### Context: Operational tracking
- **Trigger**: A work block is about to start, resume, or close.
- **Skill**: No external skill.
- **Action**: Run `trackops status`, take the next task with `trackops next`, use `ops/contract/operating-contract.json` as the machine contract, and keep `ops/project_control.json` as the backlog source of truth.

## Adding New Rules

Use this format for each new rule:

```markdown
### Context: [description]
- **Trigger**: [what activates the rule]
- **Skill**: [skill name]
- **Action**: [what the agent should do]
```

When a new skill is installed with `trackops skill install <name>`, add its routing rule here.

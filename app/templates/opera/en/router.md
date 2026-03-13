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

### Context: Project initialization
- **Trigger**: The user wants to create a new project.
- **Skill**: `project-starter-skill` (global)
- **Action**: Run the full initialization protocol.

### Context: Operational tracking
- **Trigger**: A work block is about to start, resume, or close.
- **Skill**: No external skill.
- **Action**: Run `trackops status`, take the next task with `trackops next`, and keep `project_control.json` as the operational source of truth.

## Adding New Rules

Use this format for each new rule:

```markdown
### Context: [description]
- **Trigger**: [what activates the rule]
- **Skill**: [skill name]
- **Action**: [what the agent should do]
```

When a new skill is installed with `trackops skill install <name>`, add its routing rule here.

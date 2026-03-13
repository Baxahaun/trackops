# Project Agent: {{PROJECT_NAME}}

## Identity
You are the primary agent for **{{PROJECT_NAME}}**. You operate under the O.P.E.R.A. v3.0 protocol.

## Source of Truth
Your source of truth is `genesis.md`. Before making any architectural or implementation decision, read it first.
For operational tracking and backlog state, use `project_control.json`.

## Behavior
- Follow the behavior rules defined in `genesis.md`.
- Respect the autonomy matrix to determine which actions are allowed.
- Manage tasks and states from `project_control.json`.
- Do not edit `task_plan.md`, `progress.md`, or `findings.md` manually; regenerate them with `trackops sync`.

## Available Skills
Check `.agents/skills/_registry.md` to see installed skills.
You can also discover new skills with `trackops skill catalog`.

## Work Cycle
1. Run `trackops status` at the beginning of each work block.
2. Read `genesis.md` to understand the data and rules.
3. Use `trackops next` to inspect the prioritized queue.
4. Before implementing, mark the task with `trackops task start <task-id>`.
5. Use the router in `.agent/hub/router.md` to choose the right skill.
6. When you finish, move the task to `review`, `complete`, or `block`, then run `trackops sync`.

# Project Agent: {{PROJECT_NAME}}

## Identity
You are the primary agent for **{{PROJECT_NAME}}**. You operate under the O.P.E.R.A. v3.0 protocol.

## Source of Truth
Your machine source of truth is `ops/contract/operating-contract.json`.
Your compiled human view is `ops/genesis.md`.
For operational tracking and backlog state, use `ops/project_control.json`.

## Behavior
- Follow the rules defined in `ops/contract/operating-contract.json` and reflected in `ops/genesis.md`.
- Respect `ops/policy/autonomy.json` to determine which actions are allowed without approval.
- Manage tasks and states from `ops/project_control.json`.
- Do not edit `ops/task_plan.md`, `ops/progress.md`, or `ops/findings.md` manually; regenerate them with `trackops sync`.

## Available Skills
Check `ops/.agents/skills/_registry.md` to see installed skills.
You can also discover new skills with `trackops skill catalog`.

## Work Cycle
1. Run `trackops status` at the beginning of each work block.
2. Read `ops/contract/operating-contract.json` and `ops/genesis.md` to understand the contract and its human view.
3. Use `trackops next` to inspect the prioritized queue.
4. Before implementing, mark the task with `trackops task start <task-id>`.
5. Use the router in `ops/.agent/hub/router.md` to choose the right skill.
6. When you finish, move the task to `review`, `complete`, or `block`, then run `trackops sync`.

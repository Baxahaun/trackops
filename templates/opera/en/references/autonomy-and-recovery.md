# Autonomy and Recovery

Use this reference to decide when the agent can continue autonomously and when it must stop for confirmation.

## Red level

Ask for confirmation before:
- Changing `genesis.md` in a way that alters the contract.
- Deleting persistent data.
- Creating repositories or external resources.
- Deploying to production.

## Green level

Proceed autonomously for:
- Reading and editing local source files.
- Running tests and checks.
- Updating operational docs.
- Repairing deterministic errors after a bounded number of attempts.

## Recovery rule

If a later phase invalidates an earlier decision, document the proposed change first, request approval, and only then update `genesis.md` and the operational record.

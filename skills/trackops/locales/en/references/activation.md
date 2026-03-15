# Activation

## Global install

```bash
npx skills add Baxahaun/trackops
npm install -g trackops
trackops --version
```

The global skill installs instructions for the agent.

The `trackops` runtime is installed separately through npm so the step stays visible, auditable, and easy to verify.

Before continuing:

- confirm that `trackops --version` returns a valid version
- if it does not, fix PATH or reinstall `trackops`
- the skill must not try to install the runtime by itself

## Local activation

Inside a repository:

```bash
trackops init
trackops opera install
```

By default, `trackops init` creates a split workspace with:

- `app/`
- `ops/`
- `/.env`
- `/.env.example`
- `.trackops-workspace.json`

## OPERA routing

OPERA always starts by classifying:

- technical level
- project state
- documentation state

If the project is still early or the user is non-technical, TrackOps writes:

- `ops/bootstrap/agent-handoff.md`
- `ops/bootstrap/agent-handoff.json`

The agent must produce:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`
- `ops/bootstrap/open-questions.md` when needed

When the quality gate passes, OPERA compiles:

- `ops/contract/operating-contract.json`
- `ops/genesis.md`
- `ops/policy/autonomy.json`

Resume with:

```bash
trackops opera bootstrap --resume
```

Locale controls:

```bash
trackops locale get
trackops locale set en
trackops doctor locale
```

## Uninstall

Global:

```bash
npx skills remove --global trackops -y
npm uninstall -g trackops
```

Local:

- there is no `trackops uninstall` command yet
- review and remove `.trackops-workspace.json`, `ops/`, and `app/.env` if it was only the bridge
- do not delete `/.env` or `/.env.example` without checking whether the project still needs them

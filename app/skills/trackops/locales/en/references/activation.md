# Activation

## Global install

Install the marketplace skill:

```bash
npx skills add Baxahaun/trackops
```

On first use, ensure the runtime with the bundled skill script:

```bash
node scripts/bootstrap-trackops.js
```

The global skill must not create repository files on its own.

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

# Troubleshooting

## Faltan prerequisitos

- Instala Node 18+ si Node falta o es demasiado antiguo.
- Instala una distribucion de Node que incluya npm si falta npm.

## Fallo al instalar la skill global

- Instala desde el estado committeado de GitHub:
  `npx skills add Baxahaun/trackops`
- Luego asegura el runtime local con:
  `node scripts/bootstrap-trackops.js`
- Si la instalacion salio bien pero el CLI sigue sin aparecer, confirma que `~/.trackops/runtime.json` exista.

## Fallo en el bootstrap del runtime

- Reejecuta `node scripts/bootstrap-trackops.js`.
- Si fallan los permisos globales de npm, configura un prefix de usuario en lugar de usar `sudo`.

## OPERA ha derivado el bootstrap al agente

Es el comportamiento esperado cuando:

- el usuario no es tecnico
- el proyecto sigue en fase idea
- la documentacion es debil

Usa:

```bash
trackops opera handoff --print
trackops opera bootstrap --resume
```

## El resume no completa

TrackOps no inventa contexto faltante.

Comprueba que ambos archivos existan y contengan datos utilizables:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`

## El entorno parece inconsistente

- Ejecuta `trackops env status`.
- Ejecuta `trackops env sync`.
- Si el bridge mode es `copy`, no edites `app/.env` directamente.

# Troubleshooting

## Faltan prerequisitos

- Instala Node 18+ si Node no existe o es demasiado antiguo.
- Instala una distribucion de Node que incluya npm si npm no existe.

## La skill se instalo, pero `trackops` no arranca

- Confirma que la skill global existe:
  `npx skills add Baxahaun/trackops`
- Instala o reinstala el runtime de forma explicita:
  `npm install -g trackops`
- Verifica:
  `trackops --version`
- Si el binario sigue sin responder:
  - revisa Node.js (`>= 18`)
  - revisa que `npm` exista y funcione
  - revisa PATH y reabre la terminal

## La instalacion explicita del runtime falla

- Reejecuta `npm install -g trackops`.
- Si `npm` devuelve error, resuelvelo primero; la skill no puede continuar sin el CLI.
- Si el problema es de permisos globales, usa el metodo recomendado para tu sistema o un prefijo npm controlado por el usuario.

## OPERA derivo el bootstrap al agente

Esto es esperado cuando:

- el usuario no es tecnico
- el proyecto esta en fase idea
- la documentacion es debil

Usa:

```bash
trackops opera handoff --print
trackops opera bootstrap --resume
```

## `trackops opera bootstrap --resume` no avanza

TrackOps no inventa contexto faltante.

Comprueba que existan ambos archivos y contengan datos utiles:

- `ops/bootstrap/intake.json`
- `ops/bootstrap/spec-dossier.md`

## El entorno parece inconsistente

- Ejecuta `trackops env status`.
- Ejecuta `trackops env sync`.
- Si el modo bridge es `copy`, no edites `app/.env` directamente.

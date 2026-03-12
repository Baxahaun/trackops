# TrackOps — Publicación y Versiones

## Estado del producto

TrackOps usa una política simple:

- `major`: cambios incompatibles o migraciones manuales.
- `minor`: capacidades nuevas compatibles con lo existente.
- `patch`: correcciones, ajustes de documentación y mejoras sin ruptura.

La versión del paquete debe cambiar solo cuando el comportamiento entregado al usuario cambie de forma real.

## Qué revisar antes de publicar

Ejecuta siempre:

```bash
npm run release:check
```

Ese comando valida dos cosas mínimas:

- la prueba de humo del núcleo y del panel
- que el paquete se pueda preparar para publicar

## Checklist de publicación

1. Ejecuta `trackops sync`.
2. Ejecuta `npm run release:check`.
3. Revisa `CHANGELOG.md` y añade la entrada del cambio.
4. Ajusta la versión en `package.json` solo si el alcance del cambio lo exige.
5. Haz el commit final con la documentación ya sincronizada.

## Regla de oro

Si el cambio modifica instalación, comandos, rutas internas, interfaz visible o comportamiento del panel, debe quedar reflejado en:

- `CHANGELOG.md`
- `README.md` o `UserGUIDE.md`
- `project_control.json` si afecta al backlog o a los hallazgos

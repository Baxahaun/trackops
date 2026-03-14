# Spec dossier

## Problem statement
Los equipos que trabajan con agentes IA necesitan una capa local que ordene el proyecto, traduzca entre usuario y agente y mantenga el control operativo fuera del producto.

## Target user
Desarrolladores senior, equipos técnicos y usuarios no técnicos que construyen proyectos reales con agentes IA.

## Singular desired outcome
Activar y gobernar proyectos locales asistidos por IA con un contrato operativo explícito, bilingüe y reanudable.

## Delivery target
Runtime npm de TrackOps con workspace split, dashboard local, onboarding dual y OPERA v3 compilado.

## Source of truth
ops/project_control.json como estado operativo y ops/contract/operating-contract.json como contrato estructurado de maquina.

## Scope
TrackOps debe preparar el runtime global, activar proyectos localmente, separar app/ y ops/, gestionar el contrato de entorno y ofrecer un dashboard local. OPERA debe capturar el perfil del usuario, decidir entre bootstrap directo u orientado al agente, validar el discovery y compilar el contrato operativo.

## User model
El producto debe servir tanto a usuarios muy técnicos como a usuarios no técnicos. La explicacion, el handoff y el bootstrap deben adaptarse al nivel tecnico y al idioma elegido.

## Governance
La politica ejecutable de autonomia debe vivir en ops/policy/autonomy.json. El sistema no debe exponer secretos y debe dejar trazabilidad suficiente para reanudar trabajo, revisar calidad y explicar por que eligio cada ruta de bootstrap.

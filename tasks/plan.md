# Plan: campus oscuro + rediseño del programa

Spec: `docs/SPEC-campus-rediseno.md`. Tareas: `tasks/todo.md`.

## Ajuste al spec

El tema se guarda en `localStorage` (no cookie) y lo aplica un script inline en `<head>` antes de pintar, igual para Claro, Oscuro y Sistema. Un solo mecanismo, sin leer cookies en el server, sin parpadeo.

## Orden

```
T1 paleta con variables + tema ─┬─ T2 selector en ProfileMenu
                                └─ T3 pasada visual en oscuro (todas las pantallas)
                                        │
T4 datos: tipo de tema (bitácora) ──────┤
                                        ├─ T5 hero + pestañas + lateral
                                        ├─ T6 Módulos (estantería, filtros, tarjetas por tipo)
                                        ├─ T7 Astillero
                                        ├─ T8 Misiones + personajes
                                        └─ T9 Biblioteca (archivos)
T10 cierre: check:task, check:size, changelog de staff
```

Checkpoints: después de T3 (campus entero en oscuro, `check:task`), y después de T9 (página del programa completa, en claro/oscuro, desktop/celular).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Invertir `slate` rompe algo que asumía "slate-900 = oscuro" (ej. botón `bg-slate-800 text-white`) | En oscuro `slate-800` pasa a claro con texto blanco encima → ilegible. T3 recorre todas las pantallas y corrige esos casos con `dark:`. Se buscan con grep `bg-slate-[789]00`. |
| Hex sueltos (172) con fondos claros fijos | T3 los revisa pantalla por pantalla. |
| `CursoContent.tsx` ya tiene 900 líneas | Las ilustraciones SVG van en `ProgramaIlustraciones.tsx`; cada pestaña queda como sub-componente. |
| Bundle > 331 kB por SVGs | Son SVG inline chicos; se mide en T10. |

# Spec: Campus — modo oscuro + rediseño de la página del programa

Estado: **borrador, esperando aprobación** (2026-09-27).
Diseño de referencia: artifact "Campus HOME" (claude.ai/artifact/M5CEQGZHf7tmhRPwzpx1h4), board "Programa completo".

## Mapa de capacidades

| Módulo | Qué hace | Depende de |
|---|---|---|
| `campus-oscuro` | Tema oscuro para todo el campus + selector Claro / Oscuro / Sistema | — |
| `programa-rediseno` | Página `/cursos/[cursoId]` con el diseño del artifact | `campus-oscuro` (los componentes nuevos nacen con sus colores de modo oscuro) |

Orden: `campus-oscuro` → `programa-rediseno`. Son dos commits separados; cada uno se puede probar solo.

## Supuestos

1. El modo oscuro es para **todo el campus** (`apps/campus`), no para marketing ni `/admin`.
2. Se elige desde el menú de perfil (Claro / Oscuro / Sistema). Default: **Sistema**. Se guarda en el navegador (localStorage) y un script en `<head>` lo aplica antes de pintar, sin parpadeo.
3. El rediseño toca solo la página del programa (`cursos/[cursoId]/page.tsx` + `CursoContent.tsx`). La barra de navegación del artifact ya coincide con la actual (Inicio, Mis Cursos, Comunidad, Calendario, Entregas para staff); no se toca.
4. Se mantienen las fuentes actuales (Inter + Fraunces). En el artifact se usan Figtree + Instrument Serif; Fraunces cumple el rol de la serif.
5. Los nombres visibles de las pestañas cambian como en el artifact: Talleres → **Astillero**, CAMPO → **Misiones**. Los datos (`module_type`) no cambian.
6. Sin migraciones ni dependencias nuevas.

## Objetivo

**Modo oscuro.** Un alumno que estudia de noche puede usar el campus sin pantalla blanca. Todas las pantallas (dashboard, cursos, clase, calendario, comunidad, perfil, modales) se leen bien en oscuro.

**Rediseño.** La página del programa pasa del listado plano al diseño del artifact:
- Hero con panel de color (tapa del curso o fondo azul con estrellas) y título encima.
- Pestañas con color propio y contador.
- **Módulos:** tarjeta "Estantería del programa" (un lomo por módulo, alto según cantidad de temas, click abre/cierra); filtros Todo / Lecturas / Videos / Bitácoras con contador; cada módulo con chip de color, resumen ("2 bitácoras · 4 lecturas · 27 min de video"), progreso y cinta si está abierto; temas en grilla de 2 columnas con tarjeta distinta por tipo (bitácora oscura a lo ancho, lectura "papel", video con miniatura).
- **Astillero** (talleres): onda decorativa, tarjetas ámbar, temas en grilla. Se conserva "Marcar vista".
- **Misiones** (CAMPO): tarjeta con número, título en serif, fecha límite, botones, e ilustración del personaje a la derecha.
- **Archivos institucionales:** "biblioteca": estante oscuro con un libro por documento; al tocar uno se ve su ficha con "Abrir enlace".
- Lateral: vista organizador / tu progreso + "Contenidos disponibles" (igual que hoy, con el estilo nuevo).

## Enfoque técnico

**Modo oscuro sin reescribir 1000 clases.** Hay ~550 usos de `slate-*`, ~80 de `bg-white` y ~230 de amber/violet/emerald/rose/sky. Poner `dark:` en cada uno es un diff enorme y fácil de dejar incompleto. En su lugar:
- `darkMode: 'class'` en `tailwind.config.mjs`.
- La escala `slate` (y los tonos claros 50–200 / oscuros 600–900 de amber, violet, emerald, rose, sky, cyan) pasan a leer variables CSS (`rgb(var(--slate-100) / <alpha-value>)`). En `.dark` se redefinen esas variables: los fondos claros se vuelven oscuros y los textos oscuros se vuelven claros. Todas las clases existentes cambian solas.
- `bg-white` se cubre con una regla en `globals.css` (`.dark .bg-white { … }`), porque `white` también se usa como color de texto sobre botones y no se puede invertir.
- Los hex sueltos (`#00A9CE`, etc.) quedan: el celeste funciona en los dos temas. Los que se vean mal se corrigen a mano con `dark:`.
- La cookie `theme` se lee en `app/layout.tsx` (server) y pone `class="dark"` en `<html>`. Para "Sistema" va un script inline mínimo en `<head>` que mira `prefers-color-scheme`.

**Rediseño.** Se reescribe `CursoContent.tsx` con Tailwind + `dark:` (componentes nuevos, así que se escriben con sus dos temas). Las ilustraciones (estrellas del hero, estantería, personajes, biblioteca) van como SVG inline en un archivo aparte (`_components/ProgramaIlustraciones.tsx`) para no inflar `CursoContent`. Sin librerías.

## Comandos

```bash
npm run dev:campus          # :3001
npm run check:fast          # mientras se edita
npm run check:task          # al terminar cada módulo
npm run check:full          # antes de pushear (solo si lo pedís)
```

## Estructura

```
apps/campus/tailwind.config.mjs                        → darkMode + paleta con variables
apps/campus/src/app/globals.css                        → variables claro/oscuro, bg-white, scrollbars
apps/campus/src/app/layout.tsx                         → clase dark desde la cookie
apps/campus/src/app/(campus)/_components/ProfileMenu.tsx → selector de tema
apps/campus/src/app/(campus)/cursos/[cursoId]/*         → rediseño
```

## Estilo

Tailwind, íconos de `react-icons/io5`, textos en español rioplatense, comentarios en español. Ejemplo:

```tsx
<div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-2xl">
```

## Verificación

No hay tests. Por módulo: `check:task` (typecheck + arquitectura + secretos) y revisión visual en `dev:campus` en claro y oscuro, en desktop (1362 px) y celular (390 px). Bundle de campus bajo 331 kB (`check:size`).

## Límites

- **Siempre:** textos en español; contraste legible (4.5:1) en los dos temas; botones ≥ 44 px; respetar `prefers-reduced-motion` en las animaciones (estrellas, personajes).
- **Preguntar antes:** migraciones (por ejemplo si hace falta un campo "autor" o "tipo" en `lessons`), dependencias nuevas, tocar marketing/admin.
- **Nunca:** pushear sin que lo pidas; bajar ningún umbral de `CONSTRAINTS.md`.

## Criterios de éxito

1. Con Oscuro elegido, ninguna pantalla del campus muestra un fondo blanco grande ni texto oscuro sobre fondo oscuro.
2. Recargar no hace parpadear el tema (ni con Claro/Oscuro fijo ni con Sistema).
3. La página del programa reproduce el artifact en desktop y se apila bien en celular (390 px, sin scroll horizontal).
4. Todo lo que funciona hoy sigue funcionando: continuar, marcar vista en talleres, entregas de CAMPO, vista organizador, progreso optimista.
5. Filtros por tipo cuentan bien y "Expandir todo / Contraer todo" funciona.
6. `check:task` pasa; el bundle de campus no supera 331 kB.

## Decisiones (respondidas 2026-09-27)

1. **Tipo de tema:** bitácora = tema de un módulo común con `requires_submission` (son los entregables del módulo). Si no, video si tiene `video_url`, si no lectura. Numeración "BITÁCORA N" por orden dentro del programa.
2. **Autor de las lecturas:** se omite (no es relevante hoy). Sin migración.
3. **Personajes de Misiones:** Tripulante y Vigía son la guía de una serie de marineros que se van a ir sumando. Se arma una lista de personajes (cada uno: escena SVG + animaciones) donde agregar uno nuevo es sumar una entrada. Misión N usa el personaje N; mientras no exista, se rota por los que hay.
4. **Biblioteca con muchos documentos:** hasta 6 libros por estante; con más, se apilan estantes.

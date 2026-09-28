# Tareas: campus oscuro + rediseño del programa

## campus-oscuro

- [x] T1: Paleta con variables y aplicación del tema
  - Acceptance: `darkMode: 'class'`; `slate` y los tonos de amber/violet/emerald/rose/sky/cyan/cream/ink leen variables; `.dark` las redefine; `.dark .bg-white` cubierto; script inline en `<head>` pone `dark` según `localStorage.theme` (claro/oscuro/sistema, default sistema) sin parpadeo; scrollbars y toaster en oscuro.
  - Verify: `check:fast`; con `document.documentElement.classList.add('dark')` el dashboard se ve oscuro.
  - Files: `apps/campus/tailwind.config.mjs`, `apps/campus/src/app/globals.css`, `apps/campus/src/app/layout.tsx`

- [x] T2: Selector Claro / Oscuro / Sistema en el menú de perfil
  - Acceptance: tres opciones en `ProfileMenu`, marca la actual, cambia en el acto, persiste al recargar; "Sistema" sigue al SO en vivo.
  - Verify: manual en `dev:campus`.
  - Files: `ProfileMenu.tsx`

- [x] T3: Pasada visual en oscuro por todas las pantallas
  - Acceptance: dashboard, cursos, programa (actual), clase, calendario, comunidad, perfil, modales de bienvenida y recorte: sin fondos blancos grandes ni texto ilegible.
  - Verify: `check:task` + recorrido visual. **Checkpoint.**
  - Files: los que hagan falta (solo `dark:` puntuales)

## programa-rediseno

- [x] T4: Tipo de tema en los datos
  - Acceptance: `LessonNode` trae `requires_submission`; helper `lessonKind()` → bitácora / video / lectura; número de bitácora por orden.
  - Verify: `check:fast`.
  - Files: `cursos/[cursoId]/page.tsx`, `CursoContent.tsx`

- [x] T5: Hero, pestañas (Módulos / Astillero / Misiones / Archivos institucionales) y lateral nuevos
  - Files: `page.tsx`, `CursoContent.tsx`, `ProgramaIlustraciones.tsx` (nuevo)

- [x] T6: Módulos: estantería de lomos, filtros por tipo, tarjeta de módulo (chip, resumen, progreso, cinta), grilla de temas por tipo; conserva Continuar / módulo actual / vista organizador
  - Files: `CursoContent.tsx`, `ProgramaIlustraciones.tsx`

- [x] T7: Astillero (talleres) con el estilo nuevo; conserva "Marcar vista"
  - Files: `CursoContent.tsx`

- [x] T8: Misiones: tarjeta + lista de personajes animados (Tripulante, Vigía; agregar uno = una entrada); estados bloqueada / entregada / completada
  - Files: `CursoContent.tsx`, `ProgramaIlustraciones.tsx`

- [x] T9: Biblioteca de archivos: estantes de hasta 6 libros, ficha del seleccionado con "Abrir enlace"; usable con teclado
  - Verify: **Checkpoint** visual claro/oscuro, 1362 px y 390 px.
  - Files: `CursoContent.tsx`, `ProgramaIlustraciones.tsx`

- [x] T10: Cierre
  - Acceptance: `check:task` pasa; `check:size` campus ≤ 331 kB; entrada en `apps/marketing/src/data/changelog.ts` en español llano.
  - Files: `changelog.ts`

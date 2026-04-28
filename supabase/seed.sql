-- ============================================================
-- SEED DATA — HOME Experience / CRESER
-- Datos de prueba para visualizar todas las vistas del campus
-- y el panel de administración.
--
-- IMPORTANTE:
--   • Ejecutar en el SQL Editor de Supabase.
--   • Requiere migraciones 000000–000012 aplicadas.
--   • Los perfiles seed tienen user_id NULL (no pueden hacer login).
--   • Al final del script se enrola automáticamente al primer
--     admin/sysadmin encontrado en la DB, para que pueda
--     explorar el campus con datos reales.
--   • Ejecutar una sola vez. Si necesitás re-ejecutar, primero
--     corré el bloque CLEANUP al final (descomentalo).
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. CURSOS LMS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.courses (id, title, description, cover_image_url, is_published) VALUES
(
  '22222222-2222-2222-2222-000000000001',
  'Programa Inicial de Coaching Ontológico',
  'Un recorrido profundo por los fundamentos del Coaching Ontológico. Vas a explorar el lenguaje, las emociones, el cuerpo y la forma en que te relacionás con el mundo para producir transformaciones reales en tu vida.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
  true
),
(
  '22222222-2222-2222-2222-000000000002',
  'Programa Avanzado de Liderazgo',
  'Para quienes completaron el Inicial. Profundizamos en liderazgo ontológico, equipos de alto rendimiento y la conversación como herramienta de transformación organizacional.',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. MÓDULOS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.modules (id, course_id, title, order_index, is_published) VALUES
-- Curso 1
('33333333-3333-3333-3333-000000000001', '22222222-2222-2222-2222-000000000001', 'Módulo 1 — Fundamentos del Ser',           1, true),
('33333333-3333-3333-3333-000000000002', '22222222-2222-2222-2222-000000000001', 'Módulo 2 — El Observador y los Dominios',  2, true),
('33333333-3333-3333-3333-000000000003', '22222222-2222-2222-2222-000000000001', 'Módulo 3 — Emociones y Estados de Ánimo',  3, true),
('33333333-3333-3333-3333-000000000004', '22222222-2222-2222-2222-000000000001', 'Módulo 4 — Conversaciones Efectivas',      4, true),
-- Curso 2
('33333333-3333-3333-3333-000000000005', '22222222-2222-2222-2222-000000000002', 'Módulo 1 — Liderazgo Ontológico',          1, true),
('33333333-3333-3333-3333-000000000006', '22222222-2222-2222-2222-000000000002', 'Módulo 2 — Equipos de Alto Rendimiento',   2, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. LECCIONES
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.lessons (id, module_id, title, description, video_url, duration_seconds, order_index, is_published) VALUES
-- Módulo 1
('44444444-4444-4444-4444-000000000001', '33333333-3333-3333-3333-000000000001',
  '¿Qué es el Coaching Ontológico?',
  'Introducción a los orígenes del Coaching Ontológico, sus bases filosóficas y cómo se diferencia de otras modalidades de coaching. Exploraremos por qué el "ser" es el punto de partida de todo cambio genuino.',
  'https://www.youtube.com/watch?v=qp0HIF3SfI4', 1080, 1, true),

('44444444-4444-4444-4444-000000000002', '33333333-3333-3333-3333-000000000001',
  'El Ser y el Hacer',
  'Exploramos la distinción fundamental entre el ser y el hacer. ¿Por qué cambiamos lo que hacemos y sin embargo los resultados se repiten? La respuesta está en quiénes somos como observadores.',
  'https://www.youtube.com/watch?v=iCvmsMzlF7o', 1260, 2, true),

('44444444-4444-4444-4444-000000000003', '33333333-3333-3333-3333-000000000001',
  'El Lenguaje como Acción',
  'Desde la visión ontológica, el lenguaje no es solo descripción: es acción. Los seres humanos somos seres lingüísticos y las conversaciones que tenemos (y las que no) crean nuestra realidad.',
  'https://www.youtube.com/watch?v=eIho2S0ZahI', 900, 3, true),

-- Módulo 2
('44444444-4444-4444-4444-000000000004', '33333333-3333-3333-3333-000000000002',
  'El Observador que Somos',
  'Cada persona actúa según el observador que es. Distintos observadores, frente a la misma realidad, ven cosas distintas y actúan distinto. Comprender esto abre la posibilidad del cambio.',
  'https://www.youtube.com/watch?v=Ks-_Mh1QhMc', 1200, 1, true),

('44444444-4444-4444-4444-000000000005', '33333333-3333-3333-3333-000000000002',
  'Los Tres Dominios del Ser',
  'El cuerpo, las emociones y el lenguaje son los tres dominios desde los cuales el ser humano existe. Aprender a intervenir en cada uno de ellos es la base del cambio ontológico.',
  'https://www.youtube.com/watch?v=rrkrvAUbU9Y', 1500, 2, true),

('44444444-4444-4444-4444-000000000006', '33333333-3333-3333-3333-000000000002',
  'Juicios y Afirmaciones',
  'Una de las distinciones más poderosas del coaching: la diferencia entre afirmaciones (verificables) y juicios (interpretaciones). Aprender a separar unos de otros transforma cómo nos relacionamos.',
  'https://www.youtube.com/watch?v=psN1DORYYV0', 1320, 3, true),

-- Módulo 3
('44444444-4444-4444-4444-000000000007', '33333333-3333-3333-3333-000000000003',
  'Las Emociones como Disposición para la Acción',
  'Las emociones no son "lo que nos pasa": son predisposiciones al movimiento. Cada emoción abre ciertos caminos y cierra otros. Aprender a habitarlas con conciencia cambia todo.',
  'https://www.youtube.com/watch?v=w-HYZv6HzAs', 1440, 1, true),

('44444444-4444-4444-4444-000000000008', '33333333-3333-3333-3333-000000000003',
  'Gratitud y Apertura',
  'La gratitud como práctica ontológica. Cómo cultivar estados de apertura y confianza que expandan nuestra capacidad de aprender y relacionarnos. Ejercicio práctico incluido.',
  'https://www.youtube.com/watch?v=GXy__kBVq1M', 960, 2, true),

('44444444-4444-4444-4444-000000000009', '33333333-3333-3333-3333-000000000003',
  'Transformando el Miedo en Aprendizaje',
  'El miedo es información. En esta clase exploramos cómo relacionarnos de manera diferente con el miedo y convertirlo en un maestro que nos mueve hacia el crecimiento.',
  'https://www.youtube.com/watch?v=8KkKuTCFvzI', 1380, 3, true),

-- Módulo 4
('44444444-4444-4444-4444-000000000010', '33333333-3333-3333-3333-000000000004',
  'Actos del Habla Fundamentales',
  'Peticiones, ofertas, promesas, afirmaciones y declaraciones son los actos del habla que coordinan la acción humana. Dominarlos te da un poder enorme en cualquier conversación.',
  'https://www.youtube.com/watch?v=R0JKCYZ8hng', 1560, 1, true),

('44444444-4444-4444-4444-000000000011', '33333333-3333-3333-3333-000000000004',
  'Anatomía de una Conversación de Coaching',
  'Cómo se estructura una sesión de coaching. El arte de la pregunta poderosa, el escuchar activo y el papel del silencio. Demos en vivo con análisis.',
  'https://www.youtube.com/watch?v=RcGyVTAoXEU', 2100, 2, true),

('44444444-4444-4444-4444-000000000012', '33333333-3333-3333-3333-000000000004',
  'Practicando el Escuchar Generativo',
  'El escuchar no es pasivo: es una acción. El escuchar generativo crea nuevas posibilidades para quien habla. En esta clase practicamos esta habilidad fundamental.',
  'https://www.youtube.com/watch?v=saXfavo1OQo', 1620, 3, true),

-- Módulo 5 (Avanzado)
('44444444-4444-4444-4444-000000000013', '33333333-3333-3333-3333-000000000005',
  '¿Qué es un Líder Ontológico?',
  'El liderazgo ontológico parte de una premisa simple: liderás desde quien sos, no desde lo que sabés. Exploramos las competencias del líder ontológico y cómo desarrollarlas.',
  'https://www.youtube.com/watch?v=qp0HIF3SfI4', 1680, 1, true),

('44444444-4444-4444-4444-000000000014', '33333333-3333-3333-3333-000000000005',
  'Visión, Misión y Propósito',
  'Sin claridad sobre el para qué, el liderazgo se convierte en gestión. Trabajamos en articular una visión inspiradora y construir equipos alineados alrededor de un propósito compartido.',
  'https://www.youtube.com/watch?v=u4ZoJKF_VuA', 1800, 2, true),

('44444444-4444-4444-4444-000000000015', '33333333-3333-3333-3333-000000000005',
  'Construyendo Confianza en los Equipos',
  'La confianza no se declara: se construye. Aprenderemos los fundamentos de la confianza (sinceridad, competencia, responsabilidad) y cómo repararla cuando se rompe.',
  'https://www.youtube.com/watch?v=lmyZMtPVodo', 1920, 3, true),

-- Módulo 6 (Avanzado)
('44444444-4444-4444-4444-000000000016', '33333333-3333-3333-3333-000000000006',
  'Dinámica de Equipos de Alto Rendimiento',
  'Qué tienen en común los equipos que logran resultados extraordinarios. Roles, conversaciones, compromisos y la gestión del quiebre como herramienta de aprendizaje colectivo.',
  'https://www.youtube.com/watch?v=H14bBuluwB8', 2400, 1, true),

('44444444-4444-4444-4444-000000000017', '33333333-3333-3333-3333-000000000006',
  'Conversaciones Difíciles que Transforman',
  'Cómo diseñar y sostener conversaciones que nadie quiere tener pero todos necesitan. La estructura de las conversaciones de quiebre y cómo convertirlas en oportunidades de aprendizaje.',
  'https://www.youtube.com/watch?v=ReRcHdeUG9Y', 2280, 2, true)

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. RECURSOS DE LECCIONES
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.lesson_resources (lesson_id, title, file_url, type) VALUES
('44444444-4444-4444-4444-000000000001', 'Introducción al Coaching Ontológico — Resumen PDF', 'https://www.rafaelecheverria.com/wp-content/uploads/2015/10/ontologia_lenguaje.pdf', 'pdf'),
('44444444-4444-4444-4444-000000000001', 'Rafael Echeverría — Ontología del Lenguaje', 'https://www.rafaelecheverria.com/ontologia-del-lenguaje/', 'link'),
('44444444-4444-4444-4444-000000000002', 'El Ser y el Hacer — Ejercicio de reflexión', 'https://drive.google.com/file/d/seed-exercise-1', 'pdf'),
('44444444-4444-4444-4444-000000000004', 'Los Dominios del Ser — Mapa conceptual', 'https://drive.google.com/file/d/seed-map-1', 'pdf'),
('44444444-4444-4444-4444-000000000006', 'Juicios vs Afirmaciones — Guía práctica', 'https://drive.google.com/file/d/seed-guide-1', 'pdf'),
('44444444-4444-4444-4444-000000000010', 'Actos del Habla — Ficha de referencia', 'https://drive.google.com/file/d/seed-acts-1', 'pdf'),
('44444444-4444-4444-4444-000000000011', 'Plantilla de sesión de coaching', 'https://drive.google.com/file/d/seed-template-1', 'pdf'),
('44444444-4444-4444-4444-000000000013', 'Modelo de Liderazgo Ontológico — Cuadro resumen', 'https://drive.google.com/file/d/seed-leadership-1', 'pdf'),
('44444444-4444-4444-4444-000000000015', 'El modelo CARE de confianza', 'https://drive.google.com/file/d/seed-trust-1', 'pdf');

-- ─────────────────────────────────────────────────────────────
-- 5. CICLOS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.cycles (id, name, start_date, end_date, status, type, capacity, enrolled_count, course_id) VALUES
(
  '55555555-5555-5555-5555-000000000001',
  'Ciclo Inicial 2026-A',
  '2026-01-06', '2026-05-29',
  'active', 'initial', 20, 5,
  '22222222-2222-2222-2222-000000000001'
),
(
  '55555555-5555-5555-5555-000000000002',
  'Ciclo Inicial 2026-B',
  '2026-06-02', '2026-09-25',
  'active', 'initial', 20, 2,
  '22222222-2222-2222-2222-000000000001'
),
(
  '55555555-5555-5555-5555-000000000003',
  'Ciclo Avanzado 2026',
  '2026-03-03', '2026-07-10',
  'active', 'advanced', 15, 3,
  '22222222-2222-2222-2222-000000000002'
),
(
  '55555555-5555-5555-5555-000000000004',
  'Plan Líder 2026',
  '2026-02-03', '2026-08-28',
  'active', 'plan_lider', 12, 0,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. SESIONES DE CICLOS (fechas reales, martes y viernes)
-- ─────────────────────────────────────────────────────────────

-- Ciclo Inicial 2026-A (enero → mayo)
INSERT INTO public.cycle_sessions (cycle_id, session_date, label, is_mandatory) VALUES
('55555555-5555-5555-5555-000000000001', '2026-01-06', 'Clase 1 — Bienvenida e Introducción', true),
('55555555-5555-5555-5555-000000000001', '2026-01-09', 'Clase 2 — El Ser y el Hacer', true),
('55555555-5555-5555-5555-000000000001', '2026-01-13', 'Clase 3 — El Lenguaje como Acción', true),
('55555555-5555-5555-5555-000000000001', '2026-01-16', 'Clase 4 — Práctica Grupal 1', false),
('55555555-5555-5555-5555-000000000001', '2026-01-20', 'Clase 5 — El Observador', true),
('55555555-5555-5555-5555-000000000001', '2026-01-23', 'Clase 6 — Los Tres Dominios', true),
('55555555-5555-5555-5555-000000000001', '2026-01-27', 'Clase 7 — Juicios y Afirmaciones', true),
('55555555-5555-5555-5555-000000000001', '2026-01-30', 'Clase 8 — Práctica Grupal 2', false),
('55555555-5555-5555-5555-000000000001', '2026-02-03', 'Clase 9 — Emociones', true),
('55555555-5555-5555-5555-000000000001', '2026-02-06', 'Clase 10 — Gratitud y Apertura', true),
('55555555-5555-5555-5555-000000000001', '2026-02-10', 'Clase 11 — Transformando el Miedo', true),
('55555555-5555-5555-5555-000000000001', '2026-02-13', 'Clase 12 — Práctica Grupal 3', false),
('55555555-5555-5555-5555-000000000001', '2026-02-17', 'Clase 13 — Actos del Habla', true),
('55555555-5555-5555-5555-000000000001', '2026-02-20', 'Clase 14 — Conversación de Coaching', true),
('55555555-5555-5555-5555-000000000001', '2026-02-24', 'Clase 15 — El Escuchar Generativo', true),
('55555555-5555-5555-5555-000000000001', '2026-02-27', 'Clase 16 — Práctica Grupal 4', false),
('55555555-5555-5555-5555-000000000001', '2026-03-03', 'Clase 17 — Integración Módulos 1-4', true),
('55555555-5555-5555-5555-000000000001', '2026-03-06', 'Clase 18 — Autoevaluación', false),
('55555555-5555-5555-5555-000000000001', '2026-03-10', 'Clase 19 — Práctica de cierre', true),
('55555555-5555-5555-5555-000000000001', '2026-03-13', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-03-17', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-03-20', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-03-24', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-03-27', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-04-07', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-04-10', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-04-14', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-04-17', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-04-28', 'Clase 30 — Sesión de seguimiento', true),
('55555555-5555-5555-5555-000000000001', '2026-05-05', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-05-08', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-05-12', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-05-15', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-05-19', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-05-22', NULL, false),
('55555555-5555-5555-5555-000000000001', '2026-05-26', NULL, true),
('55555555-5555-5555-5555-000000000001', '2026-05-29', 'Clase de Cierre — Graduación', true)
ON CONFLICT (cycle_id, session_date) DO NOTHING;

-- Ciclo Inicial 2026-B (junio → septiembre)
INSERT INTO public.cycle_sessions (cycle_id, session_date, label, is_mandatory) VALUES
('55555555-5555-5555-5555-000000000002', '2026-06-02', 'Clase 1 — Bienvenida e Introducción', true),
('55555555-5555-5555-5555-000000000002', '2026-06-05', 'Clase 2 — El Ser y el Hacer', true),
('55555555-5555-5555-5555-000000000002', '2026-06-09', 'Clase 3 — El Lenguaje como Acción', true),
('55555555-5555-5555-5555-000000000002', '2026-06-12', 'Clase 4 — Práctica Grupal 1', false),
('55555555-5555-5555-5555-000000000002', '2026-06-16', 'Clase 5 — El Observador', true),
('55555555-5555-5555-5555-000000000002', '2026-06-19', 'Clase 6 — Los Tres Dominios', true),
('55555555-5555-5555-5555-000000000002', '2026-06-23', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-06-26', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-06-30', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-03', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-07', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-10', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-07-14', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-17', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-07-21', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-24', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-07-28', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-07-31', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-08-04', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-08-07', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-08-11', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-08-14', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-08-18', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-08-21', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-08-25', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-08-28', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-09-01', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-09-04', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-09-08', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-09-11', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-09-15', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-09-18', NULL, false),
('55555555-5555-5555-5555-000000000002', '2026-09-22', NULL, true),
('55555555-5555-5555-5555-000000000002', '2026-09-25', 'Clase de Cierre — Graduación', true)
ON CONFLICT (cycle_id, session_date) DO NOTHING;

-- Ciclo Avanzado 2026 (marzo → julio)
INSERT INTO public.cycle_sessions (cycle_id, session_date, label, is_mandatory) VALUES
('55555555-5555-5555-5555-000000000003', '2026-03-03', 'Clase 1 — Liderazgo Ontológico: Introducción', true),
('55555555-5555-5555-5555-000000000003', '2026-03-06', 'Clase 2 — Visión y Propósito', true),
('55555555-5555-5555-5555-000000000003', '2026-03-10', 'Clase 3 — Confianza en los Equipos', true),
('55555555-5555-5555-5555-000000000003', '2026-03-13', 'Clase 4 — Práctica Grupal', false),
('55555555-5555-5555-5555-000000000003', '2026-03-17', 'Clase 5 — Dinámica de Equipos', true),
('55555555-5555-5555-5555-000000000003', '2026-03-20', 'Clase 6 — Conversaciones Difíciles', true),
('55555555-5555-5555-5555-000000000003', '2026-03-24', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-03-27', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-04-07', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-04-10', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-04-14', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-04-17', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-04-28', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-05-05', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-05-08', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-05-12', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-05-15', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-05-19', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-05-22', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-05-26', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-05-29', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-06-02', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-06-05', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-06-09', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-06-12', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-06-16', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-06-19', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-06-23', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-06-26', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-06-30', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-07-03', NULL, false),
('55555555-5555-5555-5555-000000000003', '2026-07-07', NULL, true),
('55555555-5555-5555-5555-000000000003', '2026-07-10', 'Clase de Cierre — Integración Final', true)
ON CONFLICT (cycle_id, session_date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. PERFILES (alumnos seed — user_id NULL, no pueden loguearse)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.profiles
  (id, user_id, email, first_name, last_name, phone, role, bio, instagram)
VALUES
(
  '11111111-1111-1111-1111-000000000001', NULL,
  'juan.martinez@seed.creser.ar', 'Juan Ignacio', 'Martínez',
  '+54 9 11 5543-2210', 'student',
  'Licenciado en Recursos Humanos. Busco herramientas para liderar equipos con más conciencia y empatía.',
  'juanignaciom'
),
(
  '11111111-1111-1111-1111-000000000002', NULL,
  'valentina.rodriguez@seed.creser.ar', 'Valentina', 'Rodríguez',
  '+54 9 11 6621-4430', 'student',
  'Psicóloga clínica. El coaching ontológico me pareció un complemento perfecto para mi práctica profesional.',
  'vale.rod.psi'
),
(
  '11111111-1111-1111-1111-000000000003', NULL,
  'sebastian.gonzalez@seed.creser.ar', 'Sebastián', 'González',
  '+54 9 11 4478-9901', 'student',
  'Emprendedor en el sector tecnológico. Vengo a trabajar mi liderazgo personal.',
  NULL
),
(
  '11111111-1111-1111-1111-000000000004', NULL,
  'florencia.lopez@seed.creser.ar', 'Florencia', 'López',
  '+54 9 11 2234-5567', 'student',
  'Docente y mediadora. El trabajo en comunicación no violenta me trajo hasta acá.',
  'flor.lopez.edu'
),
(
  '11111111-1111-1111-1111-000000000005', NULL,
  'matias.fernandez@seed.creser.ar', 'Matías', 'Fernández',
  '+54 9 351 887-2211', 'student',
  NULL, NULL
),
(
  '11111111-1111-1111-1111-000000000006', NULL,
  'carolina.sanchez@seed.creser.ar', 'Carolina', 'Sánchez',
  '+54 9 11 7732-6610', 'student',
  'Gerenta de marketing. Estoy en el Avanzado para seguir profundizando.',
  'caro.sanchez.mkt'
),
(
  '11111111-1111-1111-1111-000000000007', NULL,
  'diego.herrera@seed.creser.ar', 'Diego', 'Herrera',
  '+54 9 11 9945-1100', 'student',
  NULL, NULL
),
(
  '11111111-1111-1111-1111-000000000008', NULL,
  'luciana.perez@seed.creser.ar', 'Luciana', 'Pérez',
  '+54 9 11 3312-8870', 'student',
  'Coach en formación. Completé el Inicial y ahora estoy en el Avanzado.',
  'luci.perez.coach'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 8. INFORMACIÓN MÉDICA / EMERGENCIA (algunos perfiles)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.medical_info
  (user_id, under_treatment, medication, allergies, emergency_contact_name, emergency_contact_phone)
VALUES
('11111111-1111-1111-1111-000000000001', false, NULL, NULL, 'María Martínez', '+54 9 11 5543-0000'),
('11111111-1111-1111-1111-000000000002', true, 'Sertralina 50mg', 'Ibuprofeno', 'Carlos Rodríguez', '+54 9 11 6621-0000'),
('11111111-1111-1111-1111-000000000004', false, NULL, 'Polen de gramíneas', 'Roberto López', '+54 9 11 2234-0000'),
('11111111-1111-1111-1111-000000000008', false, NULL, NULL, 'Marcelo Pérez', '+54 9 11 3312-0000')
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 9. ENROLLMENTS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.enrollments (id, user_id, cycle_id, status, payment_status) VALUES
-- Ciclo Inicial 2026-A
('66666666-6666-6666-6666-000000000001', '11111111-1111-1111-1111-000000000001', '55555555-5555-5555-5555-000000000001', 'active', 'paid'),
('66666666-6666-6666-6666-000000000002', '11111111-1111-1111-1111-000000000002', '55555555-5555-5555-5555-000000000001', 'active', 'paid'),
('66666666-6666-6666-6666-000000000003', '11111111-1111-1111-1111-000000000003', '55555555-5555-5555-5555-000000000001', 'active', 'paid'),
('66666666-6666-6666-6666-000000000004', '11111111-1111-1111-1111-000000000004', '55555555-5555-5555-5555-000000000001', 'active', 'paid'),
('66666666-6666-6666-6666-000000000005', '11111111-1111-1111-1111-000000000005', '55555555-5555-5555-5555-000000000001', 'active', 'pending'),
-- Ciclo Inicial 2026-B
('66666666-6666-6666-6666-000000000006', '11111111-1111-1111-1111-000000000006', '55555555-5555-5555-5555-000000000002', 'active', 'paid'),
('66666666-6666-6666-6666-000000000007', '11111111-1111-1111-1111-000000000007', '55555555-5555-5555-5555-000000000002', 'active', 'paid'),
-- Ciclo Avanzado 2026
('66666666-6666-6666-6666-000000000008', '11111111-1111-1111-1111-000000000008', '55555555-5555-5555-5555-000000000003', 'active', 'paid'),
('66666666-6666-6666-6666-000000000009', '11111111-1111-1111-1111-000000000001', '55555555-5555-5555-5555-000000000003', 'active', 'paid'),
('66666666-6666-6666-6666-000000000010', '11111111-1111-1111-1111-000000000006', '55555555-5555-5555-5555-000000000003', 'active', 'paid')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. PAGOS
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.payments (enrollment_id, amount, method, status, paid_at) VALUES
('66666666-6666-6666-6666-000000000001', 190000, 'transferencia', 'paid', '2025-12-20 10:30:00+00'),
('66666666-6666-6666-6666-000000000002', 190000, 'transferencia', 'paid', '2025-12-22 14:15:00+00'),
('66666666-6666-6666-6666-000000000003', 190000, 'mercadopago',   'paid', '2025-12-23 09:00:00+00'),
('66666666-6666-6666-6666-000000000004', 190000, 'transferencia', 'paid', '2026-01-02 11:00:00+00'),
('66666666-6666-6666-6666-000000000005', 190000, 'efectivo',      'pending', NULL),
('66666666-6666-6666-6666-000000000006', 190000, 'transferencia', 'paid', '2026-04-10 16:00:00+00'),
('66666666-6666-6666-6666-000000000007', 190000, 'mercadopago',   'paid', '2026-04-12 10:45:00+00'),
('66666666-6666-6666-6666-000000000008', 230000, 'transferencia', 'paid', '2026-02-20 12:00:00+00'),
('66666666-6666-6666-6666-000000000009', 230000, 'transferencia', 'paid', '2026-02-21 09:30:00+00'),
('66666666-6666-6666-6666-000000000010', 230000, 'mercadopago',   'paid', '2026-02-25 14:00:00+00');

-- ─────────────────────────────────────────────────────────────
-- 11. ASISTENCIA (sesiones pasadas del Ciclo Inicial 2026-A)
-- ─────────────────────────────────────────────────────────────

-- Obtenemos los IDs de las sesiones ya insertadas para cruzarlos
-- Alumno p1 (Juan) — muy buena asistencia
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000001', cs.id, 'present'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date < CURRENT_DATE
  AND cs.session_date NOT IN ('2026-02-13', '2026-03-20')
ON CONFLICT DO NOTHING;

INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000001', cs.id, 'absent'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date IN ('2026-02-13', '2026-03-20')
ON CONFLICT DO NOTHING;

-- Alumno p2 (Valentina) — buena asistencia, llegó tarde a una
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000002', cs.id, 'present'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date < CURRENT_DATE
  AND cs.session_date NOT IN ('2026-01-30', '2026-02-27', '2026-03-27')
ON CONFLICT DO NOTHING;

INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000002', cs.id, 'late'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date = '2026-01-30'
ON CONFLICT DO NOTHING;

INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000002', cs.id, 'absent'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date IN ('2026-02-27', '2026-03-27')
ON CONFLICT DO NOTHING;

-- Alumno p3 (Sebastián) — asistencia irregular
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000003', cs.id,
  CASE WHEN cs.session_date IN ('2026-01-16','2026-01-30','2026-02-06','2026-02-20','2026-03-06','2026-03-20','2026-03-27','2026-04-10') THEN 'absent'
       WHEN cs.session_date IN ('2026-01-23') THEN 'late'
       ELSE 'present' END
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date < CURRENT_DATE
ON CONFLICT DO NOTHING;

-- Alumno p4 (Florencia) — asistencia perfecta
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000004', cs.id, 'present'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date < CURRENT_DATE
ON CONFLICT DO NOTHING;

-- Alumno p5 (Matías) — pocas clases, empezó tarde
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000005', cs.id, 'present'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000001'
  AND cs.session_date >= '2026-03-17'
  AND cs.session_date < CURRENT_DATE
ON CONFLICT DO NOTHING;

-- Ciclo Avanzado — p8 (Luciana) y p1 (Juan)
INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000008', cs.id, 'present'
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000003'
  AND cs.session_date < CURRENT_DATE
ON CONFLICT DO NOTHING;

INSERT INTO public.attendance (enrollment_id, cycle_session_id, status)
SELECT '66666666-6666-6666-6666-000000000009', cs.id,
  CASE WHEN cs.session_date IN ('2026-03-13','2026-04-10') THEN 'absent' ELSE 'present' END
FROM public.cycle_sessions cs
WHERE cs.cycle_id = '55555555-5555-5555-5555-000000000003'
  AND cs.session_date < CURRENT_DATE
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 12. PROGRESO DE LECCIONES
-- ─────────────────────────────────────────────────────────────

-- Juan (p1): completó módulo 1 completo + módulo 2 completo + 2 de módulo 3
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000001', true,  '2026-01-07 20:00:00+00', 1080),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000002', true,  '2026-01-10 21:00:00+00', 1260),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000003', true,  '2026-01-14 19:30:00+00', 900),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000004', true,  '2026-01-21 20:00:00+00', 1200),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000005', true,  '2026-01-24 21:30:00+00', 1500),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000006', true,  '2026-01-28 20:15:00+00', 1320),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000007', true,  '2026-02-04 19:00:00+00', 1440),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000008', true,  '2026-02-07 20:45:00+00', 960),
-- Avanzado: Juan también completó algunas lecciones
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000013', true,  '2026-03-04 20:00:00+00', 1680),
('11111111-1111-1111-1111-000000000001', '44444444-4444-4444-4444-000000000014', true,  '2026-03-07 21:00:00+00', 1800)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Valentina (p2): módulo 1 completo + primera lección del módulo 2
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000002', '44444444-4444-4444-4444-000000000001', true, '2026-01-08 22:00:00+00', 1080),
('11111111-1111-1111-1111-000000000002', '44444444-4444-4444-4444-000000000002', true, '2026-01-11 20:30:00+00', 1260),
('11111111-1111-1111-1111-000000000002', '44444444-4444-4444-4444-000000000003', true, '2026-01-15 21:00:00+00', 900),
('11111111-1111-1111-1111-000000000002', '44444444-4444-4444-4444-000000000004', true, '2026-01-22 20:00:00+00', 1200)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Sebastián (p3): módulo 1 completo
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000003', '44444444-4444-4444-4444-000000000001', true, '2026-01-07 19:00:00+00', 1080),
('11111111-1111-1111-1111-000000000003', '44444444-4444-4444-4444-000000000002', true, '2026-01-12 21:00:00+00', 1260),
('11111111-1111-1111-1111-000000000003', '44444444-4444-4444-4444-000000000003', true, '2026-01-14 20:00:00+00', 900)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Florencia (p4): módulos 1 y 2 completos
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000001', true, '2026-01-07 18:30:00+00', 1080),
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000002', true, '2026-01-10 20:00:00+00', 1260),
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000003', true, '2026-01-13 21:30:00+00', 900),
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000004', true, '2026-01-20 19:00:00+00', 1200),
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000005', true, '2026-01-23 20:30:00+00', 1500),
('11111111-1111-1111-1111-000000000004', '44444444-4444-4444-4444-000000000006', true, '2026-01-27 21:00:00+00', 1320)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Matías (p5): solo vio las primeras 2 lecciones
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000005', '44444444-4444-4444-4444-000000000001', true,  '2026-03-20 22:00:00+00', 1080),
('11111111-1111-1111-1111-000000000005', '44444444-4444-4444-4444-000000000002', false, NULL, 430)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Luciana (p8): módulo 5 completo (Avanzado) + parcial módulo 6
INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds) VALUES
('11111111-1111-1111-1111-000000000008', '44444444-4444-4444-4444-000000000013', true,  '2026-03-04 19:30:00+00', 1680),
('11111111-1111-1111-1111-000000000008', '44444444-4444-4444-4444-000000000014', true,  '2026-03-07 20:00:00+00', 1800),
('11111111-1111-1111-1111-000000000008', '44444444-4444-4444-4444-000000000015', true,  '2026-03-11 21:30:00+00', 1920),
('11111111-1111-1111-1111-000000000008', '44444444-4444-4444-4444-000000000016', false, NULL, 800)
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 13. POSTS DEL FORO
-- ─────────────────────────────────────────────────────────────

-- Posts raíz
INSERT INTO public.forum_posts (id, course_id, user_id, title, body, parent_id) VALUES
(
  '77777777-7777-7777-7777-000000000001',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000002',
  'Duda sobre la distinción juicios / afirmaciones',
  'Hola a todos. Estuve repasando el módulo 2 y me quedó una duda. Cuando alguien dice "vos sos irresponsable", ¿eso es siempre un juicio o puede ser una afirmación verificable? Me cuesta hacer la distinción cuando la carga emocional es alta. ¿Les pasó algo similar?',
  NULL
),
(
  '77777777-7777-7777-7777-000000000002',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000004',
  'Compartiendo mi experiencia con los actos del habla',
  'Quería compartir algo que me pasó esta semana usando las herramientas del módulo 4. Tuve una conversación con mi jefa sobre una promesa que ella hizo y no cumplió. Por primera vez pude nombrar lo que había pasado (una promesa incumplida) en vez de quedarme solo con la bronca. El resultado fue increíblemente diferente. ¿Alguien más tuvo experiencias así?',
  NULL
),
(
  '77777777-7777-7777-7777-000000000003',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000001',
  '¿Cómo practican el escuchar generativo en el día a día?',
  'Después de la clase sobre el escuchar generativo me quedé pensando: ¿cómo lo llevan a la práctica cotidiana? Para mí lo más difícil es la conversación con mi pareja, donde me cuesta no anticipar lo que va a decir y ya estar respondiendo en mi cabeza.',
  NULL
),
(
  '77777777-7777-7777-7777-000000000004',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000003',
  'El miedo al cambio — reflexión del módulo 3',
  'Me impactó mucho la clase sobre las emociones como disposición. Siempre pensé que mi resistencia al cambio era un defecto de carácter. Poder verla como una emoción que me "protege" de lo desconocido me cambió el observador por completo. Gracias.',
  NULL
),
(
  '77777777-7777-7777-7777-000000000005',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000005',
  'Pregunta sobre el acceso a las grabaciones',
  'Hola, me incorporé un poco tarde al ciclo. ¿Las clases sincrónicas quedan grabadas en algún lado? No encontré donde verlas.',
  NULL
),
(
  '77777777-7777-7777-7777-000000000006',
  '22222222-2222-2222-2222-000000000002',
  '11111111-1111-1111-1111-000000000008',
  'Reflexión: liderazgo ontológico vs liderazgo transaccional',
  'En el módulo 1 del Avanzado empecé a notar cuántos líderes que conozco (yo incluida) operan en modo "transaccional": doy para recibir, management por objetivos, conversaciones de rendición de cuentas sin escucha real. El liderazgo ontológico propone algo radicalmente diferente. ¿Cómo están integrando este cambio de paradigma?',
  NULL
),
(
  '77777777-7777-7777-7777-000000000007',
  '22222222-2222-2222-2222-000000000002',
  '11111111-1111-1111-1111-000000000001',
  'Práctica de conversaciones difíciles — ¿cómo se preparan?',
  'Para la próxima clase necesitamos traer una conversación difícil pendiente. Quiero saber cómo otros se preparan. Yo lo intento escribir antes, pero cuando llega el momento real me olvido de todo lo que planifiqué.',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Respuestas
INSERT INTO public.forum_posts (id, course_id, user_id, title, body, parent_id) VALUES
(
  '77777777-7777-7777-7777-000000000011',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000001',
  NULL,
  '"Vos sos irresponsable" siempre es un juicio, nunca una afirmación. Para que sea afirmación tendría que poder verificarse con evidencia concreta, como "no entregaste el informe el lunes cuando dijiste que lo harías". La carga emocional no cambia la distinción, solo hace más difícil verla en el momento. Con práctica se vuelve más natural.',
  '77777777-7777-7777-7777-000000000001'
),
(
  '77777777-7777-7777-7777-000000000012',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000004',
  NULL,
  'A mí me ayudó mucho preguntarme: "¿podría grabar esto y mostrárselo a alguien para que lo compruebe?" Si la respuesta es no, probablemente es un juicio. Igual, el hecho de poder hacer la distinción ya es un logro enorme, especialmente cuando hay mucha emoción de por medio.',
  '77777777-7777-7777-7777-000000000001'
),
(
  '77777777-7777-7777-7777-000000000013',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000002',
  NULL,
  'Florencia, ¡qué ejemplo tan poderoso! Yo tuve algo similar con un colega que no cumplía sus compromisos. Usar el lenguaje de "promesa incumplida" sacó la conversación del plano emocional y la puso en uno más factual y manejable. La reacción del otro también fue completamente diferente.',
  '77777777-7777-7777-7777-000000000002'
),
(
  '77777777-7777-7777-7777-000000000014',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000003',
  NULL,
  'El escuchar generativo me costó mucho al principio. Lo que me funcionó fue un ejercicio simple: antes de responder, parafrasear lo que escuché. "Lo que entiendo que estás diciendo es X, ¿es así?" Eso solo ya cambia la dinámica de la conversación.',
  '77777777-7777-7777-7777-000000000003'
),
(
  '77777777-7777-7777-7777-000000000015',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000004',
  NULL,
  'Sebastián, me tocó también eso de la resistencia al cambio. Lo que más me ayudó fue entender que el miedo no es el enemigo: es información. Dice algo sobre lo que valoro. Desde ahí puedo elegir más conscientemente si avanzo o no.',
  '77777777-7777-7777-7777-000000000004'
),
(
  '77777777-7777-7777-7777-000000000016',
  '22222222-2222-2222-2222-000000000001',
  '11111111-1111-1111-1111-000000000001',
  NULL,
  'Matías, las clases sincrónicas no quedan grabadas por política del programa (para fomentar la presencia). Pero los materiales de cada clase sí están disponibles en la sección de recursos de cada lección. Si querés ponerte al día con el contenido teórico, podés usar eso como base.',
  '77777777-7777-7777-7777-000000000005'
),
(
  '77777777-7777-7777-7777-000000000017',
  '22222222-2222-2222-2222-000000000002',
  '11111111-1111-1111-1111-000000000001',
  NULL,
  'Luciana, gran observación. Yo llevo el Inicial y el Avanzado en paralelo y la diferencia de perspectiva entre uno y otro es enorme. Lo que el Inicial plantea como herramientas personales, el Avanzado las lleva al dominio colectivo. La pregunta que me resuena es: ¿qué tipo de conversaciones genero a mi alrededor?',
  '77777777-7777-7777-7777-000000000006'
),
(
  '77777777-7777-7777-7777-000000000018',
  '22222222-2222-2222-2222-000000000002',
  '11111111-1111-1111-1111-000000000006',
  NULL,
  'Para las conversaciones difíciles yo preparo el contexto antes: "Quiero tener una conversación importante con vos, ¿hay un buen momento esta semana?" Eso solo ya cambia el estado emocional de ambos antes de que empiece. Y sí, cuando llega el momento real me olvido del guión, pero la práctica previa igual ayuda a anclar la intención.',
  '77777777-7777-7777-7777-000000000007'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 14. TESTIMONIALES
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.testimonials (author_name, roles, quote, rating, status) VALUES
(
  'Valentina R.',
  ARRAY['Psicóloga Clínica'],
  'El programa me transformó como profesional. Las herramientas del coaching ontológico complementaron mi práctica terapéutica de una manera que no esperaba. Aprendí a escuchar de un modo completamente distinto.',
  5, 'approved'
),
(
  'Juan I. M.',
  ARRAY['Responsable de RRHH'],
  'Vine buscando herramientas de liderazgo y encontré un proceso de transformación personal profundo. El equipo de CRESER te acompaña con una calidez y una profesionalidad excepcionales.',
  5, 'approved'
),
(
  'Florencia L.',
  ARRAY['Docente', 'Mediadora'],
  'Jamás imaginé que un programa de estas características iba a cambiar la forma en que me relaciono con mis alumnos y colegas. Recomendado sin dudarlo.',
  5, 'approved'
),
(
  'Luciana P.',
  ARRAY['Coach en Formación'],
  'Después del Inicial no dudé en inscribirme al Avanzado. Cada módulo te lleva más profundo. El acompañamiento del equipo durante todo el proceso es lo que marca la diferencia.',
  5, 'approved'
),
(
  'Sebastián G.',
  ARRAY['Emprendedor'],
  'Soy bastante escéptico por naturaleza. Entré al programa dudando y salí completamente convencido. Las distinciones que aprendí las aplico todos los días en mi equipo.',
  5, 'approved'
),
(
  'Mariana T.',
  ARRAY['Gerenta General'],
  'Hice el programa hace dos años y sigo usando las herramientas diariamente. De todo lo que invertí en formación profesional, esto fue lo que más impacto real tuvo.',
  5, 'approved'
);

-- ─────────────────────────────────────────────────────────────
-- 15. SUBMISSIONS DE PRUEBA (para ver en Admisiones del admin)
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.form_submissions (id, form_id, email, data, status) VALUES
(
  '88888888-8888-8888-8888-000000000001', NULL,
  'ana.villanueva@gmail.com',
  '{"firstName":"Ana","lastName":"Villanueva","email":"ana.villanueva@gmail.com","phone":"+54 9 11 6543-2211","age":"34","dni":"32456789","city":"Buenos Aires","gender":"Femenino","instagram":"ana.villanueva","intention":"Mejorar mis conversaciones difíciles en el trabajo y desarrollar mi liderazgo personal.","selectedService":"INICIAL"}',
  'pending'
),
(
  '88888888-8888-8888-8888-000000000002', NULL,
  'roberto.casas@outlook.com',
  '{"firstName":"Roberto","lastName":"Casas","email":"roberto.casas@outlook.com","phone":"+54 9 351 445-7732","age":"41","dni":"27891234","city":"Córdoba","gender":"Masculino","instagram":"","intention":"Busco herramientas para gestionar equipos en mi empresa de construcción. Me lo recomendó un ex alumno.","selectedService":"COMBO 1"}',
  'pending'
),
(
  '88888888-8888-8888-8888-000000000003', NULL,
  'camila.rios@yahoo.com',
  '{"firstName":"Camila","lastName":"Ríos","email":"camila.rios@yahoo.com","phone":"+54 9 11 7781-3344","age":"28","dni":"38901234","city":"Buenos Aires","gender":"Femenino","instagram":"cami_rios_coaching","intention":"Quiero formarme como coach y este programa es el que más me resonó.","selectedService":"COMBO 2"}',
  'pending_payment'
),
(
  '88888888-8888-8888-8888-000000000004', NULL,
  'martin.suarez@gmail.com',
  '{"firstName":"Martín","lastName":"Suárez","email":"martin.suarez@gmail.com","phone":"+54 9 11 9012-5566","age":"37","dni":"30123456","city":"Rosario","gender":"Masculino","instagram":"msuarez_hr","intention":"Trabajo en recursos humanos y quiero incorporar el coaching como herramienta en mis procesos de selección y desarrollo.","selectedService":"INICIAL"}',
  'approved'
),
(
  '88888888-8888-8888-8888-000000000005', NULL,
  'natalia.bogado@icloud.com',
  '{"firstName":"Natalia","lastName":"Bogado","email":"natalia.bogado@icloud.com","phone":"+54 9 11 3344-8891","age":"45","dni":"24567890","city":"Buenos Aires","gender":"Femenino","instagram":"","intention":"Me acerco al coaching ontológico después de años de terapia. Quiero explorar otra mirada del cambio personal.","selectedService":"INICIAL"}',
  'pending'
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 16. ENROLAR AL PRIMER ADMIN/SYSADMIN ENCONTRADO
--     Para que pueda explorar el campus con datos reales.
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_profile_id  UUID;
  v_enrollment_id UUID := gen_random_uuid();
BEGIN
  -- Buscar primer perfil con rol admin o sysadmin
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE role IN ('admin', 'sysadmin', 'super_admin')
    AND user_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE NOTICE 'No se encontró ningún perfil admin con user_id. Saltando enrolamiento automático.';
    RETURN;
  END IF;

  -- Enrollment en Ciclo Inicial 2026-A (si no existe)
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = v_profile_id AND cycle_id = '55555555-5555-5555-5555-000000000001'
  ) THEN
    INSERT INTO public.enrollments (id, user_id, cycle_id, status, payment_status)
    VALUES (v_enrollment_id, v_profile_id, '55555555-5555-5555-5555-000000000001', 'active', 'paid');

    -- Pago
    INSERT INTO public.payments (enrollment_id, amount, method, status, paid_at)
    VALUES (v_enrollment_id, 190000, 'transferencia', 'paid', now());

    -- Progreso de lecciones (módulo 1 completo + 2 del módulo 2)
    INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds)
    VALUES
      (v_profile_id, '44444444-4444-4444-4444-000000000001', true, now() - interval '20 days', 1080),
      (v_profile_id, '44444444-4444-4444-4444-000000000002', true, now() - interval '18 days', 1260),
      (v_profile_id, '44444444-4444-4444-4444-000000000003', true, now() - interval '15 days', 900),
      (v_profile_id, '44444444-4444-4444-4444-000000000004', true, now() - interval '12 days', 1200),
      (v_profile_id, '44444444-4444-4444-4444-000000000005', true, now() - interval '10 days', 1500)
    ON CONFLICT (user_id, lesson_id) DO NOTHING;

    RAISE NOTICE 'Admin % enrolado en Ciclo Inicial 2026-A con progreso inicial.', v_profile_id;
  ELSE
    RAISE NOTICE 'Admin % ya tenía enrollment en Ciclo Inicial 2026-A. No se modificó.', v_profile_id;
  END IF;

  -- Enrollment en Ciclo Avanzado 2026 (si no existe)
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = v_profile_id AND cycle_id = '55555555-5555-5555-5555-000000000003'
  ) THEN
    DECLARE
      v_enrollment_adv_id UUID := gen_random_uuid();
    BEGIN
      INSERT INTO public.enrollments (id, user_id, cycle_id, status, payment_status)
      VALUES (v_enrollment_adv_id, v_profile_id, '55555555-5555-5555-5555-000000000003', 'active', 'paid');

      INSERT INTO public.payments (enrollment_id, amount, method, status, paid_at)
      VALUES (v_enrollment_adv_id, 230000, 'transferencia', 'paid', now());

      INSERT INTO public.lesson_progress (user_id, lesson_id, completed, completed_at, last_watched_seconds)
      VALUES
        (v_profile_id, '44444444-4444-4444-4444-000000000013', true, now() - interval '8 days', 1680),
        (v_profile_id, '44444444-4444-4444-4444-000000000014', true, now() - interval '6 days', 1800)
      ON CONFLICT (user_id, lesson_id) DO NOTHING;

      RAISE NOTICE 'Admin % enrolado en Ciclo Avanzado 2026.', v_profile_id;
    END;
  END IF;

END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- CLEANUP (descomentar para limpiar datos seed)
-- CUIDADO: elimina TODOS los datos seed incluyendo los del admin.
-- ─────────────────────────────────────────────────────────────
/*
DELETE FROM public.profiles WHERE email LIKE '%@seed.creser.ar';
DELETE FROM public.cycles WHERE id IN (
  '55555555-5555-5555-5555-000000000001',
  '55555555-5555-5555-5555-000000000002',
  '55555555-5555-5555-5555-000000000003',
  '55555555-5555-5555-5555-000000000004'
);
DELETE FROM public.courses WHERE id IN (
  '22222222-2222-2222-2222-000000000001',
  '22222222-2222-2222-2222-000000000002'
);
DELETE FROM public.form_submissions WHERE id LIKE '88888888-%';
DELETE FROM public.testimonials WHERE author_name IN (
  'Valentina R.','Juan I. M.','Florencia L.','Luciana P.','Sebastián G.','Mariana T.'
);
*/

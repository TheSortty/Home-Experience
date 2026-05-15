DO $$
DECLARE
    v_course_1_id UUID;
    v_course_2_id UUID;
    v_module_1_id UUID;
    v_module_2_id UUID;
    v_cycle_1_id  UUID;
    v_cycle_2_id  UUID;
    v_lesson_id   UUID;
    v_profile_id  UUID;
    i             INTEGER;
BEGIN
    -- Buscamos un perfil existente (idealmente un alumno o admin) para asignarle los posts del foro
    SELECT id INTO v_profile_id FROM public.profiles LIMIT 1;

    -- ==========================================
    -- PROGRAMA 1: Desarrollo Personal
    -- ==========================================
    INSERT INTO public.courses (title, description, is_published)
    VALUES (
        'Programa Avanzado de Desarrollo Personal',
        'Descubre tu máximo potencial a través de 10 clases intensivas con ejercicios prácticos y reflexión profunda.',
        true
    )
    RETURNING id INTO v_course_1_id;

    -- Módulo único para el Programa 1
    INSERT INTO public.modules (course_id, title, order_index, is_published)
    VALUES (v_course_1_id, 'Módulo 1: Fundamentos y Práctica', 1, true)
    RETURNING id INTO v_module_1_id;

    -- Ciclo para el Programa 1 (Calendario)
    INSERT INTO public.cycles (name, start_date, end_date, status, type, capacity, course_id, is_linear)
    VALUES (
        'Ciclo Desarrollo 2026',
        CURRENT_DATE,
        CURRENT_DATE + 70,
        'active',
        'program',
        50,
        v_course_1_id,
        true
    )
    RETURNING id INTO v_cycle_1_id;

    -- Generar 10 clases, sesiones de calendario y posts de foro
    FOR i IN 1..10 LOOP
        -- Insertar Lección (Clase)
        INSERT INTO public.lessons (module_id, title, description, order_index, is_published, duration_seconds)
        VALUES (
            v_module_1_id,
            'Clase ' || i || ' - Introducción al Tema ' || i,
            'En esta clase abordaremos los conceptos clave del tema ' || i || ' con herramientas de aplicación directa.',
            i,
            true,
            1200 + (i * 60)
        )
        RETURNING id INTO v_lesson_id;

        -- Insertar sesión de calendario (1 por semana)
        INSERT INTO public.cycle_sessions (cycle_id, session_date, label, is_mandatory)
        VALUES (
            v_cycle_1_id,
            CURRENT_DATE + (i * 7),
            'Encuentro en vivo Clase ' || i,
            true
        );

        -- Insertar post en el foro asociado a la clase
        IF v_profile_id IS NOT NULL THEN
            INSERT INTO public.forum_posts (course_id, user_id, lesson_id, title, body)
            VALUES (
                v_course_1_id,
                v_profile_id,
                v_lesson_id,
                'Pregunta sobre la Clase ' || i,
                'Me pareció muy interesante la clase ' || i || '. ¿Podemos profundizar en el último punto durante el encuentro?'
            );
        END IF;
    END LOOP;

    -- ==========================================
    -- PROGRAMA 2: Liderazgo y Comunicación
    -- ==========================================
    INSERT INTO public.courses (title, description, is_published)
    VALUES (
        'Master en Liderazgo y Comunicación',
        'Aprende a liderar equipos y comunicarte de forma asertiva en entornos dinámicos y exigentes.',
        true
    )
    RETURNING id INTO v_course_2_id;

    -- Módulo único para el Programa 2
    INSERT INTO public.modules (course_id, title, order_index, is_published)
    VALUES (v_course_2_id, 'Módulo 1: Herramientas de Liderazgo', 1, true)
    RETURNING id INTO v_module_2_id;

    -- Ciclo para el Programa 2 (Calendario)
    INSERT INTO public.cycles (name, start_date, end_date, status, type, capacity, course_id, is_linear)
    VALUES (
        'Ciclo Liderazgo 2026',
        CURRENT_DATE,
        CURRENT_DATE + 70,
        'active',
        'program',
        50,
        v_course_2_id,
        true
    )
    RETURNING id INTO v_cycle_2_id;

    -- Generar 10 clases, sesiones de calendario y posts de foro
    FOR i IN 1..10 LOOP
        -- Insertar Lección (Clase)
        INSERT INTO public.lessons (module_id, title, description, order_index, is_published, duration_seconds)
        VALUES (
            v_module_2_id,
            'Clase ' || i || ' - Habilidad de Comunicación ' || i,
            'Desarrollo y práctica de la habilidad número ' || i || ' para mejorar tu impacto interpersonal.',
            i,
            true,
            1500 + (i * 60)
        )
        RETURNING id INTO v_lesson_id;

        -- Insertar sesión de calendario (1 por semana)
        INSERT INTO public.cycle_sessions (cycle_id, session_date, label, is_mandatory)
        VALUES (
            v_cycle_2_id,
            CURRENT_DATE + (i * 7),
            'Taller Práctico Clase ' || i,
            true
        );

        -- Insertar post en el foro asociado a la clase
        IF v_profile_id IS NOT NULL THEN
            INSERT INTO public.forum_posts (course_id, user_id, lesson_id, title, body)
            VALUES (
                v_course_2_id,
                v_profile_id,
                v_lesson_id,
                'Aporte a la Clase ' || i,
                'Comparto mis reflexiones después de ver la clase ' || i || '. ¡Excelente contenido para aplicarlo con mi equipo!'
            );
        END IF;
    END LOOP;

END $$;

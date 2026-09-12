-- ─────────────────────────────────────────────────────────────────────────────
-- 000005 — "Marcar todo como leído" que realmente persiste
--
-- Síntoma: en /admin/actividad el botón marcaba todo en pantalla, pero al
-- cambiar de sección y volver los eventos aparecían sin leer otra vez.
--
-- El marcado se armaba en el cliente: traía los ids de los eventos, los
-- cruzaba contra el set de lecturas que tenía cargado y hacía un INSERT masivo
-- con la diferencia. Ese set venía de un SELECT con limit 1000, así que en
-- cuanto una cuenta pasaba las 1000 lecturas quedaba incompleto y el INSERT
-- incluía filas ya existentes → 409 sobre la PK (event_id, profile_id) → como
-- PostgREST aplica el lote entero o nada, no se guardaba NINGUNA lectura.
-- La UI ya se había actualizado de forma optimista, de ahí que "pareciera"
-- funcionar hasta recargar.
--
-- Acá el marcado pasa al servidor: un INSERT ... SELECT con ON CONFLICT DO
-- NOTHING, sin traer ids al cliente y sin techo de filas. La visibilidad
-- espeja staff_activity_unread_count(): el staff marca todo, el coach sólo lo
-- que tiene a cargo.
--
-- Idempotente: seguro de correr más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.staff_activity_mark_all_read()
RETURNS INTEGER
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    my_profile UUID;
    inserted   INTEGER;
BEGIN
    my_profile := public.get_my_profile_id();
    IF my_profile IS NULL THEN
        RETURN 0;
    END IF;

    IF public.is_staff() THEN
        INSERT INTO public.staff_activity_event_reads (event_id, profile_id)
        SELECT e.id, my_profile
        FROM public.staff_activity_events e
        ON CONFLICT (event_id, profile_id) DO NOTHING;
    ELSIF public.is_coach() THEN
        INSERT INTO public.staff_activity_event_reads (event_id, profile_id)
        SELECT e.id, my_profile
        FROM public.staff_activity_events e
        WHERE e.subject_profile_id IS NULL
           OR public.coach_oversees(e.subject_profile_id)
        ON CONFLICT (event_id, profile_id) DO NOTHING;
    ELSE
        RETURN 0;
    END IF;

    GET DIAGNOSTICS inserted = ROW_COUNT;
    RETURN COALESCE(inserted, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_activity_mark_all_read() TO authenticated;

-- El feed cruza eventos contra las lecturas del admin logueado; sin este
-- índice ese cruce es un scan por (event_id, profile_id) invertido respecto
-- de la PK.
CREATE INDEX IF NOT EXISTS staff_activity_event_reads_event_idx
    ON public.staff_activity_event_reads(event_id);

NOTIFY pgrst, 'reload schema';

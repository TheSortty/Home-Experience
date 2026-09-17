-- ─────────────────────────────────────────────────────────────────────────────
-- 000006 — Precios nuevos y cobro por Mercado Pago (Checkout Pro)
--
-- Dos cosas:
--
-- 1. Lista de precios de 2026. Los combos pasan a tener UN precio: los recargos
--    por tarjeta y cuotas los aplica Mercado Pago del lado suyo, así que dejar
--    un price_*_card acá era mantener a mano un número que no controlamos y que
--    se desincronizaba solo. Se borran esas claves.
--
-- 2. Lo que necesita el cobro con Checkout Pro. El monto NUNCA viaja desde el
--    navegador: la ruta de checkout lo lee de site_settings y arma la
--    preferencia en el servidor. Acá van las columnas donde el webhook deja lo
--    que devuelve Mercado Pago.
--
-- Idempotente: seguro de correr más de una vez.
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- Precios 2026
-- ---------------------------------------------------------------------------

INSERT INTO public.site_settings (key, value, label, description, category, input_type) VALUES
('price_initial',      '280000', 'Precio: Inicial',    'Nivel INICIAL (4 días)',                        'pricing', 'text'),
('price_advanced',     '300000', 'Precio: Avanzado',   'Nivel AVANZADO (5 días)',                       'pricing', 'text'),
('price_leadership',   '450000', 'Precio: Liderazgo',  'PROGRAMA DE LIDERAZGO (3 meses)',               'pricing', 'text'),
('price_combo_1_cash', '480000', 'Combo 1',            'INICIAL + AVANZADO',                            'pricing', 'text'),
('price_combo_2_cash', '820000', 'Combo 2',            'INICIAL + AVANZADO + PROGRAMA DE LIDERAZGO',    'pricing', 'text')
ON CONFLICT (key) DO UPDATE
   SET value       = EXCLUDED.value,
       label       = EXCLUDED.label,
       description = EXCLUDED.description,
       updated_at  = timezone('utc', now());

-- El precio de tarjeta lo calcula Mercado Pago, no nosotros.
DELETE FROM public.site_settings WHERE key IN ('price_combo_1_card', 'price_combo_2_card');

-- ---------------------------------------------------------------------------
-- Promo de cuotas. Editable desde Configuración Web: cuando se venza, se
-- cambia la fecha acá y la landing deja de mostrar el cartel sola.
-- ---------------------------------------------------------------------------

INSERT INTO public.site_settings (key, value, label, description, category, input_type) VALUES
('promo_installments',       '3',            'Promo: cuotas sin interés', 'Máximo de cuotas sin interés que se ofrecen en Mercado Pago. 1 = sin promo.', 'pricing', 'text'),
('promo_installments_until', '2026-10-31',   'Promo: vigente hasta',      'Último día de la promo de cuotas (AAAA-MM-DD). Vencida, el cartel se oculta.', 'pricing', 'text'),
('promo_installments_note',  'Miércoles y sábados, 3 cuotas sin interés con tarjetas adheridas', 'Promo: texto', 'Cartel que se muestra en la sección de precios mientras la promo esté vigente.', 'pricing', 'text')
ON CONFLICT (key) DO NOTHING;

-- Los links estáticos quedan obsoletos: el checkout genera la preferencia en
-- el momento. Se borran para que nadie los edite creyendo que siguen vivos.
DELETE FROM public.site_settings
 WHERE key IN ('link_mercadopago_initial', 'link_mercadopago_advanced', 'link_mercadopago_leadership');

-- ---------------------------------------------------------------------------
-- payments: lo que agrega Checkout Pro
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS preference_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS item_code     TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payer_email   TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payer_name    TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS installments  INTEGER;

-- Respuesta cruda de Mercado Pago. Cuando un pago no cierra con lo que muestra
-- el panel, esto es lo único que permite reconstruir qué contestó la API.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS raw JSONB;

COMMENT ON COLUMN public.payments.external_id IS
    'id del pago en Mercado Pago. Único: el webhook puede llegar repetido.';

-- Mercado Pago reintenta la misma notificación varias veces y no garantiza
-- entrega única. Sin esto, un reintento duplicaba la fila del pago.
CREATE UNIQUE INDEX IF NOT EXISTS payments_external_id_key
    ON public.payments(external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_preference_id_idx
    ON public.payments(preference_id)
    WHERE preference_id IS NOT NULL;

-- Sin policies nuevas a propósito: el webhook escribe con la service role key,
-- que saltea RLS, y para el resto ya están staff_all_access (staff) y
-- "Students can view own payments" (alumno, sólo lectura de lo suyo).

NOTIFY pgrst, 'reload schema';

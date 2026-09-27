# Spec: Terminar el cobro online con Mercado Pago

Basado en `pedido-mariano-mercadopago.txt` (raíz del repo) y en la auditoría del
código existente del 2026-09-27.

## Objetivo

Que alguien pueda pagar su inscripción a CreSER desde siendohome.com con
Mercado Pago (Checkout Pro) y que el sistema lo registre solo, sin que nadie
del equipo tenga que revisar un comprobante a mano. Hoy la pantalla de pago
sigue mostrando precios viejos y links fijos de una integración anterior.

## Qué ya está hecho (auditoría)

El backend está completo y prolijo — no hace falta tocarlo, salvo que las
respuestas de Mariano cambien algo:

| Pieza | Archivo | Estado |
|---|---|---|
| Cliente de Mercado Pago | `packages/services/src/mercadoPago.ts` | ✅ Hecho. Habla por `fetch` (compatible con Workers), valida la firma del webhook con HMAC y comparación de tiempo constante. |
| Iniciar el pago | `apps/marketing/src/app/api/pagos/checkout/route.ts` | ✅ Hecho. El precio se lee de `site_settings` en el servidor — el navegador nunca manda un monto. Crea la fila de `payments` antes de ir a Mercado Pago. |
| Webhook | `apps/marketing/src/app/api/pagos/webhook/route.ts` | ✅ Hecho. Verifica firma antes de mirar nada, vuelve a pedir el estado a la API (no confía en el cuerpo), es idempotente (índice único en `external_id`). |
| Páginas de vuelta | `apps/marketing/src/app/(public)/pago/[estado]/page.tsx` | ✅ Hecho. `/pago/exito`, `/pago/pendiente`, `/pago/error`. |
| Precios y promo | `supabase/migrations/000006_mercadopago.sql`, `packages/services/src/pricing.ts` | ✅ Hecho. Precios 2026 cargados, promo de cuotas con fecha de corte, todo editable en Configuración Web. |

## Lo que faltaba (2026-09-27 — resuelto en este commit)

### 1. La pantalla que ve el comprador no estaba conectada ✅

`apps/marketing/src/features/auth/PaymentOptions.tsx` reescrito: ahora trae
precios y promo de `GET /api/pagos/precios` (endpoint nuevo, público,
sólo lectura), y al tocar "Pagar con Mercado Pago" llama a
`POST /api/pagos/checkout` y redirige a `initPoint`. Sin links fijos ni
precios a mano. Cada uno de los 5 ítems (3 etapas + 2 combos) tiene el botón
de Mercado Pago **y** el bloque de efectivo/transferencia, según la decisión
de alcance de abajo. `resolveInstallments` se movió a `pricing.ts` para que
`/checkout` y `/precios` no dupliquen la misma lógica.

### 2. README sin documentar ✅

Sección "Mercado Pago (Checkout Pro)" agregada, con el mismo formato que la
de Google Calendar: credenciales, webhook, variables, precios.

## Lo que falta

### 1. Credenciales (bloqueante, depende de Mariano)

De su propio mensaje: Access Token y Webhook Secret, primero de prueba. La
**Public Key no la usa el código actual** — Checkout Pro por redirección no
la necesita; solo haría falta si más adelante se arma un checkout embebido
(Wallet Brick). Se le puede pedir igual para tenerla, pero no bloquea nada.

### 2. Detalle menor: precios se ven sin formato en el admin

`AdminSettings.tsx` da formato `$280.000` solo cuando
`input_type === 'number'`, pero la migración cargó estos `site_settings` con
`input_type: 'text'`. Hoy en Configuración Web se ve `280000` en vez de
`$280.000`. Cosmético, no bloquea el cobro.

## Éxito se ve así

- [ ] Un pago de prueba (con las credenciales de test) crea la fila en
      `payments`, redirige a Mercado Pago, y al aprobarse vuelve a
      `/pago/exito` con la fila ya en `status = 'paid'`.
- [ ] Un pago rechazado en modo prueba vuelve a `/pago/error` y la fila queda
      en `failed`.
- [ ] Un medio de pago lento (ej. Pago Fácil en sandbox) vuelve a
      `/pago/pendiente` y la fila queda en `pending` hasta que el webhook la
      actualiza.
- [ ] `PaymentOptions.tsx` no tiene ningún precio ni link fijo: todo sale del
      backend.
- [ ] El cartel de 3 cuotas sin interés se apaga solo pasado el 31/10 (o la
      fecha que se cargue).
- [ ] El botón "Ya pagué" usa un número de WhatsApp real de HOME.
- [ ] Recién después de un pago de prueba exitoso de punta a punta, se
      reemplazan las credenciales de test por las de producción en el
      Worker.

## Siempre / Preguntar primero / Nunca

- **Siempre:** el monto se calcula en el servidor. El navegador nunca manda
  un precio.
- **Preguntar primero:** pasar de credenciales de prueba a producción (eso
  es "salir en vivo"); sacar algún medio de pago (efectivo, Rapipago); tocar
  el flujo de inscripción por WhatsApp si se decide mantenerlo para algo.
- **Nunca:** guardar el Access Token o el Webhook Secret en el repo o en un
  log; debilitar la verificación de firma del webhook.

## Decisiones (2026-09-27)

1. **Alcance:** los 5 ítems (3 etapas individuales + 2 combos) muestran
   Mercado Pago como opción de pago directo, **sumado** a efectivo y
   transferencia, que se mantienen — no se saca nada, se agrega. La
   restricción vieja de "las etapas individuales SOLO efectivo/transferencia"
   queda sin efecto: cada tarjeta de precio va a tener el botón de Mercado
   Pago más el bloque de instrucciones de efectivo/transferencia, para los
   5 ítems por igual.
2. **WhatsApp del botón "Ya pagué":** `+549 11 5158-9383` →
   `5491151589383` (mismo formato que `CAMPUS_WHATSAPP`).

## Preguntas abiertas

1. **Del checklist de Mariano en `pedido-mariano-mercadopago.txt`**, ¿cuáles
   de estos ya tienen respuesta? (No hace falta para escribir el código, sí
   para salir en producción):
   - Promo de 3 cuotas sin interés activada en el panel de Mercado Pago,
     miércoles y sábados, hasta el 31/10.
   - Cuenta verificada y habilitada para cobrar (CBU cargado).
   - Mail donde llegan los avisos de pago.
   - Qué medios de pago se habilitan (¿todos, o se saca alguno?).
2. `pedido-mariano-mercadopago.txt` quedó en la raíz del repo, igual que
   `codigo.txt`. Cuando esto se cierre, ¿se borra?

-- Migration: 20260121_update_contacts
-- Description: Update WhatsApp and Phone numbers.

INSERT INTO site_settings (key, value, label, description, category, input_type)
VALUES 
('whatsapp', '+5491130586930', 'WhatsApp', 'Número de WhatsApp para contacto directo.', 'contact', 'tel'),
('phone', '+5491130586930', 'Teléfono de llamadas', 'Número para recibir llamadas.', 'contact', 'tel')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

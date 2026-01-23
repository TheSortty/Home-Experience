import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // CASO 1: Webhook de Supabase (Nuevo registro en DB)
    if (payload.record) {
      const formData = payload.record.data;

      // 1. Email para TI (Admin)
      await resend.emails.send({
        from: "Notificaciones <info@mail.siendohome.com>",
        to: ["contacto@siendohome.com"],
        subject: `Nuevo Inscrito: ${formData.firstName} ${formData.lastName}`,
        html: `
            <h1>¡Nueva solicitud recibida!</h1>
            <p><strong>Nombre:</strong> ${formData.firstName} ${formData.lastName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            <p><strong>Teléfono:</strong> ${formData.phone}</p>
            <p>Revisa el panel de admin para aprobarlo.</p>
          `,
      });

      // 2. Email para el CLIENTE (Recibo el form)
      await resend.emails.send({
        from: "HOME Experience <hola@mail.siendohome.com>",
        to: [formData.email],
        subject: "Hemos recibido tu solicitud - HOME Experience",
        html: `
            <h1>Hola ${formData.firstName},</h1>
            <p>Gracias por querer formar parte de HOME.</p>
            <p>Hemos recibido tu formulario correctamente. Nuestro equipo lo está revisando y te contactaremos pronto para confirmar tu vacante.</p>
            <br/>
            <p>Atte, el equipo de HOME.</p>
          `,
      });

      return new Response(JSON.stringify({ message: "Emails de registro enviados" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CASO 2: Llamada manual desde Frontend (Bienvenida al Curso)
    else if (payload.type === 'COURSE_WELCOME') {
      const { email, firstName, cycleName, startDate, endDate } = payload.data;

      await resend.emails.send({
        from: "HOME Experience <hola@mail.siendohome.com>",
        to: [email],
        subject: "¡Bienvenido a HOME Experience!",
        html: `
            <h1>¡Felicidades ${firstName}!</h1>
            <p>Tu inscripción al ciclo <strong>${cycleName}</strong> ha sido confirmada.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Fecha de Inicio:</strong> ${startDate}</p>
                 ${endDate ? `<p><strong>Fecha de Fin:</strong> ${endDate}</p>` : ''}
            </div>

            <p>Estamos muy felices de que te sumes a esta experiencia.</p>
            <p>Pronto recibirás más detalles sobre el cursado.</p>
            <br/>
            <p>Atte, el equipo de HOME.</p>
          `,
      });

      return new Response(JSON.stringify({ message: "Email de bienvenida enviado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: "No action performed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
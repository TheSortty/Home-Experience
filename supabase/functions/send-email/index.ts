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
    const { record } = await req.json();
    const formData = record.data;

    // 1. Email para TI (Admin) - Aviso de nuevo inscrito
    // CAMBIO AQUÍ: Usamos tu dominio verificado
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

    // 2. Email para el CLIENTE (Alumno) - Bienvenida
    // CAMBIO AQUÍ: Usamos tu dominio verificado
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

    return new Response(JSON.stringify({ message: "Emails enviados" }), {
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
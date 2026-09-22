// Descarga autenticada del material de una clase guardado en Cloudflare R2.
//
//   GET /api/materiales/download?key=<r2-object-key>[&inline=1]
//
// La autorización la resuelve Postgres: buscamos la fila de lesson_resources
// con el cliente autenticado del usuario. Si el RLS la devuelve, esa persona
// tiene acceso al curso (ver has_course_access en la migración 000002). Si no,
// 403 — aunque conozca la clave exacta del objeto.

import { NextRequest } from 'next/server';
import { createClient } from '@home/services/supabase/server';
import { getMaterialObject, isMaterialKey } from '@home/services/materialStorage';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  const inline = req.nextUrl.searchParams.get('inline') === '1';
  if (!key) return new Response('Falta el parámetro key', { status: 400 });
  // Sólo claves que generamos nosotros: nada de leer otros prefijos del bucket.
  if (!isMaterialKey(key)) return new Response('Clave inválida', { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  const { data: resource } = await supabase
    .from('lesson_resources')
    .select('file_name, title')
    .eq('storage_key', key)
    .maybeSingle();

  if (!resource) return new Response('Sin acceso', { status: 403 });

  const object = await getMaterialObject(key);
  if (!object) return new Response('Archivo no encontrado', { status: 404 });

  const safeName = ((resource as any).file_name || (resource as any).title || 'archivo').replace(/"/g, '');
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`);
  headers.set('Cache-Control', 'private, no-store');
  if (object.size != null) headers.set('Content-Length', String(object.size));

  return new Response(object.body as ReadableStream, { headers });
}

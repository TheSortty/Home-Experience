// Authenticated download of a delivery file from Cloudflare R2.
//
//   GET /api/entregas/download?key=<r2-object-key>
//
// Authorization is delegated to Postgres RLS: we look the key up with the
// caller's authenticated Supabase client. If RLS returns a row, the caller is
// allowed to see it (student owner, or coach/admin). submission_files covers
// student uploads; submission_reviews.revised_storage_path covers coach files.

import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEntregasBucket } from '@/src/services/entregasStorage';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  // inline=1 renders the file in-browser (PDF/image preview) instead of forcing
  // a download — used by the reviewer's inline preview.
  const inline = req.nextUrl.searchParams.get('inline') === '1';
  if (!key) return new Response('Falta el parámetro key', { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  // ── Authorize via RLS + resolve the display file name ──────────────────────
  let fileName: string | null = null;

  const { data: fileRow } = await supabase
    .from('submission_files')
    .select('file_name')
    .eq('storage_key', key)
    .maybeSingle();

  if (fileRow) {
    fileName = fileRow.file_name;
  } else {
    // Multi-file devolución attachment.
    const { data: reviewFileRow } = await supabase
      .from('submission_review_files')
      .select('file_name')
      .eq('storage_key', key)
      .maybeSingle();
    if (reviewFileRow) {
      fileName = reviewFileRow.file_name;
    } else {
      // Legacy single revised file.
      const { data: reviewRow } = await supabase
        .from('submission_reviews')
        .select('revised_file_name')
        .eq('revised_storage_path', key)
        .maybeSingle();
      if (!reviewRow) return new Response('Sin acceso', { status: 403 });
      fileName = reviewRow.revised_file_name;
    }
  }

  // ── Stream the object from R2 ───────────────────────────────────────────────
  const bucket = await getEntregasBucket();
  const object = await bucket.get(key);
  if (!object) return new Response('Archivo no encontrado', { status: 404 });

  const safeName = (fileName ?? 'archivo').replace(/"/g, '');
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`);
  headers.set('Cache-Control', 'private, no-store');
  if (object.size != null) headers.set('Content-Length', String(object.size));

  return new Response(object.body as ReadableStream, { headers });
}

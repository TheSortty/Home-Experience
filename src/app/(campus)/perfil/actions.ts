'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const R2_PUBLIC_URL = 'https://pub-a623949342a84338a70f5a9f083bcc04.r2.dev';

// ─────────────────────────────────────────────────────────────────────────────
// Avatar upload → Cloudflare R2
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'No se recibió archivo' };
  // 3 MB guard — client already compressed, but just in case
  if (file.size > 3 * 1024 * 1024) return { error: 'El archivo es demasiado grande (máx 3 MB)' };

  // Resolve profiles.id  (FK used as object key in R2)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: 'Perfil no encontrado' };

  const arrayBuffer = await file.arrayBuffer();
  const key = `avatars/${profile.id}`;

  try {
    // getCloudflareContext is available in every Workers / OpenNext request.
    const { env } = await getCloudflareContext({ async: true });
    await (env as { AVATARS: R2Bucket }).AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/webp' },
    });
  } catch (err) {
    console.error('[R2] upload error:', err);
    return { error: 'No se pudo subir la imagen. Intentá desde el entorno de producción o con `npm run preview`.' };
  }

  // Append timestamp to bust the browser cache on re-uploads
  const avatarUrl = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`;

  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (dbErr) return { error: dbErr.message };

  revalidatePath('/perfil');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout'); // refreshes navbar avatar
  return { success: true, avatarUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding: save name + optional avatar + mark completed — all in one shot
// ─────────────────────────────────────────────────────────────────────────────

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const firstName = (formData.get('first_name') as string | null)?.trim() ?? '';
  const lastName  = (formData.get('last_name')  as string | null)?.trim() ?? '';

  if (!firstName || !lastName) return { error: 'El nombre y apellido son obligatorios.' };

  // Resolve profiles.id for R2 key
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) return { error: 'Perfil no encontrado' };

  // Optional avatar upload
  let avatarUrl: string | undefined;
  const file = formData.get('file') as File | null;
  if (file && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: 'El archivo es demasiado grande (máx 3 MB)' };

    const arrayBuffer = await file.arrayBuffer();
    const key = `avatars/${profile.id}`;
    try {
      const { env } = await getCloudflareContext({ async: true });
      await (env as { AVATARS: R2Bucket }).AVATARS.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/webp' },
      });
      avatarUrl = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`;
    } catch (err) {
      console.error('[R2] upload error:', err);
      // Non-fatal: save name even if photo fails
    }
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    first_name: firstName,
    last_name:  lastName,
    profile_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (avatarUrl) updatePayload.avatar_url = avatarUrl;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbErr } = await (supabase.from('profiles') as any)
    .update(updatePayload)
    .eq('user_id', user.id);

  if (dbErr) return { error: dbErr.message };

  revalidatePath('/perfil');
  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark welcome modal as seen (sets profile_completed_at) — used by "Ahora no"
// ─────────────────────────────────────────────────────────────────────────────

export async function markProfileCompleted() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any)
    .update({ profile_completed_at: new Date().toISOString() })
    .eq('user_id', user.id);

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile data
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  phone: string;
  bio: string;
  instagram: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: data.first_name.trim() || null,
      last_name: data.last_name.trim() || null,
      phone: data.phone.trim() || null,
      bio: data.bio.trim() || null,
      instagram: data.instagram.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/perfil');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateMedicalInfo(data: {
  under_treatment: boolean;
  treatment_details: string;
  medication: string;
  allergies: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado' };

  const { error } = await supabase
    .from('medical_info')
    .upsert(
      {
        user_id: profile.id,
        under_treatment: data.under_treatment,
        treatment_details: data.treatment_details.trim() || null,
        medication: data.medication.trim() || null,
        allergies: data.allergies.trim() || null,
        emergency_contact_name: data.emergency_contact_name.trim() || null,
        emergency_contact_phone: data.emergency_contact_phone.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) return { error: error.message };
  revalidatePath('/perfil');
  return { success: true };
}

export async function changePassword(newPassword: string) {
  if (!newPassword || newPassword.length < 6)
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { success: true };
}

'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

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

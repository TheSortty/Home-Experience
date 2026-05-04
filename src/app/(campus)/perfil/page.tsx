import { createClient } from '@/utils/supabase/server';
import { IoPersonOutline } from 'react-icons/io5';
import ProfileTabs from './ProfileTabs';

export default async function CampusPerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: any = null;
  let medical: any = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, bio, instagram')
      .eq('user_id', user.id)
      .single();
    profile = data;

    if (profile?.id) {
      const { data: med } = await supabase
        .from('medical_info')
        .select('under_treatment, treatment_details, medication, allergies, emergency_contact_name, emergency_contact_phone')
        .eq('user_id', profile.id)
        .maybeSingle();
      medical = med;
    }
  }

  const firstName = profile?.first_name ?? '';
  const lastName = profile?.last_name ?? '';
  const email = profile?.email ?? user?.email ?? '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <section className="border-b border-slate-200 pb-6">
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-slate-900 flex items-center gap-3">
          <IoPersonOutline className="text-[#00A9CE] shrink-0" /> Tu espacio
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Lo que querés que sepamos de vos.
        </p>
      </section>

      <ProfileTabs
        firstName={firstName}
        lastName={lastName}
        email={email}
        phone={profile?.phone ?? ''}
        bio={profile?.bio ?? ''}
        instagram={profile?.instagram ?? ''}
        initials={initials}
        medical={medical}
      />
    </div>
  );
}

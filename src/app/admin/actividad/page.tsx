import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ActivityTimelineClient, { type CourseTab } from './ActivityTimelineClient';
import { isAdminRole } from '@/src/services/roleService';

export default async function ActividadHistorialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!isAdminRole(profile?.role ?? '')) redirect('/dashboard');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true)
    .order('title');

  const courseList: CourseTab[] = (courses || []).map((c: any) => ({ id: c.id, title: c.title }));

  return <ActivityTimelineClient courses={courseList} />;
}

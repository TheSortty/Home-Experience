import { Suspense } from 'react';
import { createClient } from '@home/services/supabase/server';
import ActivityTimelineClient, { type CourseTab } from './ActivityTimelineClient';
import { requireAdminPage } from '@home/services/adminPageGuard';

export default async function ActividadHistorialPage() {
  await requireAdminPage();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true)
    .order('title');

  const courseList: CourseTab[] = (courses || []).map((c: any) => ({ id: c.id, title: c.title }));

  return (
    <Suspense fallback={null}>
      <ActivityTimelineClient courses={courseList} />
    </Suspense>
  );
}

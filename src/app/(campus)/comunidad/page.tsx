import { createClient } from '@/utils/supabase/server';
import ForumClient, { type ForumPost, type CourseTab } from './ForumClient';

export default async function CampusComunidadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profileId = '';
  let courses: CourseTab[] = [];
  let initialPosts: ForumPost[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      profileId = profile.id;

      // All published courses are visible to any campus user — same logic as
      // the courses page. The enrollment system and the LMS course system are
      // not yet linked via cycle.course_id, so we load courses directly.
      const { data: publishedCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true)
        .order('title');

      const courseIds: string[] = (publishedCourses || []).map((c: any) => c.id);
      courses = (publishedCourses || []).map((c: any) => ({ id: c.id, title: c.title }));

      if (courseIds.length > 0) {
        // Load all posts (root + replies) for these courses, joining lesson +
        // module so we can show the precise "Módulo X · Clase Y" tag instead
        // of guessing from the body text.
        const { data: rawPosts } = await supabase
          .from('forum_posts')
          .select(`
            id, course_id, user_id, title, body, parent_id, created_at, lesson_id,
            profiles(first_name, last_name, role),
            lessons(id, title, order_index, modules(id, title, order_index))
          `)
          .in('course_id', courseIds)
          .order('created_at', { ascending: true });

        // Build flat list with author + section context
        const flat: ForumPost[] = (rawPosts || []).map((p: any) => {
          const lesson = p.lessons;
          const module = lesson?.modules;
          return {
            id: p.id,
            course_id: p.course_id,
            user_id: p.user_id,
            author_name: p.profiles
              ? `${p.profiles.first_name ?? ''} ${p.profiles.last_name ?? ''}`.trim() || 'Estudiante'
              : 'Estudiante',
            author_role: p.profiles?.role ?? null,
            title: p.title,
            body: p.body,
            parent_id: p.parent_id,
            created_at: p.created_at,
            replies: [],
            lesson_id: p.lesson_id ?? null,
            lessonTitle: lesson?.title ?? null,
            lessonOrder: lesson?.order_index ?? null,
            moduleTitle: module?.title ?? null,
            moduleOrder: module?.order_index ?? null,
          };
        });

        // Build tree: attach replies to their parent
        const postMap: Record<string, ForumPost> = {};
        flat.forEach(p => { postMap[p.id] = p; });

        const roots: ForumPost[] = [];
        flat.forEach(p => {
          if (p.parent_id && postMap[p.parent_id]) {
            postMap[p.parent_id].replies.push(p);
          } else if (!p.parent_id) {
            roots.push(p);
          }
        });

        // Sort roots newest first
        initialPosts = roots.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    }
  }

  let actorRole: string | undefined;
  let actorName: string | null = null;
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('user_id', user.id)
      .single();
    actorRole = prof?.role ?? undefined;
    actorName = `${prof?.first_name ?? ''} ${prof?.last_name ?? ''}`.trim() || null;
  }

  return (
    <ForumClient
      profileId={profileId}
      actorRole={actorRole}
      actorName={actorName}
      courses={courses}
      initialPosts={initialPosts}
    />
  );
}

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
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      profileId = profile.id;

      // Get enrolled courses that have an LMS course linked
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, cycle_id, cycles(id, name, course_id, courses(id, title))')
        .eq('user_id', profile.id)
        .in('status', ['active', 'completed']);

      const courseMap: Record<string, CourseTab> = {};
      const courseIds: string[] = [];

      (enrollments || []).forEach((e: any) => {
        const course = e.cycles?.courses;
        if (course?.id) {
          if (!courseMap[course.id]) {
            courseMap[course.id] = { id: course.id, title: course.title };
            courseIds.push(course.id);
          }
        }
      });

      courses = Object.values(courseMap);

      if (courseIds.length > 0) {
        // Load all posts (root + replies) for these courses
        const { data: rawPosts } = await supabase
          .from('forum_posts')
          .select('id, course_id, user_id, title, body, parent_id, created_at, profiles(first_name, last_name)')
          .in('course_id', courseIds)
          .order('created_at', { ascending: true });

        // Build flat list with author names
        const flat: ForumPost[] = (rawPosts || []).map((p: any) => ({
          id: p.id,
          course_id: p.course_id,
          user_id: p.user_id,
          author_name: p.profiles
            ? `${p.profiles.first_name ?? ''} ${p.profiles.last_name ?? ''}`.trim() || 'Estudiante'
            : 'Estudiante',
          title: p.title,
          body: p.body,
          parent_id: p.parent_id,
          created_at: p.created_at,
          replies: [],
        }));

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <ForumClient profileId={profileId} courses={courses} initialPosts={initialPosts} />
    </div>
  );
}

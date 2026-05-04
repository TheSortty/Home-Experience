import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoBookOutline, IoChevronForwardOutline, IoPeopleOutline } from 'react-icons/io5';

export default async function AdminLmsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (!['admin', 'sysadmin', 'super_admin'].includes(profile?.role ?? '')) redirect('/dashboard');

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, is_published')
    .order('title');

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Campus LMS</h1>
            <p className="text-slate-500 mt-1 text-sm">Gestión de cursos, clases y entregas</p>
          </div>
          <Link
            href="/admin/lms/actividad"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <IoPeopleOutline size={16} /> Actividad de Alumnos
          </Link>
        </div>

        <div className="grid gap-4">
          {(courses || []).map((course) => (
            <Link
              key={course.id}
              href={`/admin/lms/${course.id}`}
              className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#00A9CE]/40 hover:shadow-sm transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#00A9CE]/10 flex items-center justify-center shrink-0">
                <IoBookOutline size={22} className="text-[#00A9CE]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 group-hover:text-[#00A9CE] transition-colors">
                  {course.title}
                </p>
                {course.description && (
                  <p className="text-sm text-slate-500 truncate mt-0.5">{course.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                  course.is_published
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {course.is_published ? 'Publicado' : 'Borrador'}
                </span>
                <IoChevronForwardOutline className="text-slate-400 group-hover:text-[#00A9CE] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

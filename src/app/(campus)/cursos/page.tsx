import { createClient } from '@/utils/supabase/server';
import { resolveRole } from '@/src/services/roleService';
import { getStudentProgress } from '@/src/services/progressService';
import Link from 'next/link';
import { IoBookOutline, IoCheckmarkCircleOutline, IoPlayCircleOutline, IoCalendarOutline } from 'react-icons/io5';

const GRADIENTS = [
  'from-[#00A9CE] to-blue-600',
  'from-emerald-400 to-teal-500',
  'from-violet-500 to-purple-600',
  'from-orange-400 to-rose-500',
];

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  if (status === 'completed' || progress === 100) {
    return (
      <span className="px-2.5 py-1 bg-terra/30 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
        <IoCheckmarkCircleOutline size={12} /> Atravesado
      </span>
    );
  }
  if (progress > 0) {
    return (
      <span className="px-2.5 py-1 bg-[#00A9CE]/20 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
        <IoPlayCircleOutline size={12} /> En camino
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider">
      Por empezar
    </span>
  );
}

export default async function CampusCursosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab = 'activos', preview } = await searchParams;
  const isPreview = preview === 'true';
  const activeTab = (['activos', 'completados', 'todos'] as const).includes(tab as any)
    ? (tab as 'activos' | 'completados' | 'todos')
    : 'activos';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  type CourseCard = {
    enrollmentId: string;
    enrollmentStatus: string;
    cycleId: string;
    cycleName: string;
    courseId: string | null;
    courseTitle: string;
    courseDescription: string | null;
    coverImage: string | null;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    hasLms: boolean;
  };

  let courses: CourseCard[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const isAdmin = (await resolveRole(supabase, user.id)) === 'admin' || (await resolveRole(supabase, user.id)) === 'sysadmin';
      const canSeeEverything = isAdmin && isPreview;

      if (canSeeEverything) {
        const { data: allCourses } = await supabase
          .from('courses')
          .select('id, title, description, cover_image_url')
          .eq('is_published', true);

        courses = (allCourses || []).map(c => ({
          enrollmentId: `preview-${c.id}`,
          enrollmentStatus: 'active',
          cycleId: `preview-cycle-${c.id}`,
          cycleName: 'Ciclo Preview',
          courseId: c.id,
          courseTitle: c.title,
          courseDescription: c.description,
          coverImage: c.cover_image_url,
          totalLessons: 0,
          completedLessons: 0,
          progressPercent: 0,
          hasLms: true,
        }));
      } else {
        const studentProgressList = await getStudentProgress(supabase, profile.id);

        courses = studentProgressList.map(prog => ({
          enrollmentId: prog.enrollmentId,
          enrollmentStatus: prog.enrollmentStatus,
          cycleId: prog.cycleId,
          cycleName: prog.cycleName,
          courseId: prog.courseId,
          courseTitle: prog.courseTitle,
          courseDescription: null, // Note: Not returned by RPC, but we can live without it or fetch it later
          coverImage: prog.courseCover,
          totalLessons: prog.totalLessons,
          completedLessons: prog.completedLessons,
          progressPercent: prog.progressPercent,
          hasLms: !!prog.courseId,
        }));
        
        // Fetch descriptions for the courses we got
        const courseIdsToFetch = courses.map(c => c.courseId).filter(Boolean);
        if (courseIdsToFetch.length > 0) {
            const { data: courseData } = await supabase.from('courses').select('id, description').in('id', courseIdsToFetch);
            if (courseData) {
                const descMap = courseData.reduce((acc: any, c: any) => { acc[c.id] = c.description; return acc; }, {});
                courses = courses.map(c => c.courseId ? { ...c, courseDescription: descMap[c.courseId] } : c);
            }
        }
      }
    }
  }

  const filtered =
    activeTab === 'completados'
      ? courses.filter((c) => c.enrollmentStatus === 'completed' || c.progressPercent === 100)
      : activeTab === 'todos'
      ? courses
      : courses.filter((c) => c.enrollmentStatus !== 'completed' && c.progressPercent < 100);

  const tabs = [
    { id: 'activos', label: 'En camino' },
    { id: 'completados', label: 'Atravesados' },
    { id: 'todos', label: 'Todos' },
  ] as const;

  return (
    <div className="space-y-8 pb-12">

      {/* HEADER */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight text-slate-900">Tu camino</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Todo lo que estás transitando, en un solo lugar.
          </p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`?tab=${t.id}`}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      {/* GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-3 bg-cream border-2 border-dashed border-cream-deep rounded-2xl p-12 text-center">
            <IoBookOutline size={40} className="mx-auto text-terra-soft mb-3" />
            <p className="text-slate-600 font-serif italic">Por ahora no hay nada en esta categoría.</p>
          </div>
        ) : (
          filtered.map((course, idx) => {
            const gradient = GRADIENTS[idx % GRADIENTS.length];
            const href = course.hasLms ? `/cursos/${course.courseId}` : `/calendario`;
            return (
              <Link key={course.enrollmentId} href={href} className="group">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full group-hover:border-[#00A9CE]/40 group-hover:shadow-md transition-all">
                  <div className={`h-40 relative overflow-hidden ${course.coverImage ? '' : `bg-gradient-to-r ${gradient}`}`}>
                    {course.coverImage && (
                      <img
                        src={course.coverImage}
                        alt={course.courseTitle}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-3 right-3">
                      <StatusBadge
                        status={course.enrollmentStatus}
                        progress={course.progressPercent}
                      />
                    </div>
                    {!course.hasLms && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/80 text-xs font-medium">
                        <IoCalendarOutline size={14} />
                        Encuentros en vivo
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {course.cycleName}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#00A9CE] transition-colors">
                      {course.courseTitle}
                    </h3>
                    {course.courseDescription && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                        {course.courseDescription}
                      </p>
                    )}

                    <div className="mt-auto">
                      {course.hasLms && course.totalLessons > 0 ? (
                        <>
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            <span>{course.completedLessons}/{course.totalLessons} clases</span>
                            <span className="text-[#00A9CE]">{course.progressPercent}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00A9CE] rounded-full transition-all duration-500"
                              style={{ width: `${course.progressPercent}%` }}
                            />
                          </div>
                        </>
                      ) : course.hasLms ? (
                        <p className="text-xs text-slate-400 font-medium">Las clases llegan en breve</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium">Tus encuentros en el calendario →</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}

        {/* Discover more */}
        <div className="rounded-2xl border-2 border-dashed border-cream-deep bg-cream flex flex-col items-center justify-center p-8 text-center hover:bg-cream-deep hover:border-terra-soft transition-colors cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-terra shadow-sm mb-4">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="28px" width="28px" xmlns="http://www.w3.org/2000/svg">
              <path fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M256 112v288m144-144H112" />
            </svg>
          </div>
          <h3 className="font-serif text-2xl font-medium tracking-tight text-ink mb-2">¿Qué sigue?</h3>
          <p className="text-sm text-slate-600">Mirá los demás programas y elegí por dónde seguir.</p>
        </div>
      </section>
    </div>
  );
}

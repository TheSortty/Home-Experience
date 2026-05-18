import { createClient } from '@/utils/supabase/server';
import { resolveRole } from '@/src/services/roleService';
import { getStudentProgress } from '@/src/services/progressService';
import { normalizeImageUrl } from '@/src/services/imageUrl';
import { resolveViewMode } from '@/src/services/campusViewMode';
import Link from 'next/link';
import { IoBookOutline, IoCheckmarkCircleOutline, IoPlayCircleOutline, IoCalendarOutline, IoEyeOutline } from 'react-icons/io5';

const GRADIENTS = [
  'from-[#00A9CE] to-blue-600',
  'from-emerald-400 to-teal-500',
  'from-violet-500 to-purple-600',
  'from-orange-400 to-rose-500',
];

function StatusBadge({ status, progress, isOrganizer }: { status: string; progress: number; isOrganizer?: boolean }) {
  if (isOrganizer) {
    return (
      <span className="px-2.5 py-1 bg-amber-400/30 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
        <IoEyeOutline size={12} /> Organizando
      </span>
    );
  }
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
  if (status === 'available') {
    return (
      <span className="px-2.5 py-1 bg-amber-400/30 backdrop-blur-md rounded-md text-white text-xs font-bold uppercase tracking-wider">
        Disponible
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
  const sp = await searchParams;
  const { tab = 'activos' } = sp;
  const activeTab = (['activos', 'completados', 'todos'] as const).includes(tab as any)
    ? (tab as 'activos' | 'completados' | 'todos')
    : 'activos';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await resolveRole(supabase, user.id) : null;
  const viewMode = resolveViewMode(role, sp);

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
      .maybeSingle();

    // Organizer mode (admin/sysadmin browsing campus as staff) shows the full
    // catalogue without faking progress. Preview-as-student narrows to what
    // the alumno actually has access to.
    const canSeeEverything = viewMode === 'organizer';

    // Siempre cargamos TODOS los cursos publicados — visibles para todos.
    // No depende de profile ni de enrollment.
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, description, cover_image_url')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Si hay perfil, mezclamos el progreso real del alumno
    const studentProgressList = profile && !canSeeEverything
      ? await getStudentProgress(supabase, profile.id)
      : [];
    const progressByCourse = new Map(
      studentProgressList.filter(p => p.courseId).map(p => [p.courseId as string, p])
    );

    courses = (allCourses || []).map(c => {
      const progress = progressByCourse.get(c.id);
      if (progress) {
        return {
          enrollmentId: progress.enrollmentId,
          enrollmentStatus: progress.enrollmentStatus,
          cycleId: progress.cycleId,
          cycleName: progress.cycleName,
          courseId: c.id,
          courseTitle: c.title,
          courseDescription: c.description,
          coverImage: c.cover_image_url ?? progress.courseCover,
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedLessons,
          progressPercent: progress.progressPercent,
          hasLms: true,
        };
      }
      return {
        enrollmentId: `available-${c.id}`,
        enrollmentStatus: canSeeEverything ? 'active' : 'available',
        cycleId: '',
        cycleName: canSeeEverything ? 'Ciclo Preview' : 'Programa Disponible',
        courseId: c.id,
        courseTitle: c.title,
        courseDescription: c.description,
        coverImage: c.cover_image_url,
        totalLessons: 0,
        completedLessons: 0,
        progressPercent: 0,
        hasLms: true,
      };
    });
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
            const coverSrc = normalizeImageUrl(course.coverImage, 'w800');
            return (
              <Link key={course.enrollmentId} href={href} className="group">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full group-hover:border-[#00A9CE]/40 group-hover:shadow-md transition-all">
                  <div className={`h-40 relative overflow-hidden ${coverSrc ? '' : `bg-gradient-to-r ${gradient}`}`}>
                    {coverSrc && (
                      <img
                        src={coverSrc}
                        alt={course.courseTitle}
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute top-3 right-3">
                      <StatusBadge
                        status={course.enrollmentStatus}
                        progress={course.progressPercent}
                        isOrganizer={viewMode === 'organizer'}
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
                      {viewMode === 'organizer' ? (
                        <p className="text-xs text-amber-600 font-bold uppercase tracking-wide flex items-center gap-1">
                          <IoEyeOutline size={12} /> Vista completa del programa
                        </p>
                      ) : course.hasLms && course.totalLessons > 0 ? (
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

        {/* Coming soon — no es interactivo, sólo señala que hay más en camino */}
        <div
          className="coming-soon rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
          role="status"
          aria-label="Próximamente: más programas en camino"
        >
          <div className="coming-soon__inner flex flex-col items-center gap-5">
            <div className="coming-soon__sonar" aria-hidden="true">
              <span className="coming-soon__sonar-ring" />
              <span className="coming-soon__sonar-ring coming-soon__sonar-ring--b" />
              <span className="coming-soon__sonar-ring coming-soon__sonar-ring--c" />
              <span className="coming-soon__sonar-core" />
            </div>

            <span className="coming-soon__pill">
              <span className="coming-soon__pill-dot" aria-hidden="true" />
              Próximamente
            </span>

            <div>
              <h3 className="font-serif text-2xl font-medium tracking-tight text-ink mb-1.5">¿Qué sigue?</h3>
              <p className="text-sm text-slate-600 font-serif italic max-w-[22ch] mx-auto leading-relaxed">
                Estamos gestando los próximos programas. Te avisamos en cuanto se sumen al camino.
              </p>
            </div>

            <div className="coming-soon__steps" aria-hidden="true">
              <span className="coming-soon__step coming-soon__step--active" />
              <span className="coming-soon__step coming-soon__step--active" />
              <span className="coming-soon__step coming-soon__step--next" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

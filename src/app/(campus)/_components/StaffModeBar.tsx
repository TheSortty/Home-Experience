'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { IoEyeOutline, IoArrowBackOutline, IoBriefcaseOutline } from 'react-icons/io5';
import { resolveViewMode, type CampusRole } from '@/src/services/campusViewMode';

interface Props {
  role: CampusRole | null | undefined;
  actorName?: string | null;
}

/**
 * Sticky context bar shown when a staff user (admin/sysadmin) is browsing the
 * campus. Lets them switch between organizer view and preview-as-student, and
 * jump back to the admin shell.
 *
 * Rendered ONLY when mode is 'organizer' or 'preview' — never for actual
 * students.
 */
export default function StaffModeBar({ role, actorName }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = resolveViewMode(role, searchParams);

  if (mode === 'student') return null;

  // Preserve other query params when toggling `as`.
  const buildHref = (next: 'organizer' | 'student') => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('as');
    params.delete('preview');
    if (next === 'student') params.set('as', 'student');
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const isOrganizer = mode === 'organizer';
  const isPreview = mode === 'preview';

  return (
    <div
      className={`staff-mode-bar relative w-full ${
        isPreview ? 'staff-mode-bar--preview' : 'staff-mode-bar--organizer'
      }`}
      role="status"
      aria-label={isOrganizer ? 'Estás navegando como organizador' : 'Estás viendo el campus como un alumno'}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full shrink-0 ${isOrganizer ? 'bg-terra animate-pulse' : 'bg-amber-400 animate-pulse'}`}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-ink/80 truncate">
            {isOrganizer ? 'Modo organizador' : 'Vista alumno (preview)'}
            {actorName && (
              <span className="hidden md:inline text-ink/40 font-medium normal-case tracking-normal">
                {' · '}{actorName}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={buildHref('organizer')}
            className={`staff-mode-bar__toggle ${isOrganizer ? 'staff-mode-bar__toggle--active' : ''}`}
            aria-current={isOrganizer ? 'page' : undefined}
          >
            <IoBriefcaseOutline size={13} />
            Organizador
          </Link>
          <Link
            href={buildHref('student')}
            className={`staff-mode-bar__toggle ${isPreview ? 'staff-mode-bar__toggle--active' : ''}`}
            aria-current={isPreview ? 'page' : undefined}
          >
            <IoEyeOutline size={13} />
            Ver como alumno
          </Link>

          <Link
            href="/admin/dashboard"
            className="staff-mode-bar__back ml-1"
          >
            <IoArrowBackOutline size={13} />
            <span className="hidden sm:inline">Volver al admin</span>
          </Link>
        </div>
      </div>

      <style>{`
        .staff-mode-bar {
          border-bottom: 1px solid rgba(165, 94, 66, 0.18);
          background: linear-gradient(180deg, #F8EFE0 0%, #F1E6D2 100%);
        }
        .staff-mode-bar--preview {
          background: linear-gradient(180deg, #FEF3C7 0%, #FDE9B4 100%);
          border-bottom-color: rgba(217, 119, 6, 0.25);
        }

        .staff-mode-bar__toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(42, 37, 32, 0.55);
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid transparent;
          transition: all 180ms ease;
          white-space: nowrap;
        }
        .staff-mode-bar__toggle:hover {
          color: rgba(42, 37, 32, 0.9);
          background: rgba(255, 255, 255, 0.85);
        }
        .staff-mode-bar__toggle--active {
          background: #ffffff;
          color: #2A2520;
          border-color: rgba(165, 94, 66, 0.3);
          box-shadow: 0 1px 2px rgba(165, 94, 66, 0.12);
        }
        .staff-mode-bar--preview .staff-mode-bar__toggle--active {
          border-color: rgba(217, 119, 6, 0.35);
          box-shadow: 0 1px 2px rgba(217, 119, 6, 0.18);
        }

        .staff-mode-bar__back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: rgba(42, 37, 32, 0.6);
          transition: all 180ms ease;
          white-space: nowrap;
        }
        .staff-mode-bar__back:hover {
          color: #C97B5C;
        }
      `}</style>
    </div>
  );
}

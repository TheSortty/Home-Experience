import { IoShieldCheckmarkOutline, IoPersonOutline } from 'react-icons/io5';
import { isAdminRole } from '@/src/services/roleService';

type RoleBadgeVariant = 'organizador' | 'coach';

function resolveVariant(role?: string | null): RoleBadgeVariant | null {
  if (!role) return null;
  if (isAdminRole(role)) return 'organizador';
  if (role === 'coach') return 'coach';
  return null;
}

interface Props {
  role?: string | null;
  size?: 'sm' | 'xs';
}

export default function RoleBadge({ role, size = 'sm' }: Props) {
  const variant = resolveVariant(role);
  if (!variant) return null;

  const isOrg = variant === 'organizador';

  const baseClasses =
    size === 'xs'
      ? 'inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-black uppercase tracking-wider rounded-md border'
      : 'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border';

  const colorClasses = isOrg
    ? 'bg-amber-50 text-amber-700 border-amber-300'
    : 'bg-cyan-50 text-cyan-700 border-cyan-300';

  const Icon = isOrg ? IoShieldCheckmarkOutline : IoPersonOutline;
  const label = isOrg ? 'Organizador' : 'Coach';
  const iconSize = size === 'xs' ? 9 : 11;

  return (
    <span className={`${baseClasses} ${colorClasses}`}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
}

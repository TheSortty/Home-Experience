import { SupabaseClient } from '@supabase/supabase-js';

export const ADMIN_ROLES = ['admin', 'sysadmin', 'super_admin'] as const;
export type UserRole = typeof ADMIN_ROLES[number] | 'student';

/**
 * Fetch the user's role. Two strategies for resilience:
 *
 * 1. RPC get_user_role() — SECURITY DEFINER, bypasses RLS. Preferred.
 * 2. Direct profiles query — fallback if the RPC doesn't exist yet.
 *
 * This ensures the app works whether or not the SQL migration has been run.
 * Can be used with both client and server Supabase clients.
 */
export const resolveRole = async (
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<UserRole> => {
  // Strategy 1: RPC (preferred — bypasses RLS)
  try {
    const { data, error } = await supabase.rpc('get_user_role');
    if (!error && data) {
      const role = data as string;
      console.log('[RoleService] Role resolved via RPC:', role);
      return (role as UserRole) || 'student';
    }
    // RPC failed (might not exist yet) — fall through to strategy 2
    if (error) {
      console.warn('[RoleService] RPC fallback — get_user_role not available:', error.message);
    }
  } catch (err) {
    console.warn('[RoleService] RPC call failed, trying direct query', err);
  }

  // Strategy 2: Direct profiles query (works when RLS allows own profile read)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!error && data?.role) {
      console.log('[RoleService] Role resolved via direct query:', data.role);
      return data.role as UserRole;
    }
  } catch (err) {
    console.warn('[RoleService] Direct profiles query also failed', err);
  }

  // Both strategies failed — default to student (safe)
  console.warn('[RoleService] Could not resolve role, defaulting to student');
  return 'student';
};

/**
 * Helper to check if a role is an admin role.
 */
export const isAdminRole = (role: string): boolean => {
  return ADMIN_ROLES.includes(role as any);
};

import { SupabaseClient } from '@supabase/supabase-js';
import { restRpc, RestError } from './supabaseRest';

export const ADMIN_ROLES = ['admin', 'sysadmin', 'super_admin'] as const;
export type UserRole = typeof ADMIN_ROLES[number] | 'student';

const BROWSER_RPC_TIMEOUT_MS = 6_000;

/**
 * Resolve the current user's role.
 *
 *   Browser → REST `get_user_role` directly against PostgREST. We deliberately
 *             bypass the JS client because @supabase/supabase-js can hang
 *             during concurrent activity in long-lived admin sessions (the
 *             same reason supabaseRest.ts exists). Hanging here freezes
 *             AuthContext.isLoading and the entire admin dashboard.
 *
 *   Server  → use the provided client (middleware / layout). The server
 *             client is short-lived per request and has no hang issue.
 *
 * Both paths use SECURITY DEFINER `get_user_role()` which avoids the
 * is_staff()/profiles RLS chicken-and-egg.
 */
export const resolveRole = async (
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<UserRole> => {
  if (typeof window !== 'undefined') {
    return resolveRoleInBrowser(supabase, userId);
  }
  return resolveRoleOnServer(supabase, userId);
};

async function resolveRoleInBrowser(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<UserRole> {
  try {
    const role = await Promise.race([
      restRpc<string>('get_user_role'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('role_resolve_timeout')), BROWSER_RPC_TIMEOUT_MS)
      ),
    ]);
    if (typeof role === 'string' && role.length > 0) {
      console.log('[RoleService] Role resolved via REST RPC:', role);
      return role as UserRole;
    }
    console.warn('[RoleService] REST RPC returned empty role, defaulting to student');
    return 'student';
  } catch (err) {
    if (err instanceof RestError) {
      console.warn('[RoleService] REST RPC HTTP error', err.status, err.body);
    } else {
      console.warn('[RoleService] REST RPC failed/timeout, falling back to JS client', err);
    }
  }

  // Fallback to JS client RPC if REST is unreachable (offline, blocked, etc.).
  // Still wrapped in a timeout so a hung client doesn't deadlock the UI.
  try {
    const role = await Promise.race([
      supabase.rpc('get_user_role').then(({ data, error }) => {
        if (error) throw error;
        return data as string | null;
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('js_client_rpc_timeout')), BROWSER_RPC_TIMEOUT_MS)
      ),
    ]);
    if (typeof role === 'string' && role.length > 0) {
      console.log('[RoleService] Role resolved via JS client RPC (fallback):', role);
      return role as UserRole;
    }
  } catch (err) {
    console.warn('[RoleService] JS client RPC fallback failed', err);
  }

  console.warn('[RoleService] All strategies failed, defaulting to student');
  return 'student';
}

async function resolveRoleOnServer(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<UserRole> {
  try {
    const { data, error } = await supabase.rpc('get_user_role');
    if (!error && data) {
      const role = data as string;
      console.log('[RoleService] Role resolved via RPC:', role);
      return (role as UserRole) || 'student';
    }
    if (error) {
      console.warn('[RoleService] RPC fallback — get_user_role not available:', error.message);
    }
  } catch (err) {
    console.warn('[RoleService] RPC call failed, trying direct query', err);
  }

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

  console.warn('[RoleService] Could not resolve role, defaulting to student');
  return 'student';
}

/**
 * Helper to check if a role is an admin role.
 */
export const isAdminRole = (role: string): boolean => {
  return ADMIN_ROLES.includes(role as any);
};

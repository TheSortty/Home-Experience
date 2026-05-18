'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { resolveRole as resolveRoleService, UserRole } from '../services/roleService';

/**
 * Pull the access_token cookie out of document.cookie and decode the JWT
 * claims (no signature verification — purely for client-side identity).
 * Returns null if there's no cookie or the token can't be decoded.
 *
 * Used as a fallback path in initializeAuth() when supabase.auth.getSession()
 * fails because the cookie's refresh_token was invalidated by a prior race.
 * The access_token in the cookie is still valid (the server is using it for
 * SSR), so we can keep the dashboard alive instead of bouncing to login.
 */
function readJwtClaimsFromCookie(): { sub: string; email?: string } | null {
    if (typeof document === 'undefined') return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const projectRef = url.match(/https:\/\/([^.]+)/)?.[1] ?? '';
    if (!projectRef) return null;
    const cookieBase = `sb-${projectRef}-auth-token`;
    const allCookies = document.cookie.split(';').map(c => c.trim());
    const chunks: string[] = [];
    const base = allCookies.find(c => c.startsWith(`${cookieBase}=`));
    if (base) chunks.push(base.split('=').slice(1).join('='));
    for (let i = 0; ; i++) {
        const chunk = allCookies.find(c => c.startsWith(`${cookieBase}.${i}=`));
        if (!chunk) break;
        chunks.push(chunk.split('=').slice(1).join('='));
    }
    if (chunks.length === 0) return null;
    let raw = decodeURIComponent(chunks.join(''));
    if (raw.startsWith('base64-')) {
        const b64 = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/');
        try {
            raw = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
        } catch {
            return null;
        }
    }
    try {
        const parsed = JSON.parse(raw);
        const token: string = parsed.access_token ?? '';
        if (!token) return null;
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        return { sub: decoded.sub, email: decoded.email };
    } catch {
        return null;
    }
}

function isRefreshTokenError(err: any): boolean {
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    return msg.includes('refresh token') || msg.includes('refresh_token');
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: UserRole | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Use ref to avoid stale closure: always holds latest role/session state
    const mountedRef = useRef(true);

    // We use the central role service now.
    const resolveRole = async (userId: string): Promise<UserRole> => {
        return await resolveRoleService(supabase, userId);
    };

    useEffect(() => {
        mountedRef.current = true;

        /**
         * Safety net: under no circumstances should the dashboard stay stuck on
         * the auth spinner. If supabase.auth.getSession() itself hangs (which
         * has been observed in long-lived admin sessions) we release the loading
         * state after this deadline. Set above the combined role-resolution
         * timeouts (~12s) so the timer only fires for genuinely stuck states.
         */
        const SAFETY_DEADLINE_MS = 14_000;
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current) {
                console.warn('[AuthContext] Safety deadline hit, forcing isLoading=false');
                setIsLoading(false);
            }
        }, SAFETY_DEADLINE_MS);

        /**
         * Initialise auth state from the current cookie/localStorage session.
         * We call getSession() (cheap, no network) then fetchUser() (validates token)
         * so we display a fast initial UI while the real user object loads.
         */
        const initializeAuth = async () => {
            try {
                // Step 1: fast local check
                const { data: { session: localSession }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!mountedRef.current) return;

                if (localSession?.user) {
                    // Resolve role first before updating any state, to prevent UI race conditions
                    const resolvedRole = await resolveRole(localSession.user.id);
                    if (!mountedRef.current) return;

                    setSession(localSession);
                    setUser(localSession.user);
                    setRole(resolvedRole);
                } else {
                    setSession(null);
                    setUser(null);
                    setRole(null);
                }
            } catch (err) {
                // Specific recovery: when the cookie has a stale refresh_token
                // (typically left over from a prior concurrent-refresh race),
                // supabase.auth.getSession() throws "Invalid Refresh Token".
                // The access_token in the cookie is still valid though — the
                // SSR layer is using it just fine — so instead of nuking the
                // session and tipping the user out, we read the user identity
                // from the JWT claims and continue. The next clean login (or
                // cookie rotation on navigation) heals the refresh_token.
                if (isRefreshTokenError(err)) {
                    const claims = readJwtClaimsFromCookie();
                    if (claims?.sub) {
                        try {
                            const resolvedRole = await resolveRole(claims.sub);
                            if (!mountedRef.current) return;
                            // Build a minimal User. The JS client's full User
                            // object isn't reachable without a working refresh,
                            // but the dashboard only consumes id/email.
                            const minimalUser = {
                                id: claims.sub,
                                email: claims.email ?? '',
                                aud: 'authenticated',
                                app_metadata: {},
                                user_metadata: {},
                                created_at: '',
                            } as unknown as User;
                            setSession(null);
                            setUser(minimalUser);
                            setRole(resolvedRole);
                            console.warn('[AuthContext] Recovered from stale refresh token via cookie JWT.');
                            return;
                        } catch (recoveryErr) {
                            console.error('[AuthContext] Cookie-based recovery failed:', recoveryErr);
                        }
                    }
                }
                console.error("Error in initializeAuth:", err);
                setSession(null);
                setUser(null);
                setRole(null);
            } finally {
                if (mountedRef.current) {
                    clearTimeout(safetyTimer);
                    setIsLoading(false);
                }
            }
        };

        initializeAuth();

        /**
         * React to auth events (login, logout, token refresh, etc.).
         * Key fix: we batch session + role into a single async handler and
         * only call setState when BOTH values are ready → eliminates the
         * intermediate render where user ≠ null but role === null.
         */
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!mountedRef.current) return;

            if (event === 'SIGNED_OUT' || !newSession?.user) {
                setSession(null);
                setUser(null);
                setRole(null);
                setIsLoading(false);
                return;
            }

            // TOKEN_REFRESHED: just update the session/user object.
            // The role NEVER changes during a token refresh — re-fetching it
            // caused a brief role=null window that blanked the dashboard.
            if (event === 'TOKEN_REFRESHED') {
                setSession(newSession);
                setUser(newSession.user);
                // role stays unchanged — no setRole needed
                setIsLoading(false);
                return;
            }

            // INITIAL_SESSION is handled by initializeAuth() above.
            // Skip it here to avoid a duplicate role fetch on first load.
            if (event === 'INITIAL_SESSION') {
                setIsLoading(false);
                return;
            }

            // For SIGNED_IN and USER_UPDATED: fully resolve role + batch update
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                const resolvedRole = await resolveRole(newSession.user.id);
                if (!mountedRef.current) return;
                setSession(newSession);
                setUser(newSession.user);
                setRole(resolvedRole);
                setIsLoading(false);
            }
        });

        // The @supabase/ssr createBrowserClient handles token rotation automatically
        // via its internal scheduler. A manual refreshSession() interval here runs
        // concurrently with Supabase's own refresh, which can create race conditions
        // where onAuthStateChange fires twice and momentarily clears role/user state.

        return () => {
            mountedRef.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);




    return (
        <AuthContext.Provider value={{ session, user, role, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};

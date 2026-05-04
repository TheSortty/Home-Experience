'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: 'admin' | 'sysadmin' | 'student' | null;
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
    const [role, setRole] = useState<'admin' | 'sysadmin' | 'student' | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Use ref to avoid stale closure: always holds latest role/session state
    const mountedRef = useRef(true);

    /**
     * Fetch the user's role. Two strategies for resilience:
     *
     * 1. RPC get_user_role() — SECURITY DEFINER, bypasses RLS. Preferred.
     * 2. Direct profiles query — fallback if the RPC doesn't exist yet.
     *
     * This ensures the app works whether or not the SQL migration has been run.
     */
    const resolveRole = async (userId: string): Promise<'admin' | 'sysadmin' | 'student'> => {
        // Strategy 1: RPC (preferred — bypasses RLS)
        try {
            const { data, error } = await supabase.rpc('get_user_role');
            if (!error && data) {
                const role = data as string;
                console.log('[AuthContext] Role resolved via RPC:', role);
                return (role as 'admin' | 'sysadmin' | 'student') || 'student';
            }
            // RPC failed (might not exist yet) — fall through to strategy 2
            if (error) console.warn('[AuthContext] RPC fallback — get_user_role not available:', error.message);
        } catch {
            console.warn('[AuthContext] RPC call failed, trying direct query');
        }

        // Strategy 2: Direct profiles query (works when RLS allows own profile read)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', userId)
                .single();

            if (!error && data?.role) {
                console.log('[AuthContext] Role resolved via direct query:', data.role);
                return data.role as 'admin' | 'sysadmin' | 'student';
            }
        } catch {
            console.warn('[AuthContext] Direct profiles query also failed');
        }

        // Both strategies failed — default to student (safe, admin guard will redirect)
        console.warn('[AuthContext] Could not resolve role, defaulting to student');
        return 'student';
    };

    useEffect(() => {
        mountedRef.current = true;

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
                    // Immediately set what we have so the UI isn't blocked
                    setSession(localSession);
                    setUser(localSession.user);

                    // Step 2: resolve role (may need a network round-trip)
                    const resolvedRole = await resolveRole(localSession.user.id);
                    if (!mountedRef.current) return;
                    setRole(resolvedRole);
                } else {
                    setSession(null);
                    setUser(null);
                    setRole(null);
                }
            } catch (err) {
                console.error("Error in initializeAuth:", err);
                setSession(null);
                setUser(null);
                setRole(null);
            } finally {
                if (mountedRef.current) {
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

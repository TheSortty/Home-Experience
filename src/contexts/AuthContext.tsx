'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: 'admin' | 'sysadmin' | null;
    isLoading: boolean;
    isPasswordRecovery: boolean;
    setIsPasswordRecovery: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    session: null, 
    user: null, 
    role: null,
    isLoading: true,
    isPasswordRecovery: false,
    setIsPasswordRecovery: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'sysadmin' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
        return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    });

    // Use ref to avoid stale closure: always holds latest role/session state
    const mountedRef = useRef(true);

    /**
     * Fetch the user's role from the profiles table.
     * Returns the role string so the caller can batch the state update.
     * This avoids the two-render problem (setUser → setRole) that caused
     * fetchDashboardData to run with role=null momentarily.
     */
    const resolveRole = async (userId: string, retries = 3): Promise<'admin' | 'sysadmin'> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', userId)
                .single();
            
            if (error || !data) {
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 600));
                    return resolveRole(userId, retries - 1);
                }
                return 'admin'; // safe fallback
            }
            return (data.role as 'admin' | 'sysadmin') ?? 'admin';
        } catch {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 600));
                return resolveRole(userId, retries - 1);
            }
            return 'admin';
        }
    };

    useEffect(() => {
        mountedRef.current = true;

        /**
         * Initialise auth state from the current cookie/localStorage session.
         * We call getSession() (cheap, no network) then fetchUser() (validates token)
         * so we display a fast initial UI while the real user object loads.
         */
        const initializeAuth = async () => {
            // Step 1: fast local check
            const { data: { session: localSession } } = await supabase.auth.getSession();
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

            setIsLoading(false);
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

            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
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

        /**
         * Proactive token refresh every 8 minutes.
         * Supabase tokens expire after 1 hour, but SHORT-lived dev setups or
         * misconfigured projects can have much shorter expiries.
         * This ensures we never silently lose a session while the admin
         * is actively using the dashboard.
         */
        const refreshInterval = setInterval(async () => {
            if (!mountedRef.current) return;
            try {
                const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
                if (!mountedRef.current) return;

                if (error || !refreshed) {
                    // Session cannot be refreshed → sign out gracefully
                    setSession(null);
                    setUser(null);
                    setRole(null);
                } else {
                    // Update session object without touching role (it didn't change)
                    setSession(refreshed);
                    setUser(refreshed.user);
                }
            } catch (err) {
                console.warn('[AuthContext] Periodic refresh failed:', err);
            }
        }, 8 * 60 * 1000); // every 8 minutes

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
            clearInterval(refreshInterval);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, role, isLoading, isPasswordRecovery, setIsPasswordRecovery }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};

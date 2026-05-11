'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { resolveRole as resolveRoleService, UserRole } from '../services/roleService';

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

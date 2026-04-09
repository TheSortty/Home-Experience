import React, { createContext, useContext, useEffect, useState } from 'react';
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
        // Sync check prevents React Router from stripping the hash before Supabase parses it.
        return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    });

    const fetchRole = async (userId: string, retries = 2): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', userId)
                .single();
            
            if (error || !data) {
                // RLS may block the query if the token hasn't fully propagated yet.
                // Retry after a short delay before falling back.
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, 500));
                    return fetchRole(userId, retries - 1);
                }
                setRole('admin');
            } else {
                setRole(data.role as any);
            }
        } catch (err) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 500));
                return fetchRole(userId, retries - 1);
            }
            setRole('admin');
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await fetchRole(session.user.id);
            } else {
                setRole(null);
            }
            setIsLoading(false);
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await fetchRole(session.user.id);
            } else {
                setRole(null);
            }
            
            setIsLoading(false);
            
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
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

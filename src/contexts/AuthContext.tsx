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

    const fetchRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', userId)
                .single();
            
            if (error || !data) {
                setRole('admin');
            } else {
                setRole(data.role as any);
            }
        } catch (err) {
            setRole('admin');
        }
    };

    useEffect(() => {
        // Inicializar estado con la sesión actual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchRole(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

        return () => subscription.unsubscribe();
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

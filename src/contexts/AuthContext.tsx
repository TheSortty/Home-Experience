import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    isPasswordRecovery: boolean;
    setIsPasswordRecovery: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ 
    session: null, 
    user: null, 
    isLoading: true,
    isPasswordRecovery: false,
    setIsPasswordRecovery: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
        // Sync check prevents React Router from stripping the hash before Supabase parses it.
        return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
    });

    useEffect(() => {
        // Inicializar estado con la sesión actual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
            
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, isLoading, isPasswordRecovery, setIsPasswordRecovery }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};

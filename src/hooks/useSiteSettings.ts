import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface SiteSetting {
    key: string;
    value: string;
    label: string;
    description: string;
    category: 'general' | 'pricing' | 'contact' | 'links';
    input_type: 'text' | 'number' | 'email' | 'url' | 'longtext';
}

export const useSiteSettings = () => {
    const [settings, setSettings] = useState<SiteSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to get a single value quickly
    const getValue = (key: string, defaultValue: string = ''): string => {
        const setting = settings.find(s => s.key === key);
        return setting ? setting.value : defaultValue;
    };

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .order('category')
            .order('key');

        if (error) {
            console.error('Error fetching settings:', error);
            setError(error.message);
        } else {
            setSettings(data as SiteSetting[]);
        }
        setLoading(false);
    };

    const updateSetting = async (key: string, newValue: string) => {
        const { error } = await supabase
            .from('site_settings')
            .update({ value: newValue, updated_at: new Date().toISOString() })
            .eq('key', key);

        if (error) {
            console.error('Error updating setting:', error);
            throw error;
        }

        // Optimistic update or refetch
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value: newValue } : s));
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return {
        settings,
        loading,
        error,
        getValue,
        updateSetting,
        refresh: fetchSettings
    };
};

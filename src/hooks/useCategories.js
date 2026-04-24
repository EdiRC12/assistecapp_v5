import { useState, useCallback, useEffect } from 'react';
import { INITIAL_NATIVE_CATEGORIES } from '../constants/taskConstants';

export const useCategories = (supabase, currentUser, { notifySuccess, notifyError } = {}) => {
    const [customCategories, setCustomCategories] = useState(INITIAL_NATIVE_CATEGORIES);

    const fetchCustomCategories = useCallback(async () => {
        if (!supabase || !currentUser) return;
        try {
            console.log('[useCategories] Buscando custom_categories...');
            const { data, error } = await supabase.from('custom_categories').select('*');
            if (error) {
                console.error('[useCategories] Erro Supabase:', error);
                throw error;
            }

            const mapped = (data || []).map(c => ({
                ...c,
                isNative: c.is_native
            }));
            setCustomCategories([...INITIAL_NATIVE_CATEGORIES, ...mapped]);
        } catch (error) {
            console.error('Error fetching custom categories:', error);
        }
    }, [supabase, currentUser]);

    const handleSaveCategories = useCallback(async (newCategories) => {
        if (!supabase || !currentUser) return;
        try {
            const customCatsToSave = newCategories
                .filter(c => !c.isNative)
                .map(c => ({
                    id: c.id,
                    label: c.label,
                    fields: c.fields,
                    stages: c.stages,
                    is_native: false,
                    user_id: currentUser.id
                }));

            if (customCatsToSave.length > 0) {
                console.log('[useCategories] Tentando salvar em custom_categories:', customCatsToSave);
                const { error } = await supabase.from('custom_categories').upsert(customCatsToSave);
                if (error) {
                    console.error('[useCategories] Erro ao salvar no Supabase:', error);
                    throw error;
                }
            }
            // Optimistic update
            setCustomCategories([...INITIAL_NATIVE_CATEGORIES, ...newCategories.filter(c => !c.isNative)]);
            if (notifySuccess) notifySuccess('Sucesso', 'Categorias atualizadas com sucesso.');
        } catch (error) {
            console.error('Error saving categories:', error);
            if (notifyError) notifyError('Erro ao salvar', error.message);
        }
    }, [supabase, currentUser]);

    useEffect(() => {
        if (currentUser) {
            fetchCustomCategories();
        } else {
            setCustomCategories(INITIAL_NATIVE_CATEGORIES);
        }
    }, [currentUser, fetchCustomCategories]);

    return {
        customCategories,
        setCustomCategories,
        fetchCustomCategories,
        handleSaveCategories
    };
};

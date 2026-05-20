import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import AutocompleteInput from './AutocompleteInput';

/**
 * Helper utility to save client product associations in client_products table.
 * Resolves potential duplicates gracefully by checking first.
 */
export const saveClientProduct = async (clientName, productName) => {
    if (!clientName || !productName || !productName.trim()) return;
    
    const trimmedClient = clientName.trim();
    const trimmedProduct = productName.trim();

    try {
        // Query to check if the client-product association already exists
        const { data, error } = await supabase
            .from('client_products')
            .select('id')
            .eq('client_name', trimmedClient)
            .eq('product_name', trimmedProduct)
            .maybeSingle();

        if (error) {
            console.error('Error checking existing client-product:', error);
            return;
        }

        // If it doesn't exist, insert it
        if (!data) {
            const { error: insertError } = await supabase
                .from('client_products')
                .insert([{ client_name: trimmedClient, product_name: trimmedProduct }]);

            if (insertError) {
                console.error('Error inserting client-product:', insertError);
            }
        }
    } catch (err) {
        console.error('Error in saveClientProduct:', err);
    }
};

const ProductAutocomplete = ({ 
    clientName, 
    value, 
    onChange, 
    label = "Item / Produto", 
    placeholder = "Selecione ou digite o item...", 
    className, 
    containerClassName,
    disabled = false,
    icon
}) => {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        if (!clientName || !clientName.trim()) {
            setOptions([]);
            return;
        }

        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase
                    .from('client_products')
                    .select('product_name')
                    .eq('client_name', clientName.trim())
                    .order('product_name', { ascending: true });

                if (!error && data) {
                    // Map to the shape expected by AutocompleteInput
                    const mapped = data.map(p => ({
                        id: p.product_name,
                        label: p.product_name
                    }));
                    setOptions(mapped);
                }
            } catch (err) {
                console.error('Error fetching client products:', err);
            }
        };

        fetchProducts();
    }, [clientName]);

    return (
        <AutocompleteInput
            label={label}
            icon={icon !== undefined ? icon : Package}
            placeholder={placeholder}
            value={value}
            options={options}
            onChange={onChange}
            className={className}
            containerClassName={containerClassName}
            disabled={disabled}
        />
    );
};

export default ProductAutocomplete;

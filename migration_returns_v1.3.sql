-- Migration: Add missing uom column to product_returns
-- Description: Adds the unit of measure column to product_returns for consistency with RNC records.

ALTER TABLE public.product_returns ADD COLUMN uom TEXT DEFAULT 'kg';

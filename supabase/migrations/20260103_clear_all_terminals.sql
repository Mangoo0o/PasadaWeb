-- =========================================================
-- PasadaGuide: Clear All Terminals & Remove Terminal Associations
-- =========================================================

-- 1. Unlink terminals from location_fares
UPDATE public.location_fares
SET origin_terminal_id = NULL;

-- 2. Unlink terminals from drivers
UPDATE public.drivers
SET terminal_id = NULL;

-- 3. Unlink terminals from fare_matrix
UPDATE public.fare_matrix
SET origin_terminal_id = NULL;

-- 4. Delete all terminals
DELETE FROM public.terminals;

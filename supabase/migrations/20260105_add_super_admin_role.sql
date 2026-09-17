-- =========================================================
-- PasadaWeb: Set super_admin role (no enum alter needed)
-- Run this in: Supabase Dashboard > SQL Editor
-- =========================================================

-- Step 1: Convert role column to plain text (drops enum restriction)
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text;

-- Step 2: Set your account to super_admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE id = 'eda615a6-e003-41e9-9560-4c3f8564f318';

-- Step 3: Verify
SELECT id, role, full_name
FROM public.profiles
WHERE id = 'eda615a6-e003-41e9-9560-4c3f8564f318';

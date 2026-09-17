-- =========================================================
-- PasadaGuide: Super Admin RBAC & Audit Trail Policies
-- Migration: 20260106_super_admin_rbac_and_audit_trail.sql
-- =========================================================

-- 1. Ensure profiles.role column supports 'super_admin'
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE text;

-- 2. Add administrative metadata columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 3. Ensure admin_actions audit table exists
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_table text NOT NULL,
  target_id text,
  details_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create performance indexes for compliance querying
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON public.admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON public.admin_actions(action_type);

-- 4. Enable RLS on admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies for admin_actions (Admins & Super Admins ONLY)
DROP POLICY IF EXISTS "Admins view all actions" ON public.admin_actions;
CREATE POLICY "Admins view all actions" ON public.admin_actions
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Admins insert actions" ON public.admin_actions;
CREATE POLICY "Admins insert actions" ON public.admin_actions
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

-- 6. Strict Super-Admin-Only RBAC Policy for Admin Provisioning in profiles
-- Only users with role 'super_admin' are allowed to create or elevate a profile to 'admin' or 'super_admin'.
DROP POLICY IF EXISTS "Super admins manage admin roles" ON public.profiles;
CREATE POLICY "Super admins manage admin roles" ON public.profiles
  FOR UPDATE USING (
    -- If updating role to admin/super_admin, caller must be super_admin
    CASE 
      WHEN role IN ('admin', 'super_admin') THEN 
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
      ELSE true
    END
  );

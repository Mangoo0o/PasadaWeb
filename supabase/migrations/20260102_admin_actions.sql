-- =========================================================
-- Admin Actions (Audit Trail) Table (Idempotent)
-- =========================================================

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  target_table text not null,
  target_id text,
  details_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.admin_actions enable row level security;

-- Policies: only admins can read and write audit actions
drop policy if exists "Admins view all actions" on public.admin_actions;
create policy "Admins view all actions" on public.admin_actions
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins insert actions" on public.admin_actions;
create policy "Admins insert actions" on public.admin_actions
  for insert with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

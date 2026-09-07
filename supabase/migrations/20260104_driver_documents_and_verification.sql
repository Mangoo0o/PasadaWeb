-- =========================================================
-- Driver Documents & Verification Review Flow
-- =========================================================

-- 1. Create driver_documents Table
create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('license', 'or_cr', 'mtop', 'barangay_clearance', 'police_clearance')),
  file_url text not null,
  file_name text not null,
  file_size integer,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  uploaded_at timestamptz default now()
);

-- 2. Add review & status columns to drivers if not already present
alter table public.drivers 
  add column if not exists rejection_reason text,
  add column if not exists documents_submitted_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

-- Drop foreign key constraint on reviewed_by if it exists (allows mock super-admin or non-profile admin IDs)
alter table public.drivers drop constraint if exists drivers_reviewed_by_fkey;

-- 3. Set default verification_status in drivers to 'pending'
alter table public.drivers alter column verification_status set default 'pending';

-- 4. Enable RLS on driver_documents
alter table public.driver_documents enable row level security;

-- 5. Permissive policies for driver_documents
drop policy if exists "Allow all write driver_documents" on public.driver_documents;
create policy "Allow all write driver_documents" on public.driver_documents for all using (true) with check (true);

-- 6. Grant permissions
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.driver_documents to anon, authenticated, service_role;

-- 7. Supabase Storage bucket setup (if extensions / storage schema available)
insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public view of driver documents" on storage.objects;
create policy "Allow public view of driver documents"
  on storage.objects for select
  using (bucket_id = 'driver-documents');

drop policy if exists "Allow authenticated upload of driver documents" on storage.objects;
create policy "Allow authenticated upload of driver documents"
  on storage.objects for insert
  with check (bucket_id = 'driver-documents');

drop policy if exists "Allow update driver documents" on storage.objects;
create policy "Allow update driver documents"
  on storage.objects for update
  using (bucket_id = 'driver-documents');

-- =========================================================
-- PasadaGuide: Location-Based Pricing & Proximity Migration
-- =========================================================

-- 1. Create Location Fares Table
create table if not exists public.location_fares (
  id uuid primary key default gen_random_uuid(),
  origin_terminal_id uuid references public.terminals(id) on delete cascade,
  location_name text not null,
  lat double precision not null,
  lng double precision not null,
  proximity_radius_meters integer not null default 800,
  standard_fare numeric(6,2) not null default 20.00,
  discounted_fare numeric(6,2),
  icon text default 'pin',
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure icon column exists if table was already created
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='icon') then
    alter table public.location_fares add column icon text default 'pin';
  end if;
end $$;

-- 2. Grants & RLS
grant usage on schema public to anon, authenticated, service_role;
grant all on public.location_fares to anon, authenticated, service_role;

alter table public.location_fares enable row level security;

drop policy if exists "Allow all write location_fares" on public.location_fares;
create policy "Allow all write location_fares" on public.location_fares for all using (true) with check (true);

-- 3. Seed Initial Bauang Location Fares (Valid UUID format, Dynamic Terminal Foreign Key & Custom Icons)
insert into public.location_fares (id, origin_terminal_id, location_name, lat, lng, proximity_radius_meters, standard_fare, discounted_fare, icon, notes)
values
  (
    'a0000001-0000-0000-0000-000000000001',
    (select id from public.terminals limit 1),
    'Bauang Town Plaza & Munisipyo',
    16.5333,
    120.3333,
    600,
    20.00,
    16.00,
    'landmark',
    'Zone 1: Central Commercial Hub & Town Hall'
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    (select id from public.terminals limit 1),
    'Sts. Peter & Paul Parish Church',
    16.5330,
    120.3325,
    500,
    20.00,
    16.00,
    'church',
    'Zone 1: Historical Landmark & Church Ground'
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    (select id from public.terminals limit 1),
    'Bauang Public Market & Trading Post',
    16.5350,
    120.3350,
    700,
    20.00,
    16.00,
    'market',
    'Zone 1: Commercial Market & Terminal Exchange'
  ),
  (
    'a0000001-0000-0000-0000-000000000004',
    (select id from public.terminals limit 1),
    'Central West Elementary & Barangay Hall',
    16.5310,
    120.3270,
    800,
    25.00,
    20.00,
    'school',
    'Zone 2: Residential Community & School Zone'
  ),
  (
    'a0000001-0000-0000-0000-000000000005',
    (select id from public.terminals limit 1),
    'Baccuit Sur Barangay Center',
    16.5210,
    120.3280,
    1000,
    30.00,
    24.00,
    'barangay',
    'Zone 3: South Barangay Highway Corridor'
  ),
  (
    'a0000001-0000-0000-0000-000000000006',
    (select id from public.terminals limit 1),
    'Lomboy Grape Farms (Agritourism Hub)',
    16.5250,
    120.3400,
    1000,
    35.00,
    28.00,
    'farm',
    'Zone 3: Pioneer Vineyard & Farm Tourism Zone'
  ),
  (
    'a0000001-0000-0000-0000-000000000007',
    (select id from public.terminals limit 1),
    'Bauang Beach & Sunset Park (Bagbag)',
    16.5410,
    120.3190,
    1200,
    40.00,
    32.00,
    'beach',
    'Zone 4: Coastal Beach & Resort Tourist Hub'
  ),
  (
    'a0000001-0000-0000-0000-000000000008',
    (select id from public.terminals limit 1),
    'Paringao Coastal & Resort Strip',
    16.5490,
    120.3150,
    1200,
    45.00,
    36.00,
    'resort',
    'Zone 4: North Coastal Beach & Hotel Zone'
  ),
  (
    'a0000001-0000-0000-0000-000000000009',
    (select id from public.terminals limit 1),
    'Quinavite Barangay Hall & Highway Junction',
    16.5200,
    120.3480,
    900,
    35.00,
    28.00,
    'gas',
    'Zone 3: East Inland Agricultural District'
  ),
  (
    'a0000001-0000-0000-0000-000000000010',
    (select id from public.terminals limit 1),
    'Calumbaya Rural High School & Valley',
    16.5120,
    120.3550,
    1200,
    50.00,
    40.00,
    'park',
    'Zone 5: Outer Foothills & Extended Barangay Route'
  )
on conflict (id) do update set
  standard_fare = excluded.standard_fare,
  discounted_fare = excluded.discounted_fare,
  proximity_radius_meters = excluded.proximity_radius_meters,
  lat = excluded.lat,
  lng = excluded.lng,
  icon = excluded.icon,
  notes = excluded.notes;

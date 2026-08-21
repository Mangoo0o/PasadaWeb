-- =========================================================
-- PasadaGuide Database Schema & RLS Setup
-- =========================================================

-- 1. Enable PostGIS Extension if available
create extension if not exists "postgis";

-- 2. Enum Types
do $$ begin
  create type user_role as enum ('passenger', 'driver', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type booking_status as enum (
    'searching', 'driver_assigned', 'driver_arrived', 
    'in_transit', 'completed', 'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_method as enum ('cash', 'digital_wallet');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type complaint_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end $$;

-- 3. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'passenger',
  full_name text not null,
  phone_number text,
  photo_url text,
  language_pref text default 'fil',
  created_at timestamptz default now()
);

-- 4. Terminals Table
create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  lat double precision not null,
  lng double precision not null,
  base_fare numeric(6,2) not null default 15.00,
  base_km numeric(4,2) default 1.00,
  per_km_rate numeric(6,2) not null default 5.00,
  coverage_polygon jsonb,
  description text,
  created_at timestamptz default now()
);

-- 5. Drivers Table
create table if not exists public.drivers (
  id uuid primary key references public.profiles(id) on delete cascade,
  terminal_id uuid references public.terminals(id),
  tricycle_model text not null,
  plate_number text not null unique,
  body_number text not null,
  verification_status text default 'pending',
  is_available boolean default false,
  current_lat double precision,
  current_lng double precision,
  rating_avg numeric(3,2) default 5.00,
  total_trips integer default 0,
  earnings_today numeric(8,2) default 0.00,
  updated_at timestamptz default now()
);

-- 6. Fare Matrix (Versioned)
create table if not exists public.fare_matrix (
  id uuid primary key default gen_random_uuid(),
  origin_terminal_id uuid references public.terminals(id) on delete cascade,
  base_fare numeric(6,2) not null,
  base_km numeric(4,2) default 1.00,
  per_km_rate numeric(6,2) not null,
  night_differential_multiplier numeric(3,2) default 1.15,
  effective_date date not null default current_date,
  updated_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 7. Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(id),
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_name text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  estimated_distance_km numeric(5,2) not null,
  estimated_duration_min integer not null,
  estimated_fare numeric(8,2) not null,
  final_fare numeric(8,2),
  cancellation_fee numeric(8,2) default 0.00,
  cancellation_reason text,
  cancelled_by uuid references public.profiles(id),
  status booking_status not null default 'searching',
  payment_method payment_method default 'cash',
  created_at timestamptz default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

-- 8. Ratings & Reviews
create table if not exists public.trip_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  passenger_rating smallint check (passenger_rating between 1 and 5),
  passenger_feedback text,
  driver_rating smallint check (driver_rating between 1 and 5),
  driver_feedback text,
  created_at timestamptz default now()
);

-- 9. Complaints
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  passenger_id uuid not null references public.profiles(id),
  driver_id uuid references public.drivers(id),
  category text not null,
  description text not null,
  status complaint_status default 'open',
  resolution_notes text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- 10. Tourist Spots
create table if not exists public.tourist_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'historical',
  description text not null,
  tagalog_description text,
  lat double precision not null,
  lng double precision not null,
  opening_hours text,
  audio_url text,
  cover_image_url text,
  qr_code_ref text unique,
  nearest_terminal_name text,
  est_tricycle_fare numeric(6,2) default 15.00,
  created_at timestamptz default now()
);

-- 11. Admin Actions (Audit Trail)
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  target_table text not null,
  target_id text,
  details_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 12. Location Fares (Location-Based Tariff Rates with Proximity)
create table if not exists public.location_fares (
  id uuid primary key default gen_random_uuid(),
  origin_terminal_id uuid references public.terminals(id) on delete cascade,
  location_name text not null,
  lat double precision not null,
  lng double precision not null,
  proximity_radius_meters integer not null default 800,
  standard_fare numeric(6,2) not null default 20.00,
  discounted_fare numeric(6,2),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =========================================================
-- Schema Grants & Row Level Security (RLS) Policies (Permissive)
-- =========================================================
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.terminals enable row level security;
alter table public.drivers enable row level security;
alter table public.fare_matrix enable row level security;
alter table public.location_fares enable row level security;
alter table public.bookings enable row level security;
alter table public.trip_reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.tourist_spots enable row level security;
alter table public.admin_actions enable row level security;

-- 0. Location Fares
drop policy if exists "Allow all write location_fares" on public.location_fares;
create policy "Allow all write location_fares" on public.location_fares for all using (true) with check (true);

-- 1. Profiles
drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "User update own profile" on public.profiles;
drop policy if exists "User insert own profile" on public.profiles;
drop policy if exists "Allow all write profiles" on public.profiles;
create policy "Allow all write profiles" on public.profiles for all using (true) with check (true);

-- 2. Terminals (Public read & LGU Admin write)
drop policy if exists "Public read terminals" on public.terminals;
drop policy if exists "Admin manage terminals" on public.terminals;
drop policy if exists "Allow all write terminals" on public.terminals;
create policy "Allow all write terminals" on public.terminals for all using (true) with check (true);

-- 3. Drivers
drop policy if exists "Public read drivers" on public.drivers;
drop policy if exists "Driver update own info" on public.drivers;
drop policy if exists "Driver insert own info" on public.drivers;
drop policy if exists "Allow all write drivers" on public.drivers;
create policy "Allow all write drivers" on public.drivers for all using (true) with check (true);

-- 4. Fare Matrix
drop policy if exists "Public read fare matrix" on public.fare_matrix;
drop policy if exists "Admin manage fare matrix" on public.fare_matrix;
drop policy if exists "Allow all write fare matrix" on public.fare_matrix;
create policy "Allow all write fare matrix" on public.fare_matrix for all using (true) with check (true);

-- 5. Tourist Spots
drop policy if exists "Public read tourist spots" on public.tourist_spots;
drop policy if exists "Admin manage tourist spots" on public.tourist_spots;
drop policy if exists "Allow all write tourist spots" on public.tourist_spots;
create policy "Allow all write tourist spots" on public.tourist_spots for all using (true) with check (true);

-- 6. Bookings
drop policy if exists "Parties view bookings" on public.bookings;
drop policy if exists "Passengers create bookings" on public.bookings;
drop policy if exists "Driver and passenger update bookings" on public.bookings;
drop policy if exists "Allow all write bookings" on public.bookings;
create policy "Allow all write bookings" on public.bookings for all using (true) with check (true);

-- 7. Complaints
drop policy if exists "Parties view complaints" on public.complaints;
drop policy if exists "Passengers submit complaints" on public.complaints;
drop policy if exists "Admin update complaints" on public.complaints;
drop policy if exists "Allow all write complaints" on public.complaints;
create policy "Allow all write complaints" on public.complaints for all using (true) with check (true);

-- 8. Admin Actions Audit Trail
drop policy if exists "Admins view all actions" on public.admin_actions;
drop policy if exists "Admins insert actions" on public.admin_actions;
drop policy if exists "Allow all write admin_actions" on public.admin_actions;
create policy "Allow all write admin_actions" on public.admin_actions for all using (true) with check (true);




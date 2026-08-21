-- =========================================================
-- PasadaGuide: Bauang Smart Transit Database Seed Data
-- =========================================================

-- 1. Insert Bauang Terminals
insert into public.terminals (id, name, code, lat, lng, base_fare, base_km, per_km_rate, description)
values
  ('term-bauang-central', 'Bauang Central TODA (Town Plaza)', 'BCT-01', 16.5333, 120.3333, 20.00, 2.00, 5.00, 'Main municipal plaza hub connecting Bauang Town Hall, Sts. Peter & Paul Parish, and highway junction.'),
  ('term-public-market', 'Bauang Public Market TODA', 'BPM-02', 16.5350, 120.3350, 20.00, 2.00, 5.00, 'Active commercial trading terminal with routes to coastal barangays and grape farms.'),
  ('term-baccuit', 'Baccuit Sur TODA Terminal', 'BST-03', 16.5210, 120.3280, 25.00, 2.00, 5.00, 'Connects residential districts and provincial grape vineyards along coastal roads.'),
  ('term-beach', 'Bauang Beach & Resort Hub TODA', 'PBT-04', 16.5410, 120.3190, 25.00, 2.00, 6.00, 'Tourist hotspot terminal for sunset resorts, beach hotels, and coastal seafood restaurants.')
on conflict (code) do update set
  base_fare = excluded.base_fare,
  per_km_rate = excluded.per_km_rate;

-- 2. Insert Fare Matrices
insert into public.fare_matrix (origin_terminal_id, base_fare, base_km, per_km_rate, night_differential_multiplier, effective_date)
values
  ('term-bauang-central', 20.00, 2.00, 5.00, 1.15, '2026-01-01'),
  ('term-public-market', 20.00, 2.00, 5.00, 1.15, '2026-01-01'),
  ('term-baccuit', 25.00, 2.00, 5.00, 1.20, '2026-01-01'),
  ('term-beach', 25.00, 2.00, 6.00, 1.15, '2026-01-01')
on conflict do nothing;

-- 3. Insert Bauang Tourist Spots
insert into public.tourist_spots (id, name, category, description, tagalog_description, lat, lng, opening_hours, audio_url, cover_image_url, qr_code_ref, nearest_terminal_name, est_tricycle_fare)
values
  (
    'spot-lomboy',
    'Lomboy Grape Farms (Pioneer Vineyard)',
    'nature',
    'Experience grape picking in the pioneer vineyard of the Philippines. Perfect for families, wine tasting, and agritourism enthusiasts in Bauang.',
    'Maranasan ang pamimitas ng ubas sa pinakaunang ubasan sa Pilipinas. Tamang-tama para sa buong pamilya at turista.',
    16.5250,
    120.3400,
    '7:00 AM – 5:00 PM Daily',
    'https://cdn.freesound.org/previews/518/518854_6142149-lq.mp3',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAaXNEqwARW2YSO6kN6v4HlLdyswzuuyCALEz8QUlPSS_ckPHVMiZ6o5z90KnAZclsEW6HXHYLO5FtLTaeRmrIRuh2_OzY5KPzIpJEPMuPLRd4mgaUW0DibO14mTVCbUwgyYOMgsEVZQ5aHUs5w6kO19KZNi077AHedKlJ1H85c4eNMDv3bl7ape6j3OwD-MvP7QvgGF5ZbrmmxYEOJS-RTBwa_PdYhbzE8WlEeJ64UOfUwj2tp04M6',
    'PASADA-BAUANG-LOMBOY',
    'Bauang Public Market TODA',
    35.00
  ),
  (
    'spot-beach',
    'Bauang Beach & Sunset Park',
    'recreation',
    'Long stretches of grey sand perfect for swimming, beach volleyball, and enjoying the sunset over the West Philippine Sea.',
    'Mahabang baybayin ng buhangin na paborito para sa paliligo, beach volleyball, at panonood ng paglubog ng araw.',
    16.5410,
    120.3190,
    'Open 24/7 (Resorts & Grills open till 11 PM)',
    'https://cdn.freesound.org/previews/518/518854_6142149-lq.mp3',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBfawLg3u2uN_EgLI97jVMcpjG1N47PO5wjVJIHCELbAlzmiOYC3jpYlQWls-fG_dyBSjzgR7nv8nJ-QidgxexaGB72FOaOCynYBbjC28h0NtYcc6fBpg-UQxMwftoAtM_VQBgfX6f5vUC1YZlEB0UCvAnK9W-Po0sAEJ6heEnolBPD9PXYFK8wbXJrg5t2wtoLHWoQPPEm5pyxlUvcArSc-6olN4VNffJeOCc3dtHXJBLI9MPKfBh5',
    'PASADA-BAUANG-BEACH',
    'Bauang Central TODA',
    40.00
  ),
  (
    'spot-church',
    'Sts. Peter & Paul Parish Church',
    'historical',
    'Historic 400-year-old stone church constructed during the Spanish colonial era, featuring the celebrated San Pedro bell and coral adobe walls.',
    'Makasaysayang 400-taong simbahang bato na tanyag sa makasaysayang San Pedro Bell at arkitekturang Espanyol.',
    16.5330,
    120.3325,
    '6:00 AM – 7:00 PM Daily',
    'https://cdn.freesound.org/previews/518/518854_6142149-lq.mp3',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDPd54EAP96i1jtxk7v33UlLricCOFKuukJ5POU0DSxVLuyT7mJIaMk970aDN50yenrLX_a7t9q9tv_U0mpWZOUsd6g30S_-0mIrNT25hVLEy-3k9E2p-5EAIW5GIgLC52tgPqf5sz__SHOCbIOj7CZx3V4eFyOJKFgOb97PFVMTVeoIWJTLD7WhZYLJTbQomoPmcknb_0SmSRIsO55vzMmbOSitdRc9kTPnGpS_oYRef8_K9a-Hmxn',
    'PASADA-BAUANG-CHURCH',
    'Bauang Central TODA',
    20.00
  ),
  (
    'spot-plaza',
    'Bauang Town Plaza & Food Hub',
    'food',
    'The vibrant heart of the municipality. Great for relaxing, evening street food, native delicacies, and experiencing local community life.',
    'Sentro ng bayan kung saan matatagpuan ang masasarap na lokal na pagkain, liwasan, at liwanag ng komunidad.',
    16.5340,
    120.3340,
    '4:00 PM – 11:30 PM Daily',
    'https://cdn.freesound.org/previews/518/518854_6142149-lq.mp3',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCskZo8KG9ONQafW04FfCcyP1752sbVX26GCnL3R9XwjlvQM4OVrPeEvhCNYvlUIz2II6dB4IAIajaQ2GWzQGf8nfAmn28yJxUCPSw3JriV785qUpQLJYkOwNDx-r0ZDresUpQisW6P0YcZuvbWu-u7Q7hNugmyoVKph5nFVmpoufvDjkuF-mosmWQxH9JHnPHzdsTziAY9wLXyq15a8Ef9Q8y-Ai7wUeqMyLouDrrkr-snxUaAFvZf',
    'PASADA-BAUANG-PLAZA',
    'Bauang Central TODA',
    20.00
  )
on conflict (id) do nothing;

-- 4. Insert Bauang Official Location-Based Fares
insert into public.location_fares (id, origin_terminal_id, location_name, lat, lng, proximity_radius_meters, standard_fare, discounted_fare, notes)
values
  ('a0000001-0000-0000-0000-000000000001', (select id from public.terminals limit 1), 'Bauang Town Plaza & Munisipyo', 16.5333, 120.3333, 600, 20.00, 16.00, 'Zone 1: Central Commercial Hub & Town Hall'),
  ('a0000001-0000-0000-0000-000000000002', (select id from public.terminals limit 1), 'Sts. Peter & Paul Parish Church', 16.5330, 120.3325, 500, 20.00, 16.00, 'Zone 1: Historical Landmark & Church Ground'),
  ('a0000001-0000-0000-0000-000000000003', (select id from public.terminals limit 1), 'Bauang Public Market & Trading Post', 16.5350, 120.3350, 700, 20.00, 16.00, 'Zone 1: Commercial Market & Terminal Exchange'),
  ('a0000001-0000-0000-0000-000000000004', (select id from public.terminals limit 1), 'Central West Elementary & Barangay Hall', 16.5310, 120.3270, 800, 25.00, 20.00, 'Zone 2: Residential Community & School Zone'),
  ('a0000001-0000-0000-0000-000000000005', (select id from public.terminals limit 1), 'Baccuit Sur Barangay Center', 16.5210, 120.3280, 1000, 30.00, 24.00, 'Zone 3: South Barangay Highway Corridor'),
  ('a0000001-0000-0000-0000-000000000006', (select id from public.terminals limit 1), 'Lomboy Grape Farms (Agritourism Hub)', 16.5250, 120.3400, 1000, 35.00, 28.00, 'Zone 3: Pioneer Vineyard & Farm Tourism Zone'),
  ('a0000001-0000-0000-0000-000000000007', (select id from public.terminals limit 1), 'Bauang Beach & Sunset Park (Bagbag)', 16.5410, 120.3190, 1200, 40.00, 32.00, 'Zone 4: Coastal Beach & Resort Tourist Hub'),
  ('a0000001-0000-0000-0000-000000000008', (select id from public.terminals limit 1), 'Paringao Coastal & Resort Strip', 16.5490, 120.3150, 1200, 45.00, 36.00, 'Zone 4: North Coastal Beach & Hotel Zone'),
  ('a0000001-0000-0000-0000-000000000009', (select id from public.terminals limit 1), 'Quinavite Barangay Hall & Highway Junction', 16.5200, 120.3480, 900, 35.00, 28.00, 'Zone 3: East Inland Agricultural District'),
  ('a0000001-0000-0000-0000-000000000010', (select id from public.terminals limit 1), 'Calumbaya Rural High School & Valley', 16.5120, 120.3550, 1200, 50.00, 40.00, 'Zone 5: Outer Foothills & Extended Barangay Route')
on conflict (id) do update set
  standard_fare = excluded.standard_fare,
  discounted_fare = excluded.discounted_fare,
  proximity_radius_meters = excluded.proximity_radius_meters,
  lat = excluded.lat,
  lng = excluded.lng,
  notes = excluded.notes;



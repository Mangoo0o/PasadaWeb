-- =========================================================
-- PasadaGuide: Location Tariff Media & Explore Sync Migration
-- =========================================================

do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='cover_image_url') then
    alter table public.location_fares add column cover_image_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='images') then
    alter table public.location_fares add column images text[];
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='audio_url') then
    alter table public.location_fares add column audio_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='video_url') then
    alter table public.location_fares add column video_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='location_fares' and column_name='description') then
    alter table public.location_fares add column description text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tourist_spots' and column_name='video_url') then
    alter table public.tourist_spots add column video_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='tourist_spots' and column_name='images') then
    alter table public.tourist_spots add column images text[];
  end if;
end $$;

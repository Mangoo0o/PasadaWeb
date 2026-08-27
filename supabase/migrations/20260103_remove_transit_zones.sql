-- =========================================================
-- PasadaGuide: Remove Transit Zones & Standardize Pure Locations
-- =========================================================

-- 1. Strip 'Zone X:' prefixes from location_fares notes
UPDATE public.location_fares
SET notes = regexp_replace(notes, '^Zone\s+[A-Za-z0-9]+:\s*', '')
WHERE notes ~ '^Zone\s+[A-Za-z0-9]+:\s*';

-- 2. Clean phrase occurrences of the word zone in notes
UPDATE public.location_fares
SET notes = replace(notes, 'School Zone', 'School District')
WHERE notes ILIKE '%School Zone%';

UPDATE public.location_fares
SET notes = replace(notes, 'Farm Tourism Zone', 'Farm Tourism Hub')
WHERE notes ILIKE '%Farm Tourism Zone%';

UPDATE public.location_fares
SET notes = replace(notes, 'Hotel Zone', 'Hotel Strip')
WHERE notes ILIKE '%Hotel Zone%';

UPDATE public.location_fares
SET notes = regexp_replace(notes, '\mzone\M', 'District', 'gi')
WHERE notes ILIKE '%zone%';

-- 3. Clean any mock/test zone records
DELETE FROM public.location_fares
WHERE id::text LIKE 'stitch-zone-%' OR location_name LIKE 'Zone %';

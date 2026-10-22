-- =========================================================
-- PasadaGuide: Booking Passenger Headcount & Per-Head Fare Surcharge
-- Migration: 20260108_booking_passenger_count.sql
-- =========================================================

-- 1. Add passenger headcount and per-head surcharge columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS passenger_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS additional_head_fare numeric(8,2) DEFAULT 0.00;

-- 2. Add validation constraint to keep headcount within legal tricycle passenger capacity (1 to 4 passengers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bookings_passenger_count'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT chk_bookings_passenger_count CHECK (passenger_count >= 1 AND passenger_count <= 4);
  END IF;
END $$;

-- 3. Index for querying multi-passenger bookings
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_count ON public.bookings(passenger_count) WHERE passenger_count > 1;

COMMENT ON COLUMN public.bookings.passenger_count IS 'Number of passengers riding on this booking (1 to 4 passengers).';
COMMENT ON COLUMN public.bookings.additional_head_fare IS 'Accumulated surcharge for additional passenger heads (e.g. +₱10 per extra head beyond 1).';

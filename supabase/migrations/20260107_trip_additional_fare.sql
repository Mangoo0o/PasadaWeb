-- =========================================================
-- PasadaGuide: Trip Additional Fare Surcharge & Audit Trail
-- Migration: 20260107_trip_additional_fare.sql
-- =========================================================

-- 1. Add surcharge and breakdown columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS base_fare numeric(8,2),
  ADD COLUMN IF NOT EXISTS additional_fare numeric(8,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS additional_fare_reason text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(8,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS original_destination_name text,
  ADD COLUMN IF NOT EXISTS original_fare numeric(8,2),
  ADD COLUMN IF NOT EXISTS extension_fare numeric(8,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rebook_count integer DEFAULT 0;

-- 2. Performance index for querying bookings with surcharges or rebook extensions
CREATE INDEX IF NOT EXISTS idx_bookings_additional_fare ON public.bookings(additional_fare) WHERE additional_fare > 0;
CREATE INDEX IF NOT EXISTS idx_bookings_rebook_count ON public.bookings(rebook_count) WHERE rebook_count > 0;

-- 3. Automated Audit Trail Trigger Function
-- Ensures any trip completed with an additional surcharge is permanently recorded in admin_actions
CREATE OR REPLACE FUNCTION public.audit_booking_surcharge_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_name text;
  v_passenger_name text;
  v_passenger_type text;
BEGIN
  -- Only log to audit trail when a trip is completed and an additional surcharge (> 0) was charged
  IF NEW.status = 'completed' AND COALESCE(NEW.additional_fare, 0) > 0 THEN
    -- Look up driver name
    SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.driver_id;
    -- Look up passenger name and type
    SELECT full_name, passenger_type INTO v_passenger_name, v_passenger_type FROM public.profiles WHERE id = NEW.passenger_id;

    INSERT INTO public.admin_actions (
      admin_id,
      action_type,
      target_table,
      target_id,
      details_json
    ) VALUES (
      NEW.driver_id,
      'TRIP_ADDITIONAL_FARE_APPLIED',
      'bookings',
      NEW.id::text,
      jsonb_build_object(
        'booking_id', NEW.id,
        'driver_id', NEW.driver_id,
        'driver_name', COALESCE(v_driver_name, 'Driver'),
        'passenger_id', NEW.passenger_id,
        'passenger_name', COALESCE(v_passenger_name, 'Passenger'),
        'passenger_type', COALESCE(v_passenger_type, 'regular'),
        'base_fare', COALESCE(NEW.base_fare, NEW.estimated_fare),
        'additional_fare', NEW.additional_fare,
        'additional_fare_reason', COALESCE(NEW.additional_fare_reason, 'Manual Surcharge'),
        'discount_amount', COALESCE(NEW.discount_amount, 0.00),
        'final_fare', NEW.final_fare,
        'origin', NEW.origin_name,
        'destination', NEW.destination_name,
        'completed_at', COALESCE(NEW.completed_at, now())
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Attach trigger to bookings table
DROP TRIGGER IF EXISTS trg_audit_booking_surcharge ON public.bookings;
CREATE TRIGGER trg_audit_booking_surcharge
  AFTER UPDATE OF status, additional_fare ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_booking_surcharge_trigger();

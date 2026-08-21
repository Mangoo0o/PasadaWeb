import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { origin_terminal_id, distance_km, duration_min } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the latest effective fare matrix
    const { data: matrix, error } = await supabase
      .from('fare_matrix')
      .select('*')
      .eq('origin_terminal_id', origin_terminal_id)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !matrix) {
      throw new Error("Fare matrix not found for this terminal.");
    }

    const baseFare = Number(matrix.base_fare);
    const baseKm = Number(matrix.base_km);
    const perKmRate = Number(matrix.per_km_rate);

    let calculatedFare = baseFare;
    if (distance_km > baseKm) {
      calculatedFare += (distance_km - baseKm) * perKmRate;
    }

    // Night differential (10:00 PM to 4:00 AM)
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 22 || currentHour < 4;
    if (isNight) {
      calculatedFare *= Number(matrix.night_differential_multiplier || 1.15);
    }

    const finalEstimate = Math.round(calculatedFare * 100) / 100;

    return new Response(
      JSON.stringify({
        estimated_fare: finalEstimate,
        distance_km,
        duration_min,
        is_night_differential: isNight,
        breakdown: {
          base_fare: baseFare,
          excess_km_charge: distance_km > baseKm ? (distance_km - baseKm) * perKmRate : 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

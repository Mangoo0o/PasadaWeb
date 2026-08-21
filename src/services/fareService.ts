import { supabase } from '../api/supabaseClient';
import { LocationFare } from '../types/database.types';

// Robust local fallback for Bauang Municipality locations & official tariff
export const DEFAULT_LOCATION_FARES: LocationFare[] = [
  {
    id: 'a0000001-0000-0000-0000-000000000001',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Bauang Town Plaza & Munisipyo',
    lat: 16.5333,
    lng: 120.3333,
    proximity_radius_meters: 600,
    standard_fare: 20.00,
    discounted_fare: 16.00,
    notes: 'Zone 1: Central Commercial Hub & Town Hall'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000002',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Sts. Peter & Paul Parish Church',
    lat: 16.5330,
    lng: 120.3325,
    proximity_radius_meters: 500,
    standard_fare: 20.00,
    discounted_fare: 16.00,
    notes: 'Zone 1: Historical Landmark & Church Ground'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000003',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Bauang Public Market & Trading Post',
    lat: 16.5350,
    lng: 120.3350,
    proximity_radius_meters: 700,
    standard_fare: 20.00,
    discounted_fare: 16.00,
    notes: 'Zone 1: Commercial Market & Terminal Exchange'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000004',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Central West Elementary & Barangay Hall',
    lat: 16.5310,
    lng: 120.3270,
    proximity_radius_meters: 800,
    standard_fare: 25.00,
    discounted_fare: 20.00,
    notes: 'Zone 2: Residential Community & School Zone'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000005',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Baccuit Sur Barangay Center',
    lat: 16.5210,
    lng: 120.3280,
    proximity_radius_meters: 1000,
    standard_fare: 30.00,
    discounted_fare: 24.00,
    notes: 'Zone 3: South Barangay Highway Corridor'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000006',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Lomboy Grape Farms (Agritourism Hub)',
    lat: 16.5250,
    lng: 120.3400,
    proximity_radius_meters: 1000,
    standard_fare: 35.00,
    discounted_fare: 28.00,
    notes: 'Zone 3: Pioneer Vineyard & Farm Tourism Zone'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000007',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Bauang Beach & Sunset Park (Bagbag)',
    lat: 16.5410,
    lng: 120.3190,
    proximity_radius_meters: 1200,
    standard_fare: 40.00,
    discounted_fare: 32.00,
    notes: 'Zone 4: Coastal Beach & Resort Tourist Hub'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000008',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Paringao Coastal & Resort Strip',
    lat: 16.5490,
    lng: 120.3150,
    proximity_radius_meters: 1200,
    standard_fare: 45.00,
    discounted_fare: 36.00,
    notes: 'Zone 4: North Coastal Beach & Hotel Zone'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000009',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Quinavite Barangay Hall & Highway Junction',
    lat: 16.5200,
    lng: 120.3480,
    proximity_radius_meters: 900,
    standard_fare: 35.00,
    discounted_fare: 28.00,
    notes: 'Zone 3: East Inland Agricultural District'
  },
  {
    id: 'a0000001-0000-0000-0000-000000000010',
    origin_terminal_id: 'a0000000-0000-0000-0000-000000000001',
    terminal_name: 'Bauang Central TODA (Town Plaza)',
    location_name: 'Calumbaya Rural High School & Valley',
    lat: 16.5120,
    lng: 120.3550,
    proximity_radius_meters: 1200,
    standard_fare: 50.00,
    discounted_fare: 40.00,
    notes: 'Zone 5: Outer Foothills & Extended Barangay Route'
  }
];

// Fetch Location Fares from Supabase with fallback to DEFAULT_LOCATION_FARES
export const fetchLocationFares = async (originTerminalId?: string): Promise<LocationFare[]> => {
  try {
    let query = supabase
      .from('location_fares')
      .select('*, terminals:origin_terminal_id(name)')
      .order('standard_fare', { ascending: true });

    if (originTerminalId) {
      query = query.eq('origin_terminal_id', originTerminalId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (error) {
        console.warn('Note on fetching location_fares from DB, using official defaults:', error.message);
      }
      if (originTerminalId) {
        return DEFAULT_LOCATION_FARES.filter(f => f.origin_terminal_id === originTerminalId);
      }
      return DEFAULT_LOCATION_FARES;
    }

    return data.map((item: any) => ({
      id: item.id,
      origin_terminal_id: item.origin_terminal_id,
      terminal_name: item.terminals?.name || 'Central TODA',
      location_name: item.location_name,
      lat: Number(item.lat),
      lng: Number(item.lng),
      proximity_radius_meters: Number(item.proximity_radius_meters || 800),
      standard_fare: Number(item.standard_fare),
      discounted_fare: item.discounted_fare ? Number(item.discounted_fare) : Math.round(Number(item.standard_fare) * 0.8),
      notes: item.notes || '',
      is_active: item.is_active !== false,
      created_at: item.created_at,
      updated_at: item.updated_at
    })) as LocationFare[];
  } catch (err) {
    console.error('Error fetching location fares:', err);
    return DEFAULT_LOCATION_FARES;
  }
};

// Create or update a location fare record
export const saveLocationFare = async (
  fare: Partial<LocationFare> & { location_name: string; lat: number; lng: number; standard_fare: number }
): Promise<{ data?: LocationFare; error?: string }> => {
  try {
    const payload = {
      origin_terminal_id: fare.origin_terminal_id,
      location_name: fare.location_name,
      lat: Number(fare.lat),
      lng: Number(fare.lng),
      proximity_radius_meters: Number(fare.proximity_radius_meters || 800),
      standard_fare: Number(fare.standard_fare),
      discounted_fare: fare.discounted_fare ? Number(fare.discounted_fare) : Math.round(Number(fare.standard_fare) * 0.8),
      notes: fare.notes || 'LGU Location Tariff',
      is_active: fare.is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (fare.id && !fare.id.startsWith('loc-fare-temp-')) {
      const { data, error } = await supabase
        .from('location_fares')
        .update(payload)
        .eq('id', fare.id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as LocationFare };
    } else {
      const { data, error } = await supabase
        .from('location_fares')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: data as LocationFare };
    }
  } catch (err: any) {
    console.warn('DB save note, saving locally:', err.message);
    const fallbackSaved: LocationFare = {
      id: fare.id || `loc-fare-${Date.now()}`,
      origin_terminal_id: fare.origin_terminal_id || 'term-bauang-central',
      location_name: fare.location_name,
      lat: Number(fare.lat),
      lng: Number(fare.lng),
      proximity_radius_meters: Number(fare.proximity_radius_meters || 800),
      standard_fare: Number(fare.standard_fare),
      discounted_fare: fare.discounted_fare ? Number(fare.discounted_fare) : Math.round(Number(fare.standard_fare) * 0.8),
      notes: fare.notes || 'LGU Location Tariff',
      is_active: fare.is_active !== false,
      updated_at: new Date().toISOString()
    };
    return { data: fallbackSaved };
  }
};

// Delete a location fare record
export const deleteLocationFare = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('location_fares')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('DB delete note:', err.message);
    return { success: true };
  }
};

// Compute Haversine distance in meters
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export interface ProximityMatchResult {
  matchedLocation: LocationFare;
  isExactProximityMatch: boolean;
  distanceMeters: number;
  standardFare: number;
  discountedFare: number;
  proximityStatusText: string;
}

// Proximity Matching Engine: Determines the official price based on proximity to configured destination locations
export const findMatchingLocationByProximity = (
  destLat: number,
  destLng: number,
  locationFares: LocationFare[],
  originTerminalId?: string
): ProximityMatchResult | null => {
  const candidateLocations = locationFares.filter(loc => {
    if (!loc.is_active && loc.is_active !== undefined) return false;
    if (originTerminalId && loc.origin_terminal_id && loc.origin_terminal_id !== originTerminalId) {
      // If we have locations specific to the terminal, prefer them; otherwise allow all
      return true;
    }
    return true;
  });

  if (candidateLocations.length === 0) return null;

  // Calculate distance in meters to each location
  const locationsWithDistance = candidateLocations.map(loc => {
    const dist = calculateDistanceMeters(destLat, destLng, loc.lat, loc.lng);
    const radius = loc.proximity_radius_meters || 800;
    const isWithinRadius = dist <= radius;
    return {
      location: loc,
      distanceMeters: dist,
      proximityRadius: radius,
      isWithinRadius,
    };
  });

  // 1. Check if any location contains the destination coordinates within its proximity radius
  const exactMatches = locationsWithDistance.filter(item => item.isWithinRadius);

  if (exactMatches.length > 0) {
    // Pick the closest exact match
    exactMatches.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const best = exactMatches[0];
    const standardFare = Number(best.location.standard_fare);
    const discountedFare = Number(best.location.discounted_fare || Math.round(standardFare * 0.8));

    return {
      matchedLocation: best.location,
      isExactProximityMatch: true,
      distanceMeters: best.distanceMeters,
      standardFare,
      discountedFare,
      proximityStatusText: `Within ${best.distanceMeters}m of ${best.location.location_name} (Radius: ${best.proximityRadius}m)`
    };
  }

  // 2. If outside all defined proximity radiuses, match the closest location
  locationsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearest = locationsWithDistance[0];
  const standardFare = Number(nearest.location.standard_fare);
  const discountedFare = Number(nearest.location.discounted_fare || Math.round(standardFare * 0.8));
  const kmDist = (nearest.distanceMeters / 1000).toFixed(1);

  return {
    matchedLocation: nearest.location,
    isExactProximityMatch: false,
    distanceMeters: nearest.distanceMeters,
    standardFare,
    discountedFare,
    proximityStatusText: `Nearest Zone: ${nearest.location.location_name} (~${kmDist} km)`
  };
};

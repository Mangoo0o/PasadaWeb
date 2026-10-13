import { supabase, isConfigured } from '../api/supabaseClient';
import { LocationFare } from '../types/database.types';

// Preset icon options for Admin Location Creator & Map Displays
export const LOCATION_ICON_OPTIONS = [
  { id: 'landmark', label: 'Munisipyo / Plaza', icon: '🏛️' },
  { id: 'church', label: 'Simbahan / Church', icon: '⛪' },
  { id: 'market', label: 'Palengke / Market', icon: '🛒' },
  { id: 'school', label: 'Paaralan / School', icon: '🏫' },
  { id: 'farm', label: 'Farm / Vineyard', icon: '🍇' },
  { id: 'beach', label: 'Beach / Baybayin', icon: '🏖️' },
  { id: 'resort', label: 'Resort / Coastal', icon: '🌊' },
  { id: 'hospital', label: 'Ospital / Health', icon: '🏥' },
  { id: 'barangay', label: 'Barangay / Home', icon: '🏠' },
  { id: 'gas', label: 'Gas / Junction', icon: '⛽' },
  { id: 'park', label: 'Park / Nature', icon: '🌲' },
  { id: 'pin', label: 'General Pin', icon: '📍' },
];

export const extractIconFromNotes = (notes?: string): string | null => {
  if (!notes) return null;
  const match = notes.match(/\[icon:([a-zA-Z0-9_\-]+)\]/);
  return match ? match[1] : null;
};

export const stripIconFromNotes = (notes?: string): string => {
  if (!notes) return '';
  return notes.replace(/\[icon:[a-zA-Z0-9_\-]+\]/g, '').trim();
};

export const getLocationIconEmoji = (iconId?: string, locationName?: string): string => {
  if (iconId) {
    const found = LOCATION_ICON_OPTIONS.find(opt => opt.id === iconId || opt.icon === iconId);
    if (found) return found.icon;
    if (iconId.length <= 4) return iconId;
  }
  // Automatic keyword fallback
  const name = (locationName || '').toLowerCase();
  if (name.includes('plaza') || name.includes('munisipyo') || name.includes('hall')) return '🏛️';
  if (name.includes('church') || name.includes('parish') || name.includes('peter')) return '⛪';
  if (name.includes('market') || name.includes('palengke') || name.includes('trading')) return '🛒';
  if (name.includes('school') || name.includes('elementary') || name.includes('high')) return '🏫';
  if (name.includes('grape') || name.includes('farm') || name.includes('vineyard') || name.includes('lomboy')) return '🍇';
  if (name.includes('beach') || name.includes('sunset') || name.includes('baybay') || name.includes('bagbag')) return '🏖️';
  if (name.includes('resort') || name.includes('coast') || name.includes('paringao')) return '🌊';
  if (name.includes('hospital') || name.includes('clinic') || name.includes('health')) return '🏥';
  if (name.includes('barangay') || name.includes('center') || name.includes('baccuit')) return '🏠';
  if (name.includes('junction') || name.includes('highway') || name.includes('quinavite')) return '⛽';
  if (name.includes('valley') || name.includes('calumbaya')) return '🌲';
  return '📍';
};

export const resolveLocationCategory = (loc: { icon?: string; location_name?: string; notes?: string }): string => {
  if (loc.icon) {
    const found = LOCATION_ICON_OPTIONS.find(opt => opt.id === loc.icon || opt.icon === loc.icon);
    if (found) return found.id;
  }
  const name = (loc.location_name || '').toLowerCase();
  const notes = (loc.notes || '').toLowerCase();
  const combined = `${name} ${notes}`;
  if (combined.includes('plaza') || combined.includes('munisipyo') || combined.includes('hall')) return 'landmark';
  if (combined.includes('church') || combined.includes('parish') || combined.includes('peter')) return 'church';
  if (combined.includes('market') || combined.includes('palengke') || combined.includes('trading')) return 'market';
  if (combined.includes('school') || combined.includes('elementary') || combined.includes('high') || combined.includes('college')) return 'school';
  if (combined.includes('grape') || combined.includes('farm') || combined.includes('vineyard') || combined.includes('lomboy')) return 'farm';
  if (combined.includes('beach') || combined.includes('sunset') || combined.includes('baybay') || combined.includes('bagbag')) return 'beach';
  if (combined.includes('resort') || combined.includes('coast') || combined.includes('paringao')) return 'resort';
  if (combined.includes('hospital') || combined.includes('clinic') || combined.includes('health') || combined.includes('center')) return 'hospital';
  if (combined.includes('barangay') || combined.includes('baccuit') || combined.includes('home')) return 'barangay';
  if (combined.includes('junction') || combined.includes('gas') || combined.includes('highway') || combined.includes('quinavite')) return 'gas';
  if (combined.includes('valley') || combined.includes('park') || combined.includes('nature') || combined.includes('calumbaya')) return 'park';
  return 'pin';
};

// No hardcoded seeded data - location fares are dynamically loaded from Supabase database
export const DEFAULT_LOCATION_FARES: LocationFare[] = [];

// Fetch Location Fares from Supabase database only
export const fetchLocationFares = async (originTerminalId?: string): Promise<LocationFare[]> => {
  if (!isConfigured) {
    return [];
  }

  try {
    let query = supabase
      .from('location_fares')
      .select('*, terminals:origin_terminal_id(name)')
      .order('standard_fare', { ascending: true });

    if (originTerminalId) {
      query = query.eq('origin_terminal_id', originTerminalId);
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) {
        console.warn('Error fetching location_fares from database:', error.message);
      }
      return [];
    }

    return (data || []).map((item: any) => {
      // Resolve icon from item.icon OR embedded [icon:xyz] in notes OR keyword match
      const iconFromNotes = extractIconFromNotes(item.notes);
      const resolvedIcon = item.icon || iconFromNotes || 'pin';
      const cleanNotes = stripIconFromNotes(item.notes);

      const loadedImages = (Array.isArray(item.images) && item.images.length > 0)
        ? item.images
        : (item.cover_image_url ? [item.cover_image_url] : []);

      return {
        id: item.id,
        origin_terminal_id: item.origin_terminal_id,
        terminal_name: item.terminals?.name || 'Bauang Terminal',
        location_name: item.location_name,
        description: item.description || '',
        cover_image_url: item.cover_image_url || loadedImages[0] || '',
        images: loadedImages,
        audio_url: item.audio_url || '',
        video_url: item.video_url || '',
        lat: Number(item.lat),
        lng: Number(item.lng),
        proximity_radius_meters: Number(item.proximity_radius_meters || 800),
        standard_fare: Number(item.standard_fare || 20.00),
        discounted_fare: item.discounted_fare ? Number(item.discounted_fare) : Math.round(Number(item.standard_fare || 20.00) * 0.8),
        icon: resolvedIcon,
        notes: cleanNotes,
        is_active: item.is_active !== false,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });
  } catch (err: any) {
    console.warn('Exception fetching location_fares:', err.message);
    return [];
  }
};

export const isValidUuid = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// Create or update a location fare record with robust column + notes fallback
export const saveLocationFare = async (
  fare: Partial<LocationFare> & { location_name: string; lat: number; lng: number; standard_fare: number; icon?: string }
): Promise<{ data?: LocationFare; error?: string }> => {
  const chosenIcon = fare.icon || 'pin';
  const cleanNotes = stripIconFromNotes(fare.notes || 'LGU Location Tariff');
  const notesWithEmbeddedIcon = `${cleanNotes} [icon:${chosenIcon}]`.trim();

  const formattedImages = (Array.isArray(fare.images) && fare.images.length > 0)
    ? fare.images
    : (fare.cover_image_url ? [fare.cover_image_url] : []);

  const coverUrl = fare.cover_image_url || formattedImages[0] || '';

  // Crucial: Only pass origin_terminal_id if it's a valid UUID; otherwise null so Postgres doesn't throw syntax or constraint errors
  const safeTerminalId = isValidUuid(fare.origin_terminal_id) ? fare.origin_terminal_id : null;
  const isUpdating = isValidUuid(fare.id);

  // Try 1: Save with full payload including media columns
  try {
    const fullPayload: any = {
      origin_terminal_id: safeTerminalId,
      location_name: fare.location_name.trim(),
      description: fare.description || '',
      cover_image_url: coverUrl,
      images: formattedImages,
      audio_url: fare.audio_url || '',
      video_url: fare.video_url || '',
      lat: Number(fare.lat),
      lng: Number(fare.lng),
      proximity_radius_meters: Number(fare.proximity_radius_meters || 800),
      standard_fare: Number(fare.standard_fare),
      discounted_fare: fare.discounted_fare ? Number(fare.discounted_fare) : Math.round(Number(fare.standard_fare) * 0.8),
      icon: chosenIcon,
      notes: notesWithEmbeddedIcon,
      is_active: fare.is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (isUpdating) {
      let { data, error } = await supabase
        .from('location_fares')
        .update(fullPayload)
        .eq('id', fare.id)
        .select()
        .single();

      if (error && error.code === '23503' && fullPayload.origin_terminal_id) {
        fullPayload.origin_terminal_id = null;
        const retry = await supabase.from('location_fares').update(fullPayload).eq('id', fare.id).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      return { 
        data: {
          ...(data as LocationFare),
          cover_image_url: coverUrl,
          images: formattedImages,
          description: fare.description || '',
          audio_url: fare.audio_url || '',
          video_url: fare.video_url || '',
          icon: chosenIcon,
          notes: cleanNotes
        }
      };
    } else {
      let { data, error } = await supabase
        .from('location_fares')
        .insert(fullPayload)
        .select()
        .single();

      if (error && error.code === '23503' && fullPayload.origin_terminal_id) {
        fullPayload.origin_terminal_id = null;
        const retry = await supabase.from('location_fares').insert(fullPayload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      return { 
        data: {
          ...(data as LocationFare),
          cover_image_url: coverUrl,
          images: formattedImages,
          description: fare.description || '',
          audio_url: fare.audio_url || '',
          video_url: fare.video_url || '',
          icon: chosenIcon,
          notes: cleanNotes
        }
      };
    }
  } catch (primaryErr: any) {
    console.warn('Note on primary DB save, trying fallback schema mode:', primaryErr.message);

    // Try 2: If optional media or icon columns need simpler payload
    try {
      const fallbackPayload: any = {
        origin_terminal_id: safeTerminalId,
        location_name: fare.location_name.trim(),
        description: fare.description || '',
        cover_image_url: coverUrl,
        images: formattedImages,
        audio_url: fare.audio_url || '',
        video_url: fare.video_url || '',
        lat: Number(fare.lat),
        lng: Number(fare.lng),
        proximity_radius_meters: Number(fare.proximity_radius_meters || 800),
        standard_fare: Number(fare.standard_fare),
        discounted_fare: fare.discounted_fare ? Number(fare.discounted_fare) : Math.round(Number(fare.standard_fare) * 0.8),
        notes: notesWithEmbeddedIcon,
        is_active: fare.is_active !== false,
        updated_at: new Date().toISOString()
      };

      if (isUpdating) {
        let { data, error } = await supabase
          .from('location_fares')
          .update(fallbackPayload)
          .eq('id', fare.id)
          .select()
          .single();

        if (error && error.code === '23503' && fallbackPayload.origin_terminal_id) {
          fallbackPayload.origin_terminal_id = null;
          const retry = await supabase.from('location_fares').update(fallbackPayload).eq('id', fare.id).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        return { 
          data: {
            ...(data as LocationFare),
            cover_image_url: coverUrl,
            images: formattedImages,
            description: fare.description || '',
            audio_url: fare.audio_url || '',
            video_url: fare.video_url || '',
            icon: chosenIcon,
            notes: cleanNotes
          }
        };
      } else {
        let { data, error } = await supabase
          .from('location_fares')
          .insert(fallbackPayload)
          .select()
          .single();

        if (error && error.code === '23503' && fallbackPayload.origin_terminal_id) {
          fallbackPayload.origin_terminal_id = null;
          const retry = await supabase.from('location_fares').insert(fallbackPayload).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        return { 
          data: {
            ...(data as LocationFare),
            cover_image_url: coverUrl,
            images: formattedImages,
            description: fare.description || '',
            audio_url: fare.audio_url || '',
            video_url: fare.video_url || '',
            icon: chosenIcon,
            notes: cleanNotes
          }
        };
      }
    } catch (fallbackErr: any) {
      console.warn('Saving in local state fallback:', fallbackErr.message);
      const fallbackSaved: LocationFare = {
        id: isUpdating ? (fare.id as string) : `loc-fare-${Date.now()}`,
        origin_terminal_id: safeTerminalId,
        location_name: fare.location_name,
        description: fare.description || '',
        cover_image_url: coverUrl,
        images: formattedImages,
        audio_url: fare.audio_url || '',
        video_url: fare.video_url || '',
        lat: Number(fare.lat),
        lng: Number(fare.lng),
        proximity_radius_meters: Number(fare.proximity_radius_meters || 800),
        standard_fare: Number(fare.standard_fare),
        discounted_fare: fare.discounted_fare ? Number(fare.discounted_fare) : Math.round(Number(fare.standard_fare) * 0.8),
        icon: chosenIcon,
        notes: cleanNotes,
        is_active: fare.is_active !== false,
        updated_at: new Date().toISOString()
      };
      return { 
        data: fallbackSaved, 
        error: fallbackErr.message || 'Database error, temporary local save applied.' 
      };
    }
  }
};

// Delete a location fare record
export const deleteLocationFare = async (id: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (isValidUuid(id)) {
      const { error } = await supabase
        .from('location_fares')
        .delete()
        .eq('id', id);

      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    console.warn('DB delete note:', err.message);
    return { success: false, error: err.message || 'Failed to delete location fare' };
  }
};

// Calculate Haversine distance in meters
export const calculateHaversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
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
  targetLat: number,
  targetLng: number,
  allLocations: LocationFare[],
  terminalId?: string
): ProximityMatchResult | null => {
  if (!allLocations || allLocations.length === 0) return null;

  // Filter active locations
  const activeLocations = allLocations.filter(loc => loc.is_active !== false);
  const pool = terminalId 
    ? activeLocations.filter(loc => loc.origin_terminal_id === terminalId)
    : activeLocations;

  const candidatePool = pool.length > 0 ? pool : activeLocations;

  // Calculate distance from target destination to each location center
  const evaluated = candidatePool.map(loc => {
    const distanceMeters = calculateHaversineDistanceMeters(targetLat, targetLng, loc.lat, loc.lng);
    const radius = loc.proximity_radius_meters || 800;
    const isInsideProximity = distanceMeters <= radius;
    return {
      location: loc,
      distanceMeters,
      proximityRadius: radius,
      isInsideProximity
    };
  });

  // 1. Check if any location contains the destination coordinates within its proximity radius
  const matchingInside = evaluated.filter(e => e.isInsideProximity);
  if (matchingInside.length > 0) {
    // Pick the closest center among matched
    matchingInside.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const best = matchingInside[0];
    return {
      matchedLocation: best.location,
      isExactProximityMatch: true,
      distanceMeters: best.distanceMeters,
      standardFare: Number(best.location.standard_fare),
      discountedFare: Number(best.location.discounted_fare || Math.round(best.location.standard_fare * 0.8)),
      proximityStatusText: `Within ${best.distanceMeters}m of ${best.location.location_name} (Radius: ${best.proximityRadius}m)`
    };
  }

  // 2. If outside all defined proximity radiuses, match the closest location
  evaluated.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const nearest = evaluated[0];
  const kmDist = (nearest.distanceMeters / 1000).toFixed(1);

  return {
    matchedLocation: nearest.location,
    isExactProximityMatch: false,
    distanceMeters: nearest.distanceMeters,
    standardFare: Number(nearest.location.standard_fare),
    discountedFare: Number(nearest.location.discounted_fare || Math.round(nearest.location.standard_fare * 0.8)),
    proximityStatusText: `Nearest Location: ${nearest.location.location_name} (~${kmDist} km)`
  };
};

export interface PassengerTypeInfo {
  id: 'regular' | 'student' | 'senior' | 'pwd';
  label: string;
  tag: string;
  badge: string;
  discountPercent: number;
  hasDiscount: boolean;
  requiresId: boolean;
}

export const isDiscountEligibleType = (passengerType?: string | null): boolean => {
  if (!passengerType) return false;
  const t = passengerType.toLowerCase().trim();
  return t === 'student' || t === 'senior' || t === 'pwd';
};

export const getPassengerTypeInfo = (type?: string | null): PassengerTypeInfo => {
  const norm = (type || '').toLowerCase().trim();
  switch (norm) {
    case 'student':
      return {
        id: 'student',
        label: 'Estudyante',
        tag: 'Student (-20%)',
        badge: '20% OFF',
        discountPercent: 20,
        hasDiscount: true,
        requiresId: true,
      };
    case 'senior':
      return {
        id: 'senior',
        label: 'Senior Citizen',
        tag: 'Senior (-20%)',
        badge: '20% OFF',
        discountPercent: 20,
        hasDiscount: true,
        requiresId: true,
      };
    case 'pwd':
      return {
        id: 'pwd',
        label: 'PWD',
        tag: 'PWD (-20%)',
        badge: '20% OFF',
        discountPercent: 20,
        hasDiscount: true,
        requiresId: true,
      };
    case 'regular':
    default:
      return {
        id: 'regular',
        label: 'Regular Passenger',
        tag: 'Taripa',
        badge: 'Regular',
        discountPercent: 0,
        hasDiscount: false,
        requiresId: false,
      };
  }
};

export interface FareCalculationResult {
  standardFare: number;
  finalFare: number;
  discountAmount: number;
  isDiscounted: boolean;
  passengerType: string;
}

export const calculateFare = (
  standardFare: number,
  passengerTypeOrEligible?: string | boolean | null,
  customDiscountedFare?: number
): FareCalculationResult => {
  const std = Math.max(0, Number(standardFare) || 20);
  const isEligible = typeof passengerTypeOrEligible === 'boolean' 
    ? passengerTypeOrEligible 
    : isDiscountEligibleType(passengerTypeOrEligible);
  const pType = typeof passengerTypeOrEligible === 'string' ? passengerTypeOrEligible : (isEligible ? 'student' : 'regular');

  if (!isEligible) {
    return {
      standardFare: std,
      finalFare: std,
      discountAmount: 0,
      isDiscounted: false,
      passengerType: 'regular'
    };
  }

  // If a preset discounted tariff exists (e.g. 16 for 20) and is strictly less than standard fare, use it;
  // otherwise compute official 20% statutory discount under Philippine Republic Acts
  const hasValidCustom = customDiscountedFare !== undefined && 
    Number(customDiscountedFare) > 0 && 
    Number(customDiscountedFare) < std;

  const computedDisc = hasValidCustom
    ? Number(customDiscountedFare)
    : Math.max(1, Math.round(std * 0.8));

  const discountAmount = Math.max(0, std - computedDisc);

  return {
    standardFare: std,
    finalFare: computedDisc,
    discountAmount,
    isDiscounted: discountAmount > 0,
    passengerType: pType
  };
};

export interface TripCompletionCalculation {
  baseFare: number;
  additionalFare: number;
  subtotalGross: number;
  discountPercent: number;
  discountAmount: number;
  finalPayableFare: number;
  isDiscounted: boolean;
  passengerType: string;
}

/**
 * Calculates trip completion fare with optional additional surcharge.
 * The 20% statutory discount for students/seniors/PWDs is strictly computed
 * on the gross subtotal (Base Taripa + Additional Fare) before final cash collection.
 */
export const calculateTripCompletionFare = (
  baseFare: number,
  additionalFare: number = 0,
  passengerTypeOrEligible?: string | boolean | null
): TripCompletionCalculation => {
  const base = Math.max(0, Number(baseFare) || 20);
  const add = Math.max(0, Number(additionalFare) || 0);
  const subtotal = base + add;

  const isEligible = typeof passengerTypeOrEligible === 'boolean'
    ? passengerTypeOrEligible
    : isDiscountEligibleType(passengerTypeOrEligible);

  const pType = typeof passengerTypeOrEligible === 'string'
    ? passengerTypeOrEligible
    : (isEligible ? 'discounted' : 'regular');

  const discountPercent = isEligible ? 20 : 0;
  // 20% discount computed on total gross subtotal (Base + Additional)
  const discountAmount = isEligible ? Math.round(subtotal * 0.20) : 0;
  const finalPayableFare = Math.max(1, subtotal - discountAmount);

  return {
    baseFare: base,
    additionalFare: add,
    subtotalGross: subtotal,
    discountPercent,
    discountAmount,
    finalPayableFare,
    isDiscounted: isEligible && discountAmount > 0,
    passengerType: pType,
  };
};

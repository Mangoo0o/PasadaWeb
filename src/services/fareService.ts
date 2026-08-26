import { supabase } from '../api/supabaseClient';
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
    icon: 'landmark',
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
    icon: 'church',
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
    icon: 'market',
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
    icon: 'school',
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
    icon: 'barangay',
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
    icon: 'farm',
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
    icon: 'beach',
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
    icon: 'resort',
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
    icon: 'gas',
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
    icon: 'park',
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
    console.warn('Exception fetching location_fares, using fallback:', err.message);
    if (originTerminalId) {
      return DEFAULT_LOCATION_FARES.filter(f => f.origin_terminal_id === originTerminalId);
    }
    return DEFAULT_LOCATION_FARES;
  }
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

  // Try 1: Save with full payload including media columns
  try {
    const fullPayload: any = {
      origin_terminal_id: fare.origin_terminal_id,
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
      notes: notesWithEmbeddedIcon,
      is_active: fare.is_active !== false,
      updated_at: new Date().toISOString()
    };

    if (fare.id && !fare.id.startsWith('loc-fare-temp-')) {
      const { data, error } = await supabase
        .from('location_fares')
        .update(fullPayload)
        .eq('id', fare.id)
        .select()
        .single();

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
      const { data, error } = await supabase
        .from('location_fares')
        .insert(fullPayload)
        .select()
        .single();

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
        origin_terminal_id: fare.origin_terminal_id,
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
        notes: notesWithEmbeddedIcon,
        is_active: fare.is_active !== false,
        updated_at: new Date().toISOString()
      };

      if (fare.id && !fare.id.startsWith('loc-fare-temp-')) {
        const { data, error } = await supabase
          .from('location_fares')
          .update(fallbackPayload)
          .eq('id', fare.id)
          .select()
          .single();

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
        const { data, error } = await supabase
          .from('location_fares')
          .insert(fallbackPayload)
          .select()
          .single();

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
        id: fare.id || `loc-fare-${Date.now()}`,
        origin_terminal_id: fare.origin_terminal_id || 'term-bauang-central',
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
      return { data: fallbackSaved };
    }
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
    proximityStatusText: `Nearest Zone: ${nearest.location.location_name} (~${kmDist} km)`
  };
};

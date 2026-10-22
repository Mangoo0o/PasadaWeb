import { supabase, isConfigured } from '../api/supabaseClient';
import { LocationFare } from '../types/database.types';

// ─── LOCATION CATEGORIES (single source of truth) ───
// NOTE: Existing IDs (landmark, barangay, park, market, farm, beach, resort, hospital,
// gas, school, church) are kept for backwards compatibility with saved location_fares rows.
export interface CategoryMetadata {
  id: string;
  label: string; // "Filipino / English" – used by admin icon picker
  name: string; // English display name
  nameFil: string; // Filipino display name
  icon: string;
  keywords: string[]; // search synonyms
}

export const CATEGORY_DEFINITIONS: CategoryMetadata[] = [
  {
    id: 'landmark',
    label: 'Munisipyo / Municipal Hall',
    name: 'Municipal Hall',
    nameFil: 'Munisipyo',
    icon: '🏛️',
    keywords: ['munisipyo', 'municipal', 'municipal hall', 'town hall', 'city hall', 'kapitolyo', 'capitol', 'lgu', 'mayor', 'civic center'],
  },
  {
    id: 'barangay',
    label: 'Barangay / Barangay',
    name: 'Barangay',
    nameFil: 'Barangay',
    icon: '🏠',
    keywords: ['barangay', 'brgy', 'baccuit', 'barangay hall', 'home', 'bahay', 'sitio', 'purok', 'poblacion', 'residence', 'komunidad'],
  },
  {
    id: 'park',
    label: 'Kalikasan / Nature',
    name: 'Nature',
    nameFil: 'Kalikasan',
    icon: '🌲',
    keywords: ['nature', 'kalikasan', 'valley', 'calumbaya', 'park', 'parke', 'tree', 'bundok', 'mountain', 'falls', 'talon', 'river', 'ilog', 'eco', 'ecopark', 'viewdeck'],
  },
  {
    id: 'market',
    label: 'Palengke / Market',
    name: 'Market',
    nameFil: 'Palengke',
    icon: '🛒',
    keywords: ['market', 'palengke', 'trading', 'grocery', 'supermarket', 'talipapa', 'tiangge', 'bagsakan', 'pamilihan', 'tindahan', 'mall', 'bilihan'],
  },
  {
    id: 'farm',
    label: 'Ubasan / Grapes Farm',
    name: 'Grapes Farm',
    nameFil: 'Ubasan',
    icon: '🍇',
    keywords: ['grape', 'grapes', 'grapes farm', 'farm', 'vineyard', 'lomboy', 'ubasan', 'ubas', 'bukid', 'agri', 'agritourism', 'plantation'],
  },
  {
    id: 'beach',
    label: 'Baybayin / Coastal',
    name: 'Coastal',
    nameFil: 'Baybayin',
    icon: '🏖️',
    keywords: ['coastal', 'coast', 'beach', 'baybayin', 'dagat', 'sunset', 'baybay', 'bagbag', 'tabing dagat', 'shore', 'seashore', 'sand'],
  },
  {
    id: 'resort',
    label: 'Resort / Resorts',
    name: 'Resorts',
    nameFil: 'Resort',
    icon: '🌊',
    keywords: ['resort', 'resorts', 'staycation', 'paringao', 'pool', 'swimming', 'cottage', 'bakasyon', 'languyan'],
  },
  {
    id: 'hospital',
    label: 'Kalusugan / Health',
    name: 'Health',
    nameFil: 'Kalusugan',
    icon: '🏥',
    keywords: ['health', 'kalusugan', 'hospital', 'clinic', 'health center', 'ospital', 'klinika', 'doctor', 'doktor', 'medical', 'emergency', 'rhu', 'pharmacy', 'botika', 'pagamutan'],
  },
  {
    id: 'gas',
    label: 'Gasolinahan / Gas Station',
    name: 'Gas Station',
    nameFil: 'Gasolinahan',
    icon: '⛽',
    keywords: ['gas station', 'gas', 'gasoline', 'gasolinahan', 'petron', 'shell', 'caltex', 'seaoil', 'phoenix', 'cleanfuel', 'junction', 'quinavite'],
  },
  {
    id: 'food',
    label: 'Kainan / Foods',
    name: 'Foods',
    nameFil: 'Kainan',
    icon: '🍽️',
    keywords: ['food', 'foods', 'kainan', 'restaurant', 'resto', 'eatery', 'carinderia', 'karinderya', 'cafe', 'coffee', 'bakery', 'panaderya', 'grill', 'jollibee', 'mcdonald', 'chowking', 'kain'],
  },
  {
    id: 'hotel',
    label: 'Hotel / Hotels',
    name: 'Hotels',
    nameFil: 'Hotel',
    icon: '🏨',
    keywords: ['hotel', 'hotels', 'inn', 'lodge', 'lodging', 'pension', 'transient', 'hostel', 'tuluyan', 'motel'],
  },
  {
    id: 'museum',
    label: 'Museo / Museums',
    name: 'Museums',
    nameFil: 'Museo',
    icon: '🖼️',
    keywords: ['museum', 'museums', 'museo', 'gallery', 'heritage', 'historical', 'makasaysayan', 'exhibit'],
  },
  {
    id: 'school',
    label: 'Paaralan / Schools',
    name: 'Schools',
    nameFil: 'Paaralan',
    icon: '🏫',
    keywords: ['school', 'schools', 'paaralan', 'elementary', 'high school', 'college', 'university', 'eskwela', 'academy', 'institute', 'pamantasan'],
  },
  {
    id: 'church',
    label: 'Simbahan / Church',
    name: 'Church',
    nameFil: 'Simbahan',
    icon: '⛪',
    keywords: ['church', 'simbahan', 'parish', 'parokya', 'peter', 'paul', 'chapel', 'kapilya', 'cathedral', 'shrine', 'katedral', 'sambahan'],
  },
  {
    id: 'plaza',
    label: 'Plaza / Plaza',
    name: 'Plaza',
    nameFil: 'Plaza',
    icon: '⛲',
    keywords: ['plaza', 'town plaza', 'liwasan', 'monumento', 'monument', 'square', 'auditorium', 'court'],
  },
  {
    id: 'bank',
    label: 'Bangko / Banks',
    name: 'Banks',
    nameFil: 'Bangko',
    icon: '🏦',
    keywords: ['bank', 'banks', 'bangko', 'atm', 'bdo', 'bpi', 'landbank', 'metrobank', 'pnb', 'rcbc', 'security bank', 'rural bank', 'cebuana', 'palawan express', 'remittance'],
  },
];

const GENERAL_PIN_CATEGORY: CategoryMetadata = {
  id: 'pin',
  label: 'General Pin',
  name: 'General Location',
  nameFil: 'Karaniwang Lokasyon',
  icon: '📍',
  keywords: [],
};

// Preset icon options for Admin Location Creator & Map Displays (derived from categories)
export const LOCATION_ICON_OPTIONS: { id: string; label: string; icon: string }[] = [
  ...CATEGORY_DEFINITIONS.map(({ id, label, icon }) => ({ id, label, icon })),
  { id: GENERAL_PIN_CATEGORY.id, label: GENERAL_PIN_CATEGORY.label, icon: GENERAL_PIN_CATEGORY.icon },
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

// Ordered keyword rules for auto-detecting a category from a location's name/notes.
// Order matters: more specific categories are checked first (e.g. "Bank" before "Plaza",
// "Hotel" before "Resort", "Museum" before "Municipal Hall").
const CATEGORY_DETECTION_RULES: { id: string; words: string[] }[] = [
  { id: 'bank', words: ['bank', 'bangko', 'atm', 'bdo', 'bpi', 'landbank', 'metrobank', 'pnb', 'rcbc', 'cebuana', 'palawan express'] },
  { id: 'museum', words: ['museum', 'museo', 'gallery', 'heritage house', 'exhibit'] },
  { id: 'church', words: ['church', 'parish', 'simbahan', 'parokya', 'chapel', 'kapilya', 'cathedral', 'shrine', 'peter'] },
  { id: 'school', words: ['school', 'elementary', 'high school', 'college', 'university', 'academy', 'institute', 'paaralan'] },
  { id: 'hospital', words: ['hospital', 'clinic', 'health', 'ospital', 'klinika', 'medical', 'rhu', 'pharmacy', 'botika'] },
  { id: 'gas', words: ['gas', 'gas station', 'gasoline', 'gasolinahan', 'petron', 'shell', 'caltex', 'seaoil', 'phoenix', 'cleanfuel', 'junction', 'quinavite'] },
  { id: 'hotel', words: ['hotel', 'inn', 'lodge', 'lodging', 'pension', 'transient', 'hostel', 'motel'] },
  { id: 'resort', words: ['resort', 'paringao', 'pool', 'cottage'] },
  { id: 'food', words: ['food', 'restaurant', 'resto', 'eatery', 'carinderia', 'karinderya', 'kainan', 'cafe', 'coffee', 'bakery', 'panaderya', 'grill', 'jollibee', 'mcdonald', 'chowking'] },
  { id: 'market', words: ['market', 'palengke', 'trading', 'grocery', 'supermarket', 'talipapa', 'mall'] },
  { id: 'farm', words: ['grape', 'farm', 'vineyard', 'lomboy', 'ubasan', 'ubas'] },
  { id: 'beach', words: ['beach', 'coast', 'coastal', 'baybay', 'baybayin', 'bagbag', 'sunset', 'shore', 'dagat'] },
  { id: 'plaza', words: ['plaza', 'liwasan', 'monument', 'monumento'] },
  { id: 'landmark', words: ['munisipyo', 'municipal', 'town hall', 'city hall', 'capitol', 'kapitolyo'] },
  { id: 'barangay', words: ['barangay', 'brgy', 'baccuit', 'purok', 'sitio', 'home'] },
  { id: 'park', words: ['valley', 'park', 'nature', 'calumbaya', 'falls', 'river', 'mountain', 'bundok', 'eco'] },
  { id: 'landmark', words: ['hall'] },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word match (allows plural "s"), so "inn" doesn't match "dinner" and "gas" doesn't match "Vegas".
const matchesWord = (text: string, word: string): boolean =>
  new RegExp(`\\b${escapeRegex(word)}s?\\b`, 'i').test(text);

const detectCategoryFromText = (text: string): string => {
  for (const rule of CATEGORY_DETECTION_RULES) {
    if (rule.words.some((w) => matchesWord(text, w))) return rule.id;
  }
  return 'pin';
};

export const resolveLocationCategory = (loc: { icon?: string; location_name?: string; notes?: string }): string => {
  // An explicit category icon wins – but 'pin' is the DB default, so fall through to keyword detection
  if (loc.icon && loc.icon !== 'pin') {
    const found = LOCATION_ICON_OPTIONS.find(opt => opt.id === loc.icon || opt.icon === loc.icon);
    if (found) return found.id;
  }
  return detectCategoryFromText(`${loc.location_name || ''} ${loc.notes || ''}`);
};

export const getLocationIconEmoji = (iconId?: string, locationName?: string): string => {
  if (iconId && iconId !== 'pin') {
    const found = LOCATION_ICON_OPTIONS.find(opt => opt.id === iconId || opt.icon === iconId);
    if (found) return found.icon;
    if (iconId.length <= 4) return iconId; // raw emoji
  }
  // Automatic keyword fallback
  const catId = detectCategoryFromText(locationName || '');
  return LOCATION_ICON_OPTIONS.find(opt => opt.id === catId)?.icon || GENERAL_PIN_CATEGORY.icon;
};

export const getLocationCategoryMeta = (loc: { icon?: string; location_name?: string; notes?: string }): CategoryMetadata => {
  const catId = resolveLocationCategory(loc);
  return CATEGORY_DEFINITIONS.find(c => c.id === catId) || GENERAL_PIN_CATEGORY;
};

/**
 * Checks whether a given location matches a search query by:
 * 1. Location name (case-insensitive substring)
 * 2. Notes / landmarks
 * 3. Its resolved category ID, English/Filipino names, or category keywords/synonyms
 */
export const matchesLocationSearch = (
  loc: { location_name?: string; notes?: string; icon?: string },
  query: string
): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. Direct location name match
  const locName = (loc.location_name || '').toLowerCase();
  if (locName.includes(q)) return true;

  // 2. Direct notes match
  const locNotes = (loc.notes || '').toLowerCase();
  if (locNotes.includes(q)) return true;

  // 3. Resolve category of this location
  const catId = resolveLocationCategory(loc);
  if (catId.toLowerCase().includes(q)) return true;

  // 4. Check if query matches category definition (English name, Filipino name, label, or keywords)
  const catDef = CATEGORY_DEFINITIONS.find(c => c.id === catId);
  if (catDef) {
    if (catDef.name.toLowerCase().includes(q)) return true;
    if (catDef.nameFil.toLowerCase().includes(q)) return true;
    if (catDef.label.toLowerCase().includes(q)) return true;
    if (catDef.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) return true;
  }

  return false;
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

export const ADDITIONAL_FARE_PER_HEAD = 10; // ₱10.00 standard LGU tariff surcharge per additional passenger head
export const MAX_PASSENGER_CAPACITY = 4; // Maximum legal capacity for passenger tricycles

export interface PassengerFareBreakdown {
  baseFare: number;
  passengerCount: number;
  additionalPerHead: number;
  totalAdditionalHeadFare: number;
  subtotalGross: number;
  discountPercent: number;
  discountAmount: number;
  finalFare: number;
  isDiscounted: boolean;
  passengerType: string;
}

export const calculateFareWithPassengers = (
  baseStandardFare: number,
  passengerCount: number = 1,
  passengerTypeOrEligible?: string | boolean | null,
  customDiscountedFare?: number
): PassengerFareBreakdown => {
  const count = Math.max(1, Math.min(MAX_PASSENGER_CAPACITY, Math.round(Number(passengerCount) || 1)));
  const base = Math.max(0, Number(baseStandardFare) || 20);
  const extraHeads = Math.max(0, count - 1);
  const totalAdditionalHeadFare = extraHeads * ADDITIONAL_FARE_PER_HEAD;

  const isEligible = typeof passengerTypeOrEligible === 'boolean'
    ? passengerTypeOrEligible
    : isDiscountEligibleType(passengerTypeOrEligible);
  const pType = typeof passengerTypeOrEligible === 'string' ? passengerTypeOrEligible : (isEligible ? 'student' : 'regular');

  const subtotalGross = base + totalAdditionalHeadFare;

  if (!isEligible) {
    return {
      baseFare: base,
      passengerCount: count,
      additionalPerHead: ADDITIONAL_FARE_PER_HEAD,
      totalAdditionalHeadFare,
      subtotalGross,
      discountPercent: 0,
      discountAmount: 0,
      finalFare: subtotalGross,
      isDiscounted: false,
      passengerType: 'regular'
    };
  }

  // If a preset discounted tariff exists for solo base (e.g. 16 for 20):
  const hasValidCustom = customDiscountedFare !== undefined &&
    Number(customDiscountedFare) > 0 &&
    Number(customDiscountedFare) < base;

  // Compute 20% statutory discount on subtotal gross
  const discountAmount = hasValidCustom && count === 1
    ? Math.max(0, base - Number(customDiscountedFare))
    : Math.round(subtotalGross * 0.20);
  const finalFare = Math.max(1, subtotalGross - discountAmount);

  return {
    baseFare: base,
    passengerCount: count,
    additionalPerHead: ADDITIONAL_FARE_PER_HEAD,
    totalAdditionalHeadFare,
    subtotalGross,
    discountPercent: 20,
    discountAmount,
    finalFare,
    isDiscounted: discountAmount > 0,
    passengerType: pType
  };
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

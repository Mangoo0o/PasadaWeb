import { supabase } from '../api/supabaseClient';
import { TouristSpot } from '../types/database.types';

const FALLBACK_TOURIST_SPOTS: TouristSpot[] = [
  {
    id: 'spot-1',
    name: 'Bauang Beach (Taberna Coast)',
    category: 'recreation',
    description: 'Tanyag na baybayin na may ginintuang paglubog ng araw, maaliwalas na simoy ng dagat, at resort cottages.',
    tagalog_description: 'Tanyag na baybayin na may ginintuang paglubog ng araw.',
    lat: 16.5284,
    lng: 120.3182,
    opening_hours: '6:00 AM - 9:00 PM',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-BAUANG-BEACH-01',
    nearest_terminal_name: 'Poblacion Plaza Terminal',
    est_tricycle_fare: 40
  },
  {
    id: 'spot-2',
    name: 'Lomboy Grape Farm (Urayong)',
    category: 'nature',
    description: 'Ang kauna-unahang grape picking vineyard sa Pilipinas. Tikman ang matatamis na ubas at lokal na alak.',
    tagalog_description: 'Kauna-unahang grape farm sa Pilipinas.',
    lat: 16.5021,
    lng: 120.3345,
    opening_hours: '7:00 AM - 6:00 PM',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-LOMBOY-GRAPES-02',
    nearest_terminal_name: 'Urayong South Terminal',
    est_tricycle_fare: 50
  },
  {
    id: 'spot-3',
    name: 'Saints Peter and Paul Parish Church',
    category: 'historical',
    description: 'Makasaysayang simbahan na itinatag noong 1587 sa ilalim ng pamamahala ng mga Agustino. May kilalang San Pedro bell.',
    tagalog_description: 'Makasaysayang simbahan na itinatag noong 1587.',
    lat: 16.5338,
    lng: 120.3339,
    opening_hours: '5:30 AM - 7:30 PM',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1548625361-16a7f9a1f26f?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-CHURCH-PETERPAUL-03',
    nearest_terminal_name: 'Poblacion Central Terminal',
    est_tricycle_fare: 20
  },
  {
    id: 'spot-4',
    name: 'Bakawan Eco-Park & Boardwalk',
    category: 'nature',
    description: 'Payapang mangrove forest sanctuary na may boardwalk para sa eco-tours, bird watching, at relaxation.',
    tagalog_description: 'Payapang mangrove sanctuary na may boardwalk.',
    lat: 16.5412,
    lng: 120.3211,
    opening_hours: '6:00 AM - 6:00 PM',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-BAKAWAN-ECO-04',
    nearest_terminal_name: 'Pugo Tricycle Terminal',
    est_tricycle_fare: 35
  },
  {
    id: 'spot-5',
    name: 'Gapuz Grapes Farm',
    category: 'nature',
    description: 'Popular na ubasan para sa agri-tourism, pick-and-pay grape harvesting, at instagrammable farm shots.',
    tagalog_description: 'Ubasan para sa pick-and-pay grape harvesting.',
    lat: 16.5078,
    lng: 120.3371,
    opening_hours: '7:00 AM - 5:30 PM',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-GAPUZ-GRAPES-05',
    nearest_terminal_name: 'Urayong South Terminal',
    est_tricycle_fare: 50
  },
  {
    id: 'spot-6',
    name: 'Bauang Town Plaza & Food Hub',
    category: 'food',
    description: 'Sentro ng mga lokal na kainan, kapehan, street food, at mga pasalubong mula sa bayan ng Bauang.',
    tagalog_description: 'Sentro ng mga lokal na kainan at kapehan.',
    lat: 16.5325,
    lng: 120.3342,
    opening_hours: '24 Oras Bukas',
    audio_url: 'https://cdn.freesound.org/previews/516/516428_6142149-lq.mp3',
    cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    qr_code_ref: 'QR-TOWN-PLAZA-06',
    nearest_terminal_name: 'Poblacion Plaza Terminal',
    est_tricycle_fare: 20
  }
];

export const fetchTouristSpots = async (): Promise<TouristSpot[]> => {
  try {
    const [spotsRes, faresRes] = await Promise.all([
      supabase.from('tourist_spots').select('*').order('name'),
      supabase.from('location_fares').select('*').eq('is_active', true).order('location_name')
    ]);

    const baseSpots: TouristSpot[] = (spotsRes.data && spotsRes.data.length > 0)
      ? (spotsRes.data as TouristSpot[])
      : FALLBACK_TOURIST_SPOTS;

    // Merge location fares that have custom images or media attachments
    if (faresRes.data && faresRes.data.length > 0) {
      const existingNames = new Set(baseSpots.map(s => s.name.toLowerCase().trim()));
      
      const extraSpots: TouristSpot[] = [];
      
      faresRes.data.forEach((fare: any) => {
        const cleanName = fare.location_name?.toLowerCase().trim();
        const hasMedia = fare.cover_image_url || (fare.images && fare.images.length > 0) || fare.video_url || fare.audio_url;
        
        // If it already exists in baseSpots, merge media attributes onto it
        const existingSpotIndex = baseSpots.findIndex(s => s.name.toLowerCase().trim() === cleanName || s.id === fare.id);
        if (existingSpotIndex >= 0) {
          baseSpots[existingSpotIndex] = {
            ...baseSpots[existingSpotIndex],
            cover_image_url: fare.cover_image_url || baseSpots[existingSpotIndex].cover_image_url,
            images: fare.images || baseSpots[existingSpotIndex].images || [baseSpots[existingSpotIndex].cover_image_url],
            audio_url: fare.audio_url || baseSpots[existingSpotIndex].audio_url,
            video_url: fare.video_url || baseSpots[existingSpotIndex].video_url,
            description: fare.description || baseSpots[existingSpotIndex].description,
            est_tricycle_fare: Number(fare.standard_fare || baseSpots[existingSpotIndex].est_tricycle_fare)
          };
        } else if (hasMedia) {
          // If it's a new location with media, add it as a new spot
          let cat: 'historical' | 'nature' | 'church' | 'food' | 'recreation' = 'recreation';
          if (fare.icon === 'church') cat = 'church';
          else if (fare.icon === 'farm' || fare.icon === 'park') cat = 'nature';
          else if (fare.icon === 'market' || fare.icon === 'food') cat = 'food';
          else if (fare.icon === 'landmark') cat = 'historical';

          extraSpots.push({
            id: fare.id || `loc-fare-${Date.now()}`,
            name: fare.location_name,
            category: cat,
            description: fare.description || fare.notes || 'Sikat na destinasyon at lokasyon sa bayan ng Bauang.',
            tagalog_description: fare.description || fare.notes,
            lat: Number(fare.lat),
            lng: Number(fare.lng),
            opening_hours: '6:00 AM - 8:00 PM',
            cover_image_url: fare.cover_image_url || (fare.images && fare.images[0]) || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
            images: fare.images && fare.images.length > 0 ? fare.images : (fare.cover_image_url ? [fare.cover_image_url] : []),
            audio_url: fare.audio_url || undefined,
            video_url: fare.video_url || undefined,
            qr_code_ref: `QR-LOC-${fare.id?.slice(0, 8) || 'BAUANG'}`,
            nearest_terminal_name: fare.origin_terminal_id ? 'Bauang Central Terminal' : 'Poblacion Terminal',
            est_tricycle_fare: Number(fare.standard_fare || 25)
          });
        }
      });

      return [...baseSpots, ...extraSpots];
    }

    return baseSpots;
  } catch (err) {
    console.warn('Using fallback spots:', err);
    return FALLBACK_TOURIST_SPOTS;
  }
};


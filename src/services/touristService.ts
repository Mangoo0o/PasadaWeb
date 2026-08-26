import { supabase } from '../api/supabaseClient';
import { TouristSpot } from '../types/database.types';

export const fetchTouristSpots = async (): Promise<TouristSpot[]> => {
  try {
    const [spotsRes, faresRes] = await Promise.all([
      supabase.from('tourist_spots').select('*').order('name'),
      supabase.from('location_fares').select('*').eq('is_active', true).order('location_name')
    ]);

    const baseSpots: TouristSpot[] = (spotsRes.data && Array.isArray(spotsRes.data))
      ? (spotsRes.data as TouristSpot[])
      : [];

    // Merge location fares from database
    if (faresRes.data && Array.isArray(faresRes.data) && faresRes.data.length > 0) {
      const extraSpots: TouristSpot[] = [];

      faresRes.data.forEach((fare: any) => {
        const cleanName = fare.location_name?.toLowerCase().trim();

        // If it already exists in baseSpots, merge media attributes onto it
        const existingSpotIndex = baseSpots.findIndex(
          s => (s.name && s.name.toLowerCase().trim() === cleanName) || s.id === fare.id
        );

        if (existingSpotIndex >= 0) {
          baseSpots[existingSpotIndex] = {
            ...baseSpots[existingSpotIndex],
            cover_image_url: fare.cover_image_url || baseSpots[existingSpotIndex].cover_image_url,
            images: fare.images || baseSpots[existingSpotIndex].images || (fare.cover_image_url ? [fare.cover_image_url] : []),
            audio_url: fare.audio_url || baseSpots[existingSpotIndex].audio_url,
            video_url: fare.video_url || baseSpots[existingSpotIndex].video_url,
            description: fare.description || baseSpots[existingSpotIndex].description,
            est_tricycle_fare: Number(fare.standard_fare || baseSpots[existingSpotIndex].est_tricycle_fare)
          };
        } else {
          // Add as a destination spot
          let cat: 'historical' | 'nature' | 'church' | 'food' | 'recreation' = 'recreation';
          if (fare.icon === 'church') cat = 'church';
          else if (fare.icon === 'farm' || fare.icon === 'park') cat = 'nature';
          else if (fare.icon === 'market' || fare.icon === 'food') cat = 'food';
          else if (fare.icon === 'landmark') cat = 'historical';

          const spotImgs = (Array.isArray(fare.images) && fare.images.length > 0)
            ? fare.images
            : (fare.cover_image_url ? [fare.cover_image_url] : []);

          extraSpots.push({
            id: fare.id || `loc-fare-${Date.now()}`,
            name: fare.location_name,
            category: cat,
            description: fare.description || fare.notes || 'Sikat na destinasyon sa bayan ng Bauang.',
            tagalog_description: fare.description || fare.notes,
            lat: Number(fare.lat),
            lng: Number(fare.lng),
            opening_hours: '6:00 AM - 8:00 PM',
            cover_image_url: fare.cover_image_url || spotImgs[0] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
            images: spotImgs,
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
    console.error('Error fetching tourist spots from database:', err);
    return [];
  }
};


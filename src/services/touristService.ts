import { supabase } from '../api/supabaseClient';
import { TouristSpot } from '../types/database.types';

export const fetchTouristSpots = async (): Promise<TouristSpot[]> => {
  try {
    const { data, error } = await supabase
      .from('tourist_spots')
      .select('*')
      .order('name');

    if (error || !data) {
      if (error) console.error('Error fetching tourist spots:', error);
      return [];
    }
    return data as TouristSpot[];
  } catch (err) {
    console.error('Error fetching tourist spots:', err);
    return [];
  }
};


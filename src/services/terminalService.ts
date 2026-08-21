import { supabase } from '../api/supabaseClient';
import { Terminal, FareMatrix } from '../types/database.types';

export const fetchTerminals = async (): Promise<Terminal[]> => {
  try {
    const { data, error } = await supabase
      .from('terminals')
      .select('*')
      .order('name');

    if (error || !data) {
      if (error) console.error('Error fetching terminals:', error);
      return [];
    }
    return data as Terminal[];
  } catch (err) {
    console.error('Error fetching terminals:', err);
    return [];
  }
};

export const fetchFareMatrices = async (): Promise<FareMatrix[]> => {
  try {
    const { data, error } = await supabase
      .from('fare_matrix')
      .select('*, terminals(name)')
      .order('effective_date', { ascending: false });

    if (error || !data) {
      if (error) console.error('Error fetching fare matrix:', error);
      return [];
    }

    return data.map((item: any) => ({
      ...item,
      terminal_name: item.terminals?.name || 'Terminal'
    })) as FareMatrix[];
  } catch (err) {
    console.error('Error fetching fare matrix:', err);
    return [];
  }
};

export const updateFareMatrixRate = async (
  matrixId: string,
  baseFare: number,
  perKmRate: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('fare_matrix')
      .update({
        base_fare: baseFare,
        per_km_rate: perKmRate,
        effective_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', matrixId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update fare matrix' };
  }
};


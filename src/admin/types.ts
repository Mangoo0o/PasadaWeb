export type UserRole = 'passenger' | 'driver' | 'admin' | 'super_admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'searching' | 'driver_assigned' | 'driver_arrived' | 'in_transit' | 'completed' | 'cancelled' | 'requested' | 'accepted' | 'ongoing';
export type ComplaintCategory = 'overcharging' | 'refusal' | 'refusal_of_service' | 'reckless_driving' | 'rude_behavior' | 'lost_item' | 'other';
export type ComplaintStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  photo_url?: string;
  language_pref?: 'fil' | 'en' | string;
  created_at: string;
  email?: string;
  phone?: string;
  phone_number?: string;
}

export interface Terminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
  active_drivers_count?: number;
  coverage_radius_km?: number;
  code?: string;
  base_fare?: number;
  base_km?: number;
  per_km_rate?: number;
  description?: string;
}

export interface Driver {
  profile_id: string;
  id?: string;
  terminal_id: string | null;
  tricycle_model: string;
  plate_number: string;
  body_number?: string;
  verification_status: VerificationStatus;
  is_available?: boolean;
  current_lat?: number;
  current_lng?: number;
  profile?: Profile;
  terminal?: Terminal;
  rating?: number;
  rating_avg?: number;
  total_trips?: number;
  earnings_today?: number;
}

export interface FareMatrix {
  id: string;
  origin_terminal_id: string;
  base_fare: number;
  per_km_rate: number;
  per_minute_rate?: number;
  night_differential_multiplier?: number;
  effective_date: string;
  updated_by?: string;
  origin_terminal?: Terminal;
  updated_by_profile?: Profile;
  notes?: string;
}

export interface LocationFare {
  id: string;
  origin_terminal_id: string;
  location_name: string;
  lat: number;
  lng: number;
  proximity_radius_meters: number;
  standard_fare: number;
  discounted_fare?: number;
  notes?: string;
  is_active?: boolean;
  origin_terminal?: Terminal;
  created_at?: string;
  updated_at?: string;
}


export interface Booking {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  origin_name?: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_name?: string;
  destination_lat?: number;
  destination_lng?: number;
  status: BookingStatus;
  computed_fare?: number;
  estimated_fare?: number;
  final_fare?: number;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  payment_method?: string;
  created_at: string;
  completed_at?: string;
  passenger?: Profile;
  driver?: Driver;
  pickup_name?: string;
  dropoff_name?: string;
  distance_km?: number;
}

export interface FareReceipt {
  booking_id: string;
  base_fare: number;
  distance_fee: number;
  time_fee: number;
  surcharges: number;
  total: number;
  breakdown_json?: any;
}

export interface Complaint {
  id: string;
  booking_id?: string;
  passenger_id: string;
  driver_id?: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  reviewed_by?: string;
  created_at: string;
  resolved_at?: string;
  passenger?: Profile;
  driver?: Driver;
  booking?: Booking;
  resolution_notes?: string;
  passenger_name?: string;
  driver_name?: string;
  driver_body_number?: string;
}

export interface TouristSpot {
  id: string;
  name: string;
  description: string;
  tagalog_description?: string;
  opening_hours: string;
  lat: number;
  lng: number;
  qr_code_ref: string;
  audio_url?: string;
  language?: string;
  category?: string;
  image_url?: string;
  cover_image_url?: string;
  nearest_terminal_name?: string;
  est_tricycle_fare?: number;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id?: string;
  details_json: any;
  created_at: string;
  admin?: Profile;
}

export interface NotificationItem {
  id: string;
  recipient_role: UserRole;
  title: string;
  message: string;
  type: 'complaint' | 'driver_verification' | 'system';
  read: boolean;
  created_at: string;
}

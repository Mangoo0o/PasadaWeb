export type UserRole = 'passenger' | 'driver' | 'admin';

export type BookingStatus =
  | 'searching'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'digital_wallet';

export type ComplaintStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone_number?: string;
  photo_url?: string;
  passenger_type?: 'regular' | 'student' | 'senior' | 'pwd';
  language_pref: 'en' | 'fil';
  created_at: string;
}

export interface DriverProfile {
  id: string; // references Profile.id
  terminal_id?: string;
  terminal_name?: string;
  tricycle_model: string;
  plate_number: string;
  body_number: string;
  verification_status: VerificationStatus;
  is_available: boolean;
  current_lat?: number;
  current_lng?: number;
  rating_avg: number;
  total_trips?: number;
  earnings_today?: number;
  updated_at: string;
  profile?: Profile;
}

export interface Terminal {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  base_fare: number;
  base_km: number;
  per_km_rate: number;
  coverage_polygon?: Array<[number, number]>;
  active_drivers_count?: number;
  description?: string;
}

export interface FareMatrix {
  id: string;
  origin_terminal_id: string;
  terminal_name?: string;
  base_fare: number;
  base_km: number;
  per_km_rate: number;
  night_differential_multiplier: number; // e.g. 1.15 (+15%)
  effective_date: string;
  updated_by?: string;
  created_at: string;
}

export interface LocationFare {
  id: string;
  origin_terminal_id: string;
  terminal_name?: string;
  location_name: string;
  lat: number;
  lng: number;
  proximity_radius_meters: number;
  standard_fare: number;
  discounted_fare?: number;
  icon?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}


export interface Booking {
  id: string;
  passenger_id: string;
  passenger_name?: string;
  passenger_phone?: string;
  passenger?: Profile;
  driver_id?: string;
  driver?: DriverProfile;
  origin_name: string;
  origin_lat: number;
  origin_lng: number;
  destination_name: string;
  destination_lat: number;
  destination_lng: number;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare: number;
  final_fare?: number;
  cancellation_fee?: number;
  cancellation_reason?: string;
  cancelled_by?: string;
  status: BookingStatus;
  payment_method: PaymentMethod;
  created_at: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface TripReview {
  id: string;
  booking_id: string;
  passenger_rating?: number;
  passenger_feedback?: string;
  driver_rating?: number;
  driver_feedback?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  booking_id?: string;
  passenger_id: string;
  passenger_name?: string;
  driver_id?: string;
  driver_name?: string;
  driver_body_number?: string;
  category: 'overcharging' | 'reckless_driving' | 'refusal_of_service' | 'rude_behavior' | 'lost_item' | 'other';
  description: string;
  status: ComplaintStatus;
  resolution_notes?: string;
  reviewed_by?: string;
  created_at: string;
  resolved_at?: string;
}

export interface TouristSpot {
  id: string;
  name: string;
  category: 'historical' | 'nature' | 'church' | 'food' | 'recreation';
  description: string;
  tagalog_description?: string;
  lat: number;
  lng: number;
  opening_hours: string;
  audio_url?: string;
  cover_image_url: string;
  qr_code_ref: string;
  nearest_terminal_name: string;
  est_tricycle_fare: number;
}

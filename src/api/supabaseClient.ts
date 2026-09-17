import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Check if credentials are real or placeholder
export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('sample-project') && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key') &&
  supabaseUrl.startsWith('https://')
);

// Only initialize full auth persistence/refresh if valid credentials are provided
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isConfigured ? supabaseAnonKey : 'placeholder-anon-key', 
  {
    auth: {
      persistSession: isConfigured,
      autoRefreshToken: isConfigured,
    },
  }
);


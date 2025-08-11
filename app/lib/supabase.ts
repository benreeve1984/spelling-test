import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if valid credentials are provided
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const supabase = 
  supabaseUrl && 
  supabaseAnonKey && 
  isValidUrl(supabaseUrl) &&
  !supabaseUrl.includes('your_supabase_url_here')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';
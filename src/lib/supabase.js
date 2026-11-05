import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// One shared client for the whole app. Import it wherever you need the database:
//   import { supabase } from './lib/supabase.js';
//
// persistSession + autoRefreshToken = "log in once per device and stay logged in".
// The session is saved in localStorage and silently refreshed before it expires.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isConfigured = !SUPABASE_URL.includes('YOUR-PROJECT-ID');

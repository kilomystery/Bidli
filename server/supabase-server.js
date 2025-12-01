/**
 * Supabase Client per il Backend
 * Usa process.env invece di import.meta.env
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in backend');
  console.error('Available env vars:', Object.keys(process.env).filter(key => 
    key.includes('SUPABASE') || key.includes('VITE_SUPABASE')
  ));
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false, // Backend non gestisce sessioni utente
    persistSession: false
  }
});

export default supabase;
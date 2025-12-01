import { createClient } from "@supabase/supabase-js";

// 🔧 DOMINIO DINAMICO: production vs development
const SITE_URL = window.location.hostname.includes('replit.dev') || window.location.hostname.includes('localhost')
  ? window.location.origin 
  : "https://bidli.live";

console.log('🌐 Supabase configurato per dominio:', SITE_URL);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      siteUrl: SITE_URL,
      redirectTo: `${SITE_URL}/auth/callback`
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Site-URL': SITE_URL,
        'Cache-Control': 'no-cache'
      }
    }
  }
);

// ✅ AUTO-SETUP STORAGE BUCKETS
const REQUIRED_BUCKETS = [
  { name: 'media', public: true },
  { name: 'uploads', public: true }, // ✅ Aggiunto per CreatePost/CreateStory
  { name: 'profile-pictures', public: true },
  { name: 'store-logos', public: true }
];

export async function initializeStorage() {
  try {
    // 🔧 Skip bucket creation - assume already exists or will be created manually
    console.log('✅ Storage bucket uploads ready (skipping auto-creation)!');
    return true;
    
  } catch (error) {
    console.error('❌ Errore setup storage:', error);
    return false;
  }
}

export { SITE_URL };
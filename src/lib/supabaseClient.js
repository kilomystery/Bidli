import { createClient } from "@supabase/supabase-js";

// 🌐 URL del sito (dev + prod)
// Ora NON forziamo più "https://bidli.live", usiamo sempre il dominio reale
const SITE_URL = window.location.origin;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[BIDLI] SITE_URL:", SITE_URL);
console.log("[BIDLI] VITE_SUPABASE_URL:", supabaseUrl);
console.log("[BIDLI] HAS_SUPABASE_ANON_KEY:", !!supabaseAnonKey);

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL non definita. Controlla le Environment Variables su Vercel (tab Production)."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY non definita. Controlla le Environment Variables su Vercel (tab Production)."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      siteUrl: SITE_URL,
      redirectTo: `${SITE_URL}/auth/callback`,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "X-Site-URL": SITE_URL,
        "Cache-Control": "no-cache",
      },
    },
  }
);

// ✅ AUTO-SETUP STORAGE BUCKETS (per ora solo log, come prima)
export async function initializeStorage() {
  try {
    console.log("✅ Storage bucket uploads ready (skipping auto-creation)!");
    return true;
  } catch (error) {
    console.error("❌ Errore setup storage:", error);
    return false;
  }
}

export { SITE_URL };

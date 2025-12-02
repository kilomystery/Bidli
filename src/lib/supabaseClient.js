import { createClient } from "@supabase/supabase-js";

// 🌐 URL del sito — quello dove gira il front-end
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

// 🌐 URL del callback OAuth gestito da Supabase, sempre fisso
const SUPABASE_CALLBACK = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/callback`;

console.log("🔵 SITE_URL:", SITE_URL);
console.log("🔵 SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("🔵 Supabase callback:", SUPABASE_CALLBACK);

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,

      // 🔴 IMPORTANTISSIMO per Google OAuth:
      // Google SEMPRE reindirizza al callback SUPABASE
      redirectTo: SUPABASE_CALLBACK,

      // 🔵 SITE_URL serve per magic link email
      siteUrl: SITE_URL,
    },
  }
);

export { SITE_URL };

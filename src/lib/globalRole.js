// src/lib/globalRole.js - Sistema globale ruoli per BIDLi
import { supabase } from './supabaseClient';

/**
 * Sistema globale di gestione ruoli:
 * - window.__session = sessione Supabase (solo lettura)
 * - window.__role = "guest" | "buyer" | "seller"
 * 
 * Specifica comportamenti:
 * - Guest: icona profilo → AuthModal
 * - Buyer: icona profilo → sheet profilo buyer + upgrade a seller
 * - Seller: icona "+" visibile + sheet profilo seller
 */

// Inizializzazione variabili globali
window.__session = null;
window.__role = "guest";

// Eventi personalizzati per notificare cambiamenti
const dispatchRoleChange = (newRole) => {
  console.log("📢 Dispatching role:changed event:", { newRole, userId: window.__session?.user?.id });
  window.dispatchEvent(new CustomEvent('role:changed', { 
    detail: { role: newRole, session: window.__session } 
  }));
};

// 🎯 SISTEMA UNIFICATO - Logica master per rilevamento ruolo
async function unifiedDetectRole(userId, accessToken = null) {
  try {
    console.log('🔍 UnifiedDetectRole: Controllo ruolo per user:', userId);

    // 1) CONTROLLA PROFILES COME PRIMA PRIORITÀ
    console.log('🔍 Iniziando query profiles per userId:', userId);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, store_name")
      .eq("id", userId)
      .maybeSingle();
    console.log('📊 Query profiles completata:', { profile, error: profileError });

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn("⚠️ Errore profiles:", profileError);
    }

    const profileRole = profile?.role;
    console.log('📋 Profile role trovato:', profileRole);

    // 2) CONTROLLA SELLERS VIA API (con Bearer se disponibile)
    let apiSeller = null;
    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const sellerResponse = await fetch(`/api/sellers/user/${userId}`, { headers });
      if (sellerResponse.ok) {
        apiSeller = await sellerResponse.json();
        console.log('🏪 API Seller trovato:', apiSeller?.display_name);
      }
    } catch (e) {
      console.log('⚠️ API sellers non disponibile, fallback Supabase');
    }

    // 3) FALLBACK SUPABASE SELLERS
    let supabaseSeller = null;
    if (!apiSeller) {
      const { data: sellerRow } = await supabase
        .from("sellers")
        .select("id, user_id, display_name")
        .eq("user_id", userId)
        .maybeSingle();
      supabaseSeller = sellerRow;
      console.log('🏪 Supabase Seller trovato:', supabaseSeller?.display_name);
    }

    const sellerData = apiSeller || supabaseSeller;

    // 4) DECISIONE FINALE: seller se ha sellers data OR profile.role === "seller"
    if (sellerData || profileRole === "seller") {
      console.log('✅ SELLER confermato');
      return "seller";
    }

    // 5) Se ha profile con altro ruolo, rispetta quello
    if (profileRole === "buyer" || profileRole === "customer") {
      console.log('👤 BUYER confermato da profile');
      return "buyer";
    }

    // 6) CREA PROFILO BUYER SE NON ESISTE
    if (!profile) {
      console.log('🆕 Creando profilo buyer...');
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ 
          id: userId, 
          role: "buyer",
          profile_completed: false 
        });

      if (upsertError) {
        console.warn("⚠️ Errore creazione profilo buyer:", upsertError);
      }
    }

    console.log('👤 BUYER fallback');
    return "buyer";

  } catch (error) {
    console.error("❌ Errore unifiedDetectRole:", error);
    return "buyer"; // fallback sicuro
  }
}

// 📜 LEGACY: Mantiene compatibilità esistente 
async function detectRole(userId) {
  return await unifiedDetectRole(userId);
}

// Aggiorna ruolo globale usando sistema unificato
async function updateGlobalRole(session = null) {
  console.log("🔄 updateGlobalRole chiamato con:", { hasSession: !!session, userId: session?.user?.id });
  
  if (!session) {
    window.__session = null;
    window.__role = "guest";
    console.log("👤 Utente non loggato - ruolo: guest");
    dispatchRoleChange("guest");
    return;
  }

  window.__session = session;
  
  if (session.user?.id) {
    // 🎯 USA SISTEMA UNIFICATO con access token se disponibile
    const role = await unifiedDetectRole(session.user.id, session.access_token);
    window.__role = role;
    console.log("👤 Utente loggato - ruolo:", role, "email:", session.user.email);
    dispatchRoleChange(role);
  } else {
    window.__role = "guest";
    console.log("👤 Sessione senza user ID - ruolo: guest");
    dispatchRoleChange("guest");
  }
}

// Aggiornamento manuale ruolo (per upgrade seller)
async function forceRoleUpdate() {
  if (window.__session?.user?.id) {
    // 🎯 USA SISTEMA UNIFICATO
    const role = await unifiedDetectRole(window.__session.user.id, window.__session.access_token);
    window.__role = role;
    dispatchRoleChange(role);
  }
}

// Inizializzazione sistema
async function initializeGlobalRole() {
  try {
    // Carica sessione corrente
    const { data: { session } } = await supabase.auth.getSession();
    await updateGlobalRole(session);

    // Listener per cambiamenti auth
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 onAuthStateChange event:", event, "hasSession:", !!session, "userId:", session?.user?.id);
      await updateGlobalRole(session);
    });

    console.log("✅ Sistema ruoli globale inizializzato:", {
      session: !!window.__session,
      role: window.__role,
      user: window.__session?.user?.email
    });
  } catch (error) {
    console.error("Errore inizializzazione sistema ruoli:", error);
    window.__role = "guest";
  }
}

// API pubblica
export {
  initializeGlobalRole,
  updateGlobalRole,
  forceRoleUpdate,
  detectRole,
  unifiedDetectRole  // 🎯 NUOVA FUNZIONE MASTER
};

// Utilità per components
export const getCurrentRole = () => window.__role;
export const getCurrentSession = () => window.__session;

// Auto-inizializzazione
if (typeof window !== 'undefined') {
  initializeGlobalRole();
}
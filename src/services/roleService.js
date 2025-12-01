// src/services/roleService.js
import { supabase } from "../lib/supabaseClient";

/** Cache semplice in memoria */
let _role = "guest";
export function getCachedRole() {
  return _role;
}
export function setCachedRole(r) {
  _role = r || "guest";
}

/** Legge il ruolo da Supabase e lo memorizza */
export async function hydrateRole() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setCachedRole("guest");
    return "guest";
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[hydrateRole] errore lettura profilo:", error);
    setCachedRole("customer");
    return "customer";
  }
  const role = data?.role || "customer";
  setCachedRole(role);
  return role;
}

/**
 * Upgrade "hard" a venditore:
 * - upsert su profiles.role = 'seller'
 * - upsert su sellers (solo colonne sicure)
 */
export async function forceUpgradeToSeller({ store_name }) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Non sei autenticato");

  // 1) profilo -> role: seller
  const { error: profErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, role: "seller", updated_at: new Date().toISOString() })
    .select("id")
    .maybeSingle();

  if (profErr) {
    console.error("[upgrade] errore su profiles:", profErr);
    throw new Error("Aggiornamento profilo non riuscito");
  }

  // 2) sellers (usa solo colonne sicure)
  // Se il tuo schema ha nomi diversi, adatta qui.
  const sellerPayload = {
    id: user.id,                // spesso PK/PK-FK verso profiles
    store_name: store_name || "My Store",
    updated_at: new Date().toISOString(),
  };

  const { error: sellErr } = await supabase
    .from("sellers")
    .upsert(sellerPayload)
    .select("id")
    .maybeSingle();

  if (sellErr) {
    // Non blocchiamo l’upgrade del ruolo se il record sellers ha più vincoli,
    // ma lo segnaliamo chiaramente in console.
    console.error("[upgrade] errore su sellers:", sellErr);
    // opzionale: throw new Error("Creazione negozio non riuscita");
  }

  setCachedRole("seller");
  return "seller";
}
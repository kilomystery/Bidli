// src/pages/CompleteSellerProfile.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { forceRoleUpdate } from "../lib/globalRole";

export default function CompleteSellerProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dati form venditore
  const [form, setForm] = useState({
    store_name: "",
    handle: "",
    store_description: "",
    category: "",
    avatar_url: "",
    business_email: "",
    phone: "",
    iban: "",
    // indirizzi (solo esempi, compatibili con quanto avevi in buyer)
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country: "Italia",
  });

  // Categorie esempio (puoi allinearle a quelle che già usi)
  const categories = [
    { value: "fashion", label: "👗 Fashion & Abbigliamento" },
    { value: "sneakers", label: "👟 Sneakers & Scarpe" },
    { value: "electronics", label: "📱 Elettronica & Tech" },
    { value: "collectibles", label: "🎯 Collezionismo" },
    { value: "home", label: "🏠 Casa & Design" },
    { value: "other", label: "🎭 Altro" },
  ];

  // Carico sessione e (se esiste) dati seller già salvati per precompilare
  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // prefill da sellers (Supabase) se presente
      const { data: seller } = await supabase
        .from("sellers")
        .select("store_name, handle, display_name, avatar_url, category, phone, business_email, iban, shipping_address, shipping_city, shipping_postal_code, shipping_country, store_description")
        .eq("user_id", user.id)
        .maybeSingle();

      if (seller) {
        setForm({
          store_name: seller.store_name || seller.display_name || "",
          handle: seller.handle || "",
          store_description: seller.store_description || "",
          category: seller.category || "",
          avatar_url: seller.avatar_url || "",
          business_email: seller.business_email || user.email || "",
          phone: seller.phone || "",
          iban: seller.iban || "",
          shipping_address: seller.shipping_address || "",
          shipping_city: seller.shipping_city || "",
          shipping_postal_code: seller.shipping_postal_code || "",
          shipping_country: seller.shipping_country || "Italia",
        });
      } else {
        // altrimenti prefill base con l'email utente
        setForm((f) => ({
          ...f,
          business_email: user.email || "",
        }));
      }
    })();
  }, [navigate]);

  function upd(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function uploadAvatar(file) {
    if (!file || !user) return null;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${user.id}-seller-avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, file);
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase
        .from("profile-pictures")
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      console.error("Upload avatar error:", e);
      setError("Errore durante l'upload dell'avatar");
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validazioni base
      if (!form.store_name.trim()) throw new Error("Il nome negozio è obbligatorio");
      if (!form.category) throw new Error("Seleziona una categoria");
      if (!form.iban || form.iban.length < 15) throw new Error("IBAN non valido");
      if (!form.phone.trim()) throw new Error("Il numero di telefono è obbligatorio");

      // Calcolo API base (come nel buyer, restiamo compatibili)
      const API_BASE = window.location.origin.replace(":5000", ":3001");

      // 1) crea/aggiorna seller via backend
      const payload = {
        store_name: form.store_name,
        handle: form.handle || undefined,
        store_description: form.store_description || "",
        avatar_url: form.avatar_url || "",
        category: form.category,
        business_email: form.business_email || user.email || "verified@bidli.live",
        phone: form.phone,
        iban: form.iban,
        shipping_address: form.shipping_address || "",
        shipping_city: form.shipping_city || "",
        shipping_postal_code: form.shipping_postal_code || "",
        shipping_country: form.shipping_country || "Italia",
      };

      const res = await fetch(`${API_BASE}/api/sellers/${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = {};
      try { json = JSON.parse(text || "{}"); } catch { json = {}; }
      if (!res.ok && json?.error) throw new Error(json.error);

      // 2) aggiorna ruolo nel profilo
      await supabase.from("profiles").update({ role: "seller" }).eq("id", user.id);

      // 3) ✅ Forza aggiornamento sistema ruoli globale
      await forceRoleUpdate();
      
      // Dispatch evento compatibilità (per componenti legacy)
      window.dispatchEvent(new Event("role:updated"));

      setSuccess("🎉 Profilo venditore aggiornato! Benvenuto nel Live Studio.");
      setTimeout(() => navigate("/seller-dashboard"), 900);
    } catch (err) {
      setError(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 16px", marginTop: 80 }}>
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>
            🏪 Completa profilo venditore
          </h1>
          <p style={{ marginTop: 8, color: "#6b7280" }}>
            Configura il tuo negozio. Potrai modificare tutto in seguito dal Centro gestione account.
          </p>

          {error && (
            <div style={{ marginTop: 16, background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", padding: 12, borderRadius: 8 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 16, background: "#d1fae5", border: "1px solid #a7f3d0", color: "#065f46", padding: 12, borderRadius: 8 }}>
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Avatar */}
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                Logo / Avatar negozio
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={
                    form.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(form.store_name || "Shop")}&background=0ea5e9&color=fff&size=64`
                  }
                  alt="avatar"
                  style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", border: "1px solid #e5e7eb" }}
                />
                <label
                  style={{
                    display: "inline-block",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    cursor: "pointer",
                    background: "#f9fafb",
                  }}
                >
                  {uploadingAvatar ? "Caricamento..." : "Carica immagine"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadAvatar(f);
                      if (url) upd("avatar_url", url);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Nome + Handle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                  Nome negozio *
                </label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => upd("store_name", e.target.value)}
                  placeholder="Vintage Lab"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                  Handle (opzionale)
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      color: "#6b7280",
                      fontSize: 14,
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={form.handle}
                    onChange={(e) => upd("handle", e.target.value.replace(/\s/g, "").toLowerCase())}
                    placeholder="il-tuo-shop"
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 26px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      fontSize: 15,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                Descrizione negozio
              </label>
              <textarea
                value={form.store_description}
                onChange={(e) => upd("store_description", e.target.value)}
                rows={3}
                placeholder="Racconta cosa vendi, stile, epoche, punti di forza…"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Categoria */}
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                Categoria *
              </label>
              <select
                value={form.category}
                onChange={(e) => upd("category", e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  background: "white",
                }}
              >
                <option value="">Scegli…</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Contatti + IBAN */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                  Email business
                </label>
                <input
                  type="email"
                  value={form.business_email}
                  onChange={(e) => upd("business_email", e.target.value)}
                  placeholder="negozio@esempio.it"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => upd("phone", e.target.value)}
                  placeholder="+39 ..."
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                  IBAN *
                </label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => upd("iban", e.target.value)}
                  placeholder="IT00 X000 0000 0000 0000 0000 000"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
              </div>
            </div>

            {/* Indirizzo evasione/spedizioni */}
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6, color: "#111827" }}>
                Indirizzo evasione / resi (opzionale ma consigliato)
              </label>
              <input
                type="text"
                value={form.shipping_address}
                onChange={(e) => upd("shipping_address", e.target.value)}
                placeholder="Via …, numero"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <input
                  type="text"
                  value={form.shipping_city}
                  onChange={(e) => upd("shipping_city", e.target.value)}
                  placeholder="Città"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
                <input
                  type="text"
                  value={form.shipping_postal_code}
                  onChange={(e) => upd("shipping_postal_code", e.target.value)}
                  placeholder="CAP"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
                <input
                  type="text"
                  value={form.shipping_country}
                  onChange={(e) => upd("shipping_country", e.target.value)}
                  placeholder="Paese"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                  }}
                />
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: "#0ea5e9",
                  color: "white",
                  border: 0,
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Salvataggio..." : "Salva profilo venditore"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/account")}
                style={{
                  background: "transparent",
                  border: "1px solid #d1d5db",
                  color: "#374151",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
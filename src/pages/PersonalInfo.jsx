// src/pages/PersonalInfo.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BackButton from '../components/BackButton';

export default function PersonalInfo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("Italia");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        
        // 1) Auth check con Supabase (per user ID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.dispatchEvent(new Event("auth:open"));
          return;
        }

        setUser(user);

        // 2) Carica profilo dal database locale PostgreSQL
        const profileResponse = await fetch(`/api/profiles/${user.id}`);
        
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          console.log('✅ PersonalInfo: Profilo caricato:', profile);
          
          setFirstName(profile.first_name || "");
          setLastName(profile.last_name || "");
          setPhone(profile.phone || "");
          setBirthDate(profile.birth_date || "");
          setAddress(profile.shipping_address || "");
          setCity(profile.shipping_city || "");
          setZipCode(profile.shipping_postal_code || "");
          setCountry(profile.shipping_country || "Italia");
        } else {
          console.log('⚠️ PersonalInfo: Nessun profilo trovato, using defaults');
        }

      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Errore nel caricamento dei dati");
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessione scaduta. Ricarica la pagina.");
        return;
      }

      // Salva nel database locale PostgreSQL
      const profileData = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        birth_date: birthDate || null,
        shipping_address: address,
        shipping_city: city,
        shipping_postal_code: zipCode,
        shipping_country: country
      };

      const response = await fetch(`/api/profiles/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore salvataggio profilo');
      }

      console.log('✅ PersonalInfo: Profilo salvato nel database locale');

      setSuccess("Informazioni personali aggiornate con successo!");
      
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Errore nel salvataggio: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <h2>Accesso richiesto</h2>
        <p>Devi effettuare l'accesso per gestire le informazioni personali.</p>
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: 800, margin: "0 auto" }}>
      <BackButton to="/account" style={{ marginBottom: '32px' }} />
      {/* MODERN HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 20,
        padding: 32,
        color: "white",
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
        textAlign: "center"
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 32
        }}>
          👤
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
          Informazioni Personali
        </h1>
        <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
          Gestisci i tuoi dati personali e di contatto
        </p>
      </div>

      {/* MESSAGES */}
      {error && (
        <div style={{
          background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
          color: "white",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
          color: "white",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          {success}
        </div>
      )}

      {/* ACCOUNT INFO */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
        marginBottom: 24
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
          📧 Informazioni Account
        </h3>
        
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{
            padding: 16,
            background: "#f7fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontSize: 14, color: "#718096", marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{user.email}</div>
            <div style={{ fontSize: 12, color: "#718096", marginTop: 4 }}>
              Per modificare l'email, contatta il supporto
            </div>
          </div>
          
          <div style={{
            padding: 16,
            background: "#f7fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ fontSize: 14, color: "#718096", marginBottom: 4 }}>ID Utente</div>
            <div style={{ fontSize: 14, fontFamily: "monospace" }}>{user.id}</div>
          </div>
        </div>
      </div>

      {/* PERSONAL INFO FORM */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 32,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
          📝 Dati Personali
        </h3>

        <form onSubmit={handleSave}>
          {/* Name Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>👨</span>
                Nome
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Il tuo nome"
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>👨‍💼</span>
                Cognome
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Il tuo cognome"
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>
          </div>

          {/* Contact Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>📱</span>
                Telefono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 123 456 7890"
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>🎂</span>
                Data di nascita
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: "flex", 
              marginBottom: 8, 
              fontSize: 16,
              fontWeight: 600,
              color: "#2d3748",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 20 }}>🏠</span>
              Indirizzo
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Via Roma 123"
              style={{
                width: "100%",
                padding: 16,
                border: "2px solid #e2e8f0",
                borderRadius: 12,
                fontSize: 16,
                outline: "none",
                transition: "all 0.2s ease",
                background: "#fafafa"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.background = "#fff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e2e8f0";
                e.target.style.background = "#fafafa";
              }}
            />
          </div>

          {/* City, ZIP, Country */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>🏙️</span>
                Città
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Milano"
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>📮</span>
                CAP
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="20100"
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              />
            </div>

            <div>
              <label style={{ 
                display: "flex", 
                marginBottom: 8, 
                fontSize: 16,
                fontWeight: 600,
                color: "#2d3748",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>🇮🇹</span>
                Paese
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "2px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 16,
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#fafafa"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#667eea";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.background = "#fafafa";
                }}
              >
                <option value="Italia">Italia</option>
                <option value="Svizzera">Svizzera</option>
                <option value="Francia">Francia</option>
                <option value="Germania">Germania</option>
                <option value="Spagna">Spagna</option>
              </select>
            </div>
          </div>

          {/* BUTTONS */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "16px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 6px 20px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              {saving ? (
                <>
                  <span style={{ fontSize: 16 }}>⏳</span>
                  Salvataggio...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>💾</span>
                  Salva Modifiche
                </>
              )}
            </button>

            <a 
              href="/account" 
              style={{ 
                color: "#667eea", 
                textDecoration: "none",
                padding: "16px 24px",
                borderRadius: 12,
                background: "rgba(102, 126, 234, 0.1)",
                fontWeight: 500,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <span style={{ fontSize: 16 }}>←</span>
              Torna alle Impostazioni
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
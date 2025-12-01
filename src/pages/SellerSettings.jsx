// src/pages/SellerSettings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BackButton from '../components/BackButton';

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSellerProfile() {
      try {
        setLoading(true);
        
        // 1) Auth check con Supabase (per user ID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Devi accedere per modificare il profilo.");
          setLoading(false);
          return;
        }

        // 2) Carica seller dal database locale (STESSA LOGICA ALTRE PAGINE)
        const [sellerResponse, profileResponse] = await Promise.all([
          fetch(`/api/sellers/user/${user.id}`),
          fetch(`/api/profiles/${user.id}`)
        ]);

        let sellerData = null;
        let profile = null;

        if (sellerResponse.ok) {
          sellerData = await sellerResponse.json();
        }
        
        if (profileResponse.ok) {
          profile = await profileResponse.json();
        }

        if (sellerData) {
          console.log('✅ SellerSettings: VENDITORE TROVATO:', sellerData.display_name);
          setSeller(sellerData);
          setDisplayName(sellerData.display_name || '');
          setHandle(sellerData.handle || '');
          setBio(sellerData.bio || '');
          setAvatarUrl(sellerData.avatar_url || '');
        } else if (profile?.role === 'seller') {
          console.log('⚠️ SellerSettings: Profilo seller ma senza record sellers');
          const tempSeller = {
            id: 'temp-' + user.id,
            handle: 'temp-handle',
            display_name: profile.store_name || 'Nuovo Venditore',
            bio: 'Profilo venditore BIDLi',
            avatar_url: null
          };
          setSeller(tempSeller);
          setDisplayName(tempSeller.display_name);
          setHandle(tempSeller.handle);
          setBio(tempSeller.bio);
          setAvatarUrl(tempSeller.avatar_url || '');
        } else {
          setError("Accesso negato: solo i venditori possono modificare questo profilo.");
        }

      } catch (err) {
        console.error("Errore caricamento seller:", err);
        setError("Errore nel caricamento del profilo venditore");
      } finally {
        setLoading(false);
      }
    }

    loadSellerProfile();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Il nome del negozio è obbligatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessione scaduta. Ricarica la pagina.");
        return;
      }

      // Salva nel database locale
      const sellerData = {
        display_name: displayName.trim(),
        handle: handle.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null
      };

      const response = await fetch(`/api/sellers/${seller.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore salvataggio profilo');
      }

      console.log('✅ SellerSettings: Profilo seller salvato nel database locale');
      setSuccess("Profilo venditore aggiornato con successo!");
      
    } catch (err) {
      console.error("Error saving seller profile:", err);
      setError("Errore nel salvataggio: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento profilo venditore...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ color: "#ef4444", fontSize: 16, marginBottom: 20 }}>{error}</div>
        <button onClick={() => window.location.reload()}>Ricarica Pagina</button>
      </div>
    );
  }

  return (
    <div className="container section">
      <BackButton to="/seller-dashboard" style={{ marginBottom: '24px' }} />
      <h1>Impostazioni Venditore</h1>
      
      <form onSubmit={handleSave} style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <label>Nome Negozio *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: "100%", padding: 10, marginTop: 5 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label>Handle (opzionale)</label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="es: mio_negozio"
            style={{ width: "100%", padding: 10, marginTop: 5 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label>Descrizione</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10, marginTop: 5 }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label>URL Avatar</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 5 }}
          />
        </div>

        {success && (
          <div style={{ color: "#10b981", marginBottom: 20 }}>{success}</div>
        )}
        
        {error && (
          <div style={{ color: "#ef4444", marginBottom: 20 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            backgroundColor: saving ? "#ccc" : "#3b82f6",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: 8,
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Salvataggio..." : "Salva Modifiche"}
        </button>
      </form>
    </div>
  );
}

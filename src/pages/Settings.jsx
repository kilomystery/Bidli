// src/pages/dashboard/Settings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function DashboardSchedule() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    // leggi sessione
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session || null;
      setSession(s);
      setChecking(false);

      // se NON loggato -> apri il popup elegante
      if (!s) {
        window.dispatchEvent(new Event("auth:open"));
      }
    });

    // tieni in sync eventuale login immediato
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) {
        window.dispatchEvent(new Event("auth:open"));
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div className="container section">Verifica accesso…</div>;
  }

  if (!session) {
    // mostriamo uno stato amichevole mentre l’utente effettua il login nel popup
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h3>Accedi per continuare</h3>
        <p>La finestra di accesso è stata aperta. Se non la vedi, <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new Event("auth:open"))}>clicca qui</button>.</p>
      </div>
    );
  }

  // --- da qui in giù la pagina vera, perché l’utente è autenticato ---
  return (
    <div className="container section">
      {/* …contenuto della tua DashboardSchedule… */}
    </div>
  );
}
export default function Settings({ seller }) {
  const [displayName, setDisplayName] = useState(seller?.display_name || "");
  const [handle, setHandle] = useState(seller?.handle || "");
  const [bio, setBio] = useState(seller?.bio || "");
  const [link, setLink] = useState(seller?.link || "");
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    if (!seller) return;
    if (!displayName.trim() || !handle.trim()) {
      alert("Nome e handle sono obbligatori.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("sellers")
        .update({
          display_name: displayName.trim(),
          handle: handle.trim(),
          bio: bio.trim(),
          link: link.trim() || null,
        })
        .eq("id", seller.id);
      if (error) throw error;
      alert("Profilo aggiornato!");
    } catch (err) {
      alert("Errore: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Impostazioni profilo</h2>
      <div className="card" style={{ display:"grid", gap:10 }}>
        <label>
          Nome negozio
          <input
            type="text"
            value={displayName}
            onChange={(e)=>setDisplayName(e.target.value)}
            style={{ width:"100%", height:44, border:"1px solid #ddd", borderRadius:10, padding:"0 12px", marginTop:6 }}
          />
        </label>

        <label>
          Handle (@)
          <input
            type="text"
            value={handle}
            onChange={(e)=>setHandle(e.target.value)}
            style={{ width:"100%", height:44, border:"1px solid #ddd", borderRadius:10, padding:"0 12px", marginTop:6 }}
          />
        </label>

        <label>
          Bio
          <textarea
            rows={4}
            value={bio}
            onChange={(e)=>setBio(e.target.value)}
            style={{ width:"100%", border:"1px solid #ddd", borderRadius:10, padding:"10px 12px", marginTop:6 }}
          />
        </label>

        <label>
          Link
          <input
            type="url"
            value={link}
            onChange={(e)=>setLink(e.target.value)}
            placeholder="https://..."
            style={{ width:"100%", height:44, border:"1px solid #ddd", borderRadius:10, padding:"0 12px", marginTop:6 }}
          />
        </label>

        <div style={{ display:"flex", gap:8 }}>
          <button className="btn primary" onClick={saveProfile} disabled={saving}>
            {saving ? "Salvo…" : "Salva"}
          </button>
          <a className="btn" href={seller ? `/seller/${seller.handle}` : "/seller/me"}>Apri profilo pubblico</a>
        </div>
      </div>

      <div className="card" style={{ marginTop:12 }}>
        <div className="muted">Sicurezza & 2FA (coming soon)</div>
        <div style={{ height:100, background:"#fafafa", border:"1px dashed #ddd", borderRadius:10 }} />
      </div>
    </div>
  );
}
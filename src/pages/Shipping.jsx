// src/pages/dashboard/Shipping.jsx
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
export default function Shipping() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Spedizioni & Label</h2>
      <div className="card">
        <div className="muted">Preferenze spedizioni & generazione etichette (coming soon)</div>
        <div style={{ height:140, background:"#fafafa", border:"1px dashed #ddd", borderRadius:10 }} />
      </div>
    </div>
  );
}
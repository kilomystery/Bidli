// src/pages/dashboard/Overview.jsx
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
export default function Overview({ seller }) {
  return (
    <div>
      <div className="dash-section-title">
        <h2>Panoramica</h2>
        <div className="muted">Benvenuto, {seller?.display_name || "venditore"} 👋</div>
      </div>

      <div className="dash-metrics">
        <div className="metric">
          <h4>Ricavi ultimi 30gg</h4>
          <div className="val">€ 0,00</div>
        </div>
        <div className="metric">
          <h4>Ordini ultimi 30gg</h4>
          <div className="val">0</div>
        </div>
        <div className="metric">
          <h4>Follower</h4>
          <div className="val">{seller?.followers ?? 0}</div>
        </div>
        <div className="metric">
          <h4>Live programmate</h4>
          <div className="val">0</div>
        </div>
      </div>

      <div className="card" style={{ marginTop:12 }}>
        <div className="muted">Grafico ricavi (in arrivo)</div>
        <div style={{ height:200, background:"#fafafa", border:"1px dashed #ddd", borderRadius:12 }} />
      </div>

      <div className="card" style={{ marginTop:12 }}>
        <div className="muted">Ultimi ordini (in arrivo)</div>
        <div style={{ height:140, background:"#fafafa", border:"1px dashed #ddd", borderRadius:12 }} />
      </div>
    </div>
  );
}
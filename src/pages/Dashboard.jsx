import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";
import Footer from "../components/Footer";
import UpgradeToSeller from "../components/UpgradeToSeller";

/**
 * Dashboard Generale per ACQUIRENTI
 * Tab: Following · Promemoria · Ordini · Messaggi
 * IMPORTANTE: NO pulsanti "Vai Live" - solo per venditori
 */
export default function Dashboard() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("following");
  const [following, setFollowing] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Controlla sessione autenticazione
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session || null;
      setSession(s);
      setChecking(false);

      if (!s) {
        window.dispatchEvent(new Event("auth:open"));
        return;
      }

      // Carica dati dashboard se autenticato
      loadDashboardData(s.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) {
        window.dispatchEvent(new Event("auth:open"));
      } else {
        loadDashboardData(s.user.id);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function loadDashboardData(uid) {
    try {
      const [f1, f2, f3, f4] = await Promise.all([
        supabase.from("follows")
          .select("seller:seller_id(handle,display_name,avatar_url)")
          .eq("user_id", uid).limit(50),
        supabase.from("reminders")
          .select("live:lives(id,title,scheduled_at,status)")
          .eq("user_id", uid).limit(50),
        supabase.from("orders")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("messages")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setFollowing(f1.data || []);
      setReminders(f2.data || []);
      setOrders(f3.data || []);
      setInbox(f4.data || []);
    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    }
  }

  if (checking) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        Caricamento dashboard...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h3>Accedi per continuare</h3>
        <p>
          La finestra di accesso è stata aperta. Se non la vedi,{" "}
          <button
            className="btn btn-ghost"
            onClick={() => window.dispatchEvent(new Event("auth:open"))}
          >
            clicca qui
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="container" style={{ padding: "12px 16px 24px" }}>
        <div style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          borderRadius: 20,
          padding: 24,
          color: "white",
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(59, 130, 246, 0.3)"
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>
                Il mio spazio
              </h1>
              <p style={{ fontSize: 16, margin: "8px 0 0 0", opacity: 0.9 }}>
                Gestisci seguiti, promemoria, ordini e messaggi
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <a 
                href="/account" 
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "2px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s ease"
                }}
              >
                ⚙️ Gestisci Account
              </a>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "2px solid rgba(34, 197, 94, 0.3)",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)"
                }}
              >
                🏪 Diventa Venditore
              </button>
            </div>
          </div>
        </div>

        <nav className="seller-tabs" style={{ marginTop: 8 }}>
          {["following", "reminders", "orders", "messages"].map((k) => (
            <button
              key={k}
              className={`tab ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {k === "following"
                ? "Seguiti"
                : k === "reminders"
                ? "Promemoria"
                : k === "orders"
                ? "Ordini"
                : "Messaggi"}
            </button>
          ))}
        </nav>

        {tab === "following" && (
          <section className="cards" style={{ marginTop: 12 }}>
            {following.length ? (
              following.map((f, i) => (
                <div key={i} className="live-mini">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <img
                      src={f.seller?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${f.seller?.display_name || 'U'}`}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: 999 }}
                    />
                    <div style={{ fontWeight: 700 }}>
                      {f.seller?.display_name || "Venditore"}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <a
                      className="btn btn-ghost"
                      href={`/seller/${f.seller?.handle}`}
                    >
                      Vai al profilo
                    </a>
                    <button
                      className="btn"
                      onClick={() => alert("Notifiche attivate")}
                    >
                      🔔 Notifiche
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="meta">Non segui ancora nessuno.</div>
            )}
          </section>
        )}

        {tab === "reminders" && (
          <section className="cards" style={{ marginTop: 12 }}>
            {reminders.length ? (
              reminders.map((r, i) => (
                <div key={i} className="live-mini upcoming">
                  <div className="live-mini-title">{r.live?.title}</div>
                  <div className="live-mini-meta">
                    Programmata:{" "}
                    {new Date(r.live?.scheduled_at).toLocaleString()}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a className="btn btn-ghost" href={`/live/${r.live?.id}`}>
                      Apri live
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="meta">Nessun promemoria attivo.</div>
            )}
          </section>
        )}

        {tab === "orders" && (
          <section className="cards" style={{ marginTop: 12 }}>
            {orders.length ? (
              orders.map((o) => (
                <div key={o.id} className="live-mini">
                  <div className="live-mini-title">
                    Ordine #{o.id.slice(0, 8)}
                  </div>
                  <div className="live-mini-meta">
                    Totale: € {Number(o.total || 0).toFixed(2)} —{" "}
                    {o.status || "in lavorazione"}
                  </div>
                </div>
              ))
            ) : (
              <div className="meta">Ancora nessun ordine.</div>
            )}
          </section>
        )}

        {tab === "messages" && (
          <section className="cards" style={{ marginTop: 12 }}>
            {inbox.length ? (
              inbox.map((m) => (
                <div key={m.id} className="live-mini">
                  <div className="live-mini-title">
                    @{m.username || "tu"}
                  </div>
                  <div className="live-mini-meta">{m.text}</div>
                </div>
              ))
            ) : (
              <div className="meta">Nessun messaggio.</div>
            )}
          </section>
        )}
      </main>

      <Footer />
      
      {/* Modal Upgrade to Seller */}
      {showUpgradeModal && (
        <UpgradeToSeller onClose={() => setShowUpgradeModal(false)} />
      )}
    </>
  );
}
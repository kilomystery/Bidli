// src/pages/DashboardSchedule.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const fmtEUR = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );

export default function DashboardSchedule() {
  const [session, setSession] = useState(null);
  const [seller, setSeller] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // form
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [startPrice, setStartPrice] = useState(5);
  const [sponsored, setSponsored] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.auth.getSession();
      const sess = s?.session || null;
      setSession(sess);

      if (!sess?.user) {
        // apri il popup elegante (AuthModal) se non loggato
        window.dispatchEvent(new Event("auth:open"));
        setLoading(false);
        return;
      }

      // Controllo seller nel database locale
      try {
        const response = await fetch(`/api/sellers/user/${sess.user.id}`);
        let me = null;
        if (response.ok) {
          me = await response.json();
        }
        setSeller(me || null);
        console.log('✅ DashboardSchedule: Venditore trovato:', me?.display_name || 'Non trovato');
      } catch (error) {
        console.error('Errore caricamento seller:', error);
        setSeller(null);
      }

      // Categorie temporanee (TODO: implementare API categorie)
      const cats = [
        { id: 'fashion', label: 'Moda' },
        { id: 'electronics', label: 'Elettronica' },
        { id: 'collectibles', label: 'Collezioni' },
        { id: 'gaming', label: 'Gaming' },
        { id: 'home', label: 'Casa e Design' }
      ];
      setCategories(
        cats?.length
          ? cats
          : [
              { id: "vintage", label: "Moda Vintage" },
              { id: "retro-tech", label: "Retro-Tech" },
              { id: "pre-loved", label: "Pre-loved" },
              { id: "auto-moto", label: "Auto & Moto" },
            ]
      );

      if (me?.id) {
        await loadList(me.id);
      }
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
      if (!s) window.dispatchEvent(new Event("auth:open"));
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function loadList(sellerId) {
    const { data } = await supabase
      .from("lives")
      .select(
        "id, title, status, scheduled_at, start_price, sponsored, category:category_id(label)"
      )
      .eq("seller_id", sellerId)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });
    setItems(data || []);
  }

  function toast(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  }

  async function createScheduled(e) {
    e?.preventDefault?.();
    if (!seller) return;
    if (!title.trim()) return toast("err", "Inserisci un titolo.");
    if (!categoryId) return toast("err", "Seleziona una categoria.");
    if (!scheduledAt) return toast("err", "Scegli data/ora.");

    // Se è sponsorizzata, conferma il pagamento
    if (sponsored) {
      const confirmed = window.confirm(
        `🚀 Confermi la promozione della live per €29,90?\n\n` +
        `✅ La tua live apparirà in evidenza 24h prima\n` +
        `✅ Sezione "Live in Programma" premium\n` +
        `✅ Notifiche push agli utenti interessati\n\n` +
        `Il pagamento sarà addebitato immediatamente.`
      );
      if (!confirmed) {
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    try {
      const iso = new Date(scheduledAt).toISOString();
      
      // Crea la live
      const { data: newLive, error } = await supabase.from("lives").insert({
        seller_id: seller.id,
        title: title.trim(),
        status: "scheduled",
        scheduled_at: iso,
        category_id: categoryId,
        start_price: Number(startPrice || 0),
        viewers: 0,
        sponsored,
      }).select().single();
      
      if (error) throw error;

      // Se sponsorizzata, simula il pagamento e crea record della campagna
      if (sponsored) {
        const { error: campaignError } = await supabase.from("ad_campaigns").insert({
          seller_id: seller.id,
          name: `Promozione Live: ${title.trim()}`,
          type: 'scheduled_promotion',
          status: 'active',
          daily_budget: 29.90,
          total_budget: 29.90,
          duration_days: 1,
          start_date: new Date().toISOString(),
          end_date: iso,
          target_live_id: newLive.id
        });

        if (campaignError) console.warn("Errore creazione campagna:", campaignError);
        
        toast("ok", "🚀 Live programmata e sponsorizzata! Pagamento €29,90 elaborato ✅");
      } else {
        toast("ok", "Live programmata ✅");
      }

      setTitle("");
      setStartPrice(5);
      await loadList(seller.id);
    } catch (e2) {
      console.error(e2);
      toast("err", e2.message || "Errore.");
    } finally {
      setSaving(false);
    }
  }

  async function startNow(id) {
    try {
      await supabase.from("lives").update({ status: "live" }).eq("id", id);
      window.location.href = `/live/${id}`;
    } catch {
      toast("err", "Impossibile avviare ora.");
    }
  }

  async function cancelLive(id) {
    try {
      await supabase.from("lives").update({ status: "ended" }).eq("id", id);
      await loadList(seller.id);
    } catch {
      toast("err", "Errore nella cancellazione.");
    }
  }

  if (loading) {
    return (
      <main className="container section">
        <h1>Programma Live</h1>
        <div className="muted">Caricamento…</div>
      </main>
    );
  }

  if (!session?.user || !seller) {
    return (
      <main className="container section">
        <h1>Programma Live</h1>
        <p>Accedi e completa il profilo venditore per programmare una live.</p>
        <a className="btn btn-viola" href="/auth">Accedi</a>
      </main>
    );
  }

  return (
    <main className="container section" style={{ maxWidth: 880 }}>
      <h1 style={{ marginTop: 0 }}>Programma una live</h1>

      {msg && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            marginBottom: 12,
            border: "1px solid " + (msg.type === "ok" ? "#b7eb8f" : "#ffa39e"),
            background: msg.type === "ok" ? "#f6ffed" : "#fff1f0",
            color: msg.type === "ok" ? "#135200" : "#a8071a",
          }}
        >
          {msg.text}
        </div>
      )}

      <section className="panel">
        <form onSubmit={createScheduled} style={{ display: "grid", gap: 10 }}>
          <label>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Titolo</div>
            <input
              className="inp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Drop vintage di stasera"
              required
            />
          </label>

          <label>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Categoria</div>
            <select
              className="inp"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">— seleziona —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid2">
            <label>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Data e ora</div>
              <input
                className="inp"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Prezzo di partenza</div>
              <input
                className="inp"
                type="number"
                step="0.5"
                min="0"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
              />
            </label>
          </div>

          <div style={{
            background: sponsored ? '#fef3c7' : '#f8fafc',
            border: sponsored ? '2px solid #fbbf24' : '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 16,
            transition: 'all 0.2s ease'
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sponsored}
                onChange={(e) => setSponsored(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: 16,
                  color: sponsored ? '#92400e' : '#374151',
                  marginBottom: 4
                }}>
                  🚀 Promozione Live Programmata
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: sponsored ? '#92400e' : '#6b7280',
                  lineHeight: 1.4
                }}>
                  La tua live apparirà in evidenza 24h prima nella sezione "Live in Programma"
                </div>
                {sponsored && (
                  <div style={{
                    marginTop: 8,
                    padding: '8px 12px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#92400e'
                  }}>
                    💰 Costo: €29,90 (pagamento alla creazione)
                  </div>
                )}
              </div>
              {sponsored && (
                <div style={{
                  background: '#fbbf24',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  PREMIUM
                </div>
              )}
            </label>
          </div>

          <div>
            <button className="btn btn-viola" type="submit" disabled={saving}>
              {saving ? "Programmo…" : "Programma live"}
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Le mie prossime live</h2>
        {items.length === 0 ? (
          <div className="muted">Nessuna live programmata.</div>
        ) : (
          <div className="live-list">
            {items.map((l) => (
              <div key={l.id} className="live-row">
                <div className="badge">{new Date(l.scheduled_at).toLocaleString("it-IT")}</div>
                <div className="live-main" style={{ flex: 1 }}>
                  <div className="live-title" style={{ fontWeight: 800 }}>{l.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {l.category?.label || "—"} · Base {fmtEUR(l.start_price || 0)}
                    {l.sponsored ? " · In evidenza" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => startNow(l.id)}>
                    Avvia ora
                  </button>
                  <a className="btn btn-ghost" href={`/live/${l.id}`}>
                    Anteprima
                  </a>
                  <button className="btn btn-ghost" onClick={() => cancelLive(l.id)}>
                    Cancella
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
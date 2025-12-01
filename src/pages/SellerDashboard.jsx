// src/pages/SellerDashboard.jsx  
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import StartLiveModal from "../components/StartLiveModal";
import OrdersManagement from "../components/OrdersManagement";
import AnalyticsDashboard from "../components/AnalyticsDashboard";


/* ---------- utils ---------- */
const fmtEUR = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );

/* ---------- component ---------- */
export default function SellerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // NON PIÙ LOADING INFINITO
  const [seller, setSeller] = useState(null);
  const [showLiveModal, setShowLiveModal] = useState(false);

  const [kpi, setKpi] = useState({ revenue: 0, orders: 0, items: 0, avg: 0 });
  const [recent, setRecent] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [range, setRange] = useState("90"); // giorni
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const tabs = useMemo(
    () => [
      { id: "overview", label: isMobile ? "Home" : "Panoramica" },
      { id: "analytics", label: "Analytics" },
      { id: "orders", label: "Ordini" },
      { id: "products", label: isMobile ? "Prodotti" : "Prodotti" },
    ],
    [isMobile]
  );
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      
      // 🏢 CONTROLLO UTENTE E VENDITORE DA API LOCALE
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setSeller(null);
        setLoading(false);
        return;
      }

      // 2) CONTROLLO SELLER DA API LOCALE (STESSA LOGICA DEL HEADER)
      try {
        const [sellerResponse, profileResponse] = await Promise.all([
          fetch(`/api/sellers/user/${userId}`),
          fetch(`/api/profiles/${userId}`)
        ]);

        let sellerRow = null;
        let profile = null;

        if (sellerResponse.ok) {
          sellerRow = await sellerResponse.json();
        }
        
        if (profileResponse.ok) {
          profile = await profileResponse.json();
        }

        if (!sellerRow && profile?.role === 'seller') {
          // Utente è seller ma non ha record sellers - usa dati dal profile
          setSeller({
            id: 'temp-' + userId,
            handle: 'temp-handle',
            display_name: profile.store_name || 'Nuovo Venditore',
            avatar_url: null,
            rating: 0,
            followers: 0
          });
        } else if (!sellerRow) {
          // Non è seller, redirect a buyer dashboard
          console.log('❌ SellerDashboard: NON È SELLER, redirect buyer-dashboard');
          setSeller(null);
          setLoading(false);
          navigate('/buyer-dashboard');
          return;
        } else {
          // Seller trovato, tutto ok!
          console.log('✅ SellerDashboard: SELLER TROVATO:', sellerRow.display_name);
          setSeller(sellerRow);
        }
      } catch (error) {
        console.error('❌ SellerDashboard: Errore controllo seller:', error);
        setSeller(null);
        setLoading(false);
        navigate('/buyer-dashboard');
        return;
      }

      // 3) KPI e liste - DATI TEMPORANEI (SUPABASE VUOTO)
      console.log('🔄 SellerDashboard: Caricamento KPI e dati...');
      
      // DATI TEMPORANEI INVECE DI SUPABASE VUOTO
      const orderCount = 0; // Nuovo venditore, nessun ordine ancora
      const totalRevenue = 0;
      const itemsCount = 0;

      if (!cancelled) {
        setKpi({
          revenue: totalRevenue,
          orders: orderCount,
          items: itemsCount,
          avg: 0,
        });
        console.log('✅ SellerDashboard: KPI impostati');
      }

      // ORDINI RECENTI VUOTI (NUOVO VENDITORE)
      if (!cancelled) setRecent([]);
      console.log('✅ SellerDashboard: Ordini recenti impostati');

      // TOP PRODOTTI VUOTI (NUOVO VENDITORE)
      const top = []; // Nuovo venditore, nessun prodotto venduto ancora
      
      if (!cancelled) {
        setTopProducts(top);
        console.log('✅ SellerDashboard: Top prodotti impostati');
      }
      
      console.log('🎉 SellerDashboard: CARICAMENTO COMPLETATO!');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  function onLiveSuccess(session) {
    // Reindirizza al dashboard live
    navigate(`/dashboard/live-auction/${session.id}`);
  }

  // DEBUGGING: mostra sempre qualcosa
  if (loading) {
    return (
      <main className="container section">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Caricamento Dashboard Venditori...</div>
            <div style={{ color: '#40e0d0', textShadow: '0 0 10px rgba(64, 224, 208, 0.5)' }}>Preparazione del tuo ecosistema vendite</div>
          </div>
        </div>
      </main>
    );
  }
  
  if (!seller) {
    return (
      <main className="container section">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h1>🚀 Dashboard Venditori</h1>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '24px' }}>
            Completa il setup del tuo account venditore per accedere alle funzionalità complete.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Torna alla Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      {/* MODERN HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 20,
          padding: 24,
          color: "white",
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)"
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)"
          }}>
            <img
              src={
                seller?.avatar_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  seller?.display_name || seller?.handle || "V"
                )}`
              }
              alt={seller?.display_name || seller?.handle || "seller"}
              style={{ width: 48, height: 48, borderRadius: 16 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
              Dashboard
            </h1>
            <div style={{ fontSize: 16, opacity: 0.9, marginTop: 4 }}>
              Ciao, {seller?.display_name || seller?.handle} 👋
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8, display: "flex", gap: 16 }}>
              <span>⭐ {seller?.rating || "—"} rating</span>
              <span>👥 {seller?.followers ?? 0} follower</span>
            </div>
          </div>
        </div>
        
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? "16px" : "0"
        }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Periodo di analisi</div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.15)",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                backdropFilter: "blur(10px)",
                outline: "none",
                width: isMobile ? "100%" : "auto"
              }}
            >
              <option value="7" style={{color: "#ffffff", background: "#0f172a"}}>Ultimi 7 giorni</option>
              <option value="30" style={{color: "#ffffff", background: "#0f172a"}}>Ultimi 30 giorni</option>
              <option value="90" style={{color: "#ffffff", background: "#0f172a"}}>Ultimi 90 giorni</option>
              <option value="365" style={{color: "#ffffff", background: "#0f172a"}}>Ultimi 12 mesi</option>
            </select>
          </div>
          
          <div style={{ 
            display: "flex", 
            gap: isMobile ? 8 : 12, 
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: isMobile ? "center" : "flex-end"
          }}>
            {/* Menu Navigazione Veloce */}
            <a 
              href="/seller/analytics" 
              style={{
                padding: isMobile ? "10px 12px" : "12px 16px",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                textDecoration: 'none',
                backdropFilter: "blur(10px)",
                flex: isMobile ? "1" : "none",
                textAlign: "center",
                minWidth: isMobile ? "120px" : "auto"
              }}
            >
              📊 Analytics
            </a>
            <a 
              href="/seller/shipping" 
              style={{
                padding: isMobile ? "10px 12px" : "12px 16px",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                textDecoration: 'none',
                backdropFilter: "blur(10px)",
                flex: isMobile ? "1" : "none",
                textAlign: "center",
                minWidth: isMobile ? "120px" : "auto"
              }}
            >
              📦 Ordini
            </a>
            
            {/* Live Button */}
            <button
              onClick={() => setShowLiveModal(true)}
              style={{
                padding: isMobile ? "12px 16px" : "16px 24px",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.3)",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: "white",
                fontSize: isMobile ? 14 : 16,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.3)",
                transition: "all 0.3s ease",
                flex: isMobile ? "1" : "none",
                justifyContent: "center",
                minWidth: isMobile ? "120px" : "auto"
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.3)";
              }}
            >
              🔴 Vai Live
            </button>
            
            <div style={{
              textAlign: "center",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "12px 16px",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmtEUR(kpi.revenue)}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Fatturato</div>
            </div>
            <div style={{
              textAlign: "center",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "12px 16px",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{kpi.orders}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Ordini</div>
            </div>
          </div>
        </div>
      </div>

      {/* MODERN TABS */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        background: "#f8f9ff",
        borderRadius: 16,
        padding: 6
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: isMobile ? "10px 8px" : "12px 20px",
              borderRadius: 12,
              border: "none",
              background: t.id === tab 
                ? "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)"
                : "transparent",
              color: t.id === tab ? "#ffffff" : "#40e0d0",
              fontSize: isMobile ? 12 : 14,
              fontWeight: t.id === tab ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: t.id === tab ? "0 4px 12px rgba(110, 58, 255, 0.3)" : "none",
              minWidth: 0, // 🎯 Permette shrinking su mobile
              textAlign: "center"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="section">Caricamento…</div>
      ) : tab === "overview" ? (
        <>
          {/* MODERN KPI CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 16,
              padding: 20,
              color: "white",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>💰 Entrate</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{fmtEUR(kpi.revenue)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Fatturato totale periodo</div>
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)"
              }} />
            </div>
            
            <div style={{
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              borderRadius: 16,
              padding: 20,
              color: "white",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>📦 Ordini</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{kpi.orders}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Ordini completati</div>
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)"
              }} />
            </div>
            
            <div style={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              borderRadius: 16,
              padding: 20,
              color: "white",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>🛍️ Articoli</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{kpi.items}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Articoli venduti</div>
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)"
              }} />
            </div>
            
            <div style={{
              background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
              borderRadius: 16,
              padding: 20,
              color: "white",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>📊 Medio</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{fmtEUR(kpi.avg)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Scontrino medio</div>
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)"
              }} />
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            
            {/* Centro Gestionale Ordini */}
            <div
              style={{
                background: "linear-gradient(135deg, #4ade80 0%, #16a34a 100%)",
                borderRadius: 12,
                padding: 16,
                color: "white",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 600 }}>
                📦 Gestione Ordini
              </h3>
              <p style={{ margin: "0 0 12px 0", fontSize: 14, opacity: 0.9 }}>
                Live terminate, spedizioni e tracking
              </p>
              <a
                href="/orders/center"
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Centro Ordini →
              </a>
            </div>
          </div>

          {/* TOP PRODUCTS */}
          <section className="section alt" style={{ borderRadius: 16 }}>
            <h2>Top prodotti</h2>
            {topProducts.length === 0 ? (
              <p style={{ margin: "8px 0 0 0", color: "#666" }}>
                Nessun prodotto venduto nel periodo selezionato.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                {topProducts.map((p) => (
                  <div
                    key={p.rank + p.title}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 14,
                      background: "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          minWidth: 26,
                          height: 26,
                          borderRadius: 8,
                          background: "#f2f0ff",
                          color: "#6e3aff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {p.rank}
                      </span>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                        {p.title}
                      </div>
                    </div>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        style={{
                          width: "100%",
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid #eee",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: 120,
                          borderRadius: 10,
                          border: "1px dashed #ddd",
                          display: "grid",
                          placeItems: "center",
                          color: "#aaa",
                          fontSize: 13,
                        }}
                      >
                        Nessuna immagine
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "#444",
                      }}
                    >
                      <span>Qtà: <b>{p.qty}</b></span>
                      <span>Entrate: <b>{fmtEUR(p.revenue)}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* RECENT ORDERS */}
          <section className="section" style={{ paddingTop: 10 }}>
            <h2>Ordini recenti</h2>
            {recent.length === 0 ? (
              <p style={{ margin: "8px 0 0 0", color: "#666" }}>
                Nessun ordine recente.
              </p>
            ) : (
              <div
                style={{
                  width: "100%",
                  overflowX: "auto",
                  border: "1px solid #eee",
                  borderRadius: 14,
                  background: "#fff",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <Th>ID</Th>
                      <Th>Data</Th>
                      <Th>Totale</Th>
                      <Th>Stato</Th>
                      <Th>Destinatario</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id} style={{ borderTop: "1px solid #f1f1f1" }}>
                        <Td>
                          <code>{o.id.slice(0, 8)}…</code>
                        </Td>
                        <Td>
                          {new Date(o.created_at).toLocaleString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Td>
                        <Td>{fmtEUR(o.amount_total)}</Td>
                        <Td>
                          <StatusPill status={o.status} />
                        </Td>
                        <Td>
                          {typeof o.shipping_address === "object"
                            ? o.shipping_address?.name || o.shipping_address?.city || "—"
                            : o.shipping_address || "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : tab === "analytics" ? (
        <AnalyticsDashboard sellerId={seller?.id} />
      ) : tab === "orders" ? (
        <OrdersManagement sellerId={seller?.id} />
      ) : (
        <ProductsTab sellerId={seller?.id} />
      )}
      
      {/* Start Live Modal */}
      <StartLiveModal 
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        onSuccess={onLiveSuccess}
      />
    </main>
  );
}

/* ---------- UI helpers ---------- */

function KpiCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 14,
        background: "#fff",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    paid: { bg: "#e6faf0", fg: "#0f9154", label: "Pagato" },
    shipped: { bg: "#f0f7ff", fg: "#1262d6", label: "Spedito" },
    completed: { bg: "#f2f0ff", fg: "#6e3aff", label: "Completato" },
    cancelled: { bg: "#fff1f0", fg: "#cf1322", label: "Annullato" },
    pending: { bg: "#fff7e6", fg: "#d46b08", label: "In attesa" },
  };
  const s = map[status] || { bg: "#f7f7f7", fg: "#555", label: status || "—" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        fontSize: 12,
        color: "#666",
        borderBottom: "1px solid #eee",
        position: "sticky",
        top: 0,
      }}
    >
      {children}
    </th>
  );
}
function Td({ children }) {
  return <td style={{ padding: "12px", fontSize: 14 }}>{children}</td>;
}

/* ---------- Tabs extra ---------- */

function OrdersTab({ sellerId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("orders")
        .select("id, created_at, amount_total, status, shipping_address")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (status !== "all") q = q.eq("status", status);
      const { data } = await q;
      if (!cancelled) {
        setOrders(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, status]);

  if (loading) return <div>Caricamento ordini…</div>;

  return (
    <>
      <div style={{ marginBottom: 10 }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #e5e5e5",
            background: "#fff",
          }}
        >
          <option value="all">Tutti gli stati</option>
          <option value="paid">Pagato</option>
          <option value="shipped">Spedito</option>
          <option value="completed">Completato</option>
          <option value="pending">In attesa</option>
          <option value="cancelled">Annullato</option>
        </select>
      </div>
      {orders.length === 0 ? (
        <p style={{ color: "#666" }}>Nessun ordine.</p>
      ) : (
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            border: "1px solid #eee",
            borderRadius: 14,
            background: "#fff",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "separate" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <Th>ID</Th>
                <Th>Data</Th>
                <Th>Totale</Th>
                <Th>Stato</Th>
                <Th>Indirizzo</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <code>{o.id.slice(0, 8)}…</code>
                  </Td>
                  <Td>
                    {new Date(o.created_at).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Td>
                  <Td>{fmtEUR(o.amount_total)}</Td>
                  <Td>
                    <StatusPill status={o.status} />
                  </Td>
                  <Td>
                    {typeof o.shipping_address === "object"
                      ? o.shipping_address?.address ||
                        o.shipping_address?.city ||
                        "—"
                      : o.shipping_address || "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ProductsTab({ sellerId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: view } = await supabase
        .from("seller_top_products")
        .select("product_title, product_image, qty_sold, revenue")
        .eq("seller_id", sellerId)
        .order("revenue", { ascending: false });

      if (view?.length) {
        if (!cancelled)
          setRows(
            view.map((r, i) => ({
              rank: i + 1,
              title: r.product_title || "Prodotto",
              image: r.product_image,
              qty: r.qty_sold || 0,
              revenue: r.revenue || 0,
            }))
          );
        setLoading(false);
        return;
      }

      const { data: oi } = await supabase
        .from("order_items")
        .select("product_title, product_image, qty, line_total")
        .eq("seller_id", sellerId);

      const map = new Map();
      (oi || []).forEach((r) => {
        const key = r.product_title || "Prodotto";
        const prev = map.get(key) || { title: key, image: r.product_image, qty: 0, revenue: 0 };
        prev.qty += Number(r.qty || 0);
        prev.revenue += Number(r.line_total || 0);
        if (!prev.image && r.product_image) prev.image = r.product_image;
        map.set(key, prev);
      });
      const list = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
      if (!cancelled) setRows(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  if (loading) return <div>Caricamento prodotti…</div>;
  if (rows.length === 0) return <p style={{ color: "#666" }}>Nessun dato prodotto.</p>;

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid #eee",
        borderRadius: 14,
        background: "#fff",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "separate" }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <Th>#</Th>
            <Th>Prodotto</Th>
            <Th>Qtà venduta</Th>
            <Th>Entrate</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.title + i}>
              <Td>{p.rank || i + 1}</Td>
              <Td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.title}
                      style={{
                        width: 42,
                        height: 42,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: "1px solid #eee",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 8,
                        border: "1px dashed #ddd",
                      }}
                    />
                  )}
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                </div>
              </Td>
              <Td>{p.qty}</Td>
              <Td>{fmtEUR(p.revenue)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
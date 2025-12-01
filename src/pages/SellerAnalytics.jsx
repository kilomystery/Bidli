// src/pages/SellerAnalytics.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SellerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [trending, setTrending] = useState([]);
  const [period, setPeriod] = useState("30"); // giorni
  const [automationLog, setAutomationLog] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        
        if (!uid) {
          setLoading(false);
          return;
        }

        // Get seller data
        const { data: sellerData } = await supabase
          .from("sellers")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle();

        if (!sellerData) {
          setLoading(false);
          return;
        }

        setSeller(sellerData);

        // Load daily stats usando stored procedure
        const { data: dailyData, error: dailyError } = await supabase
          .rpc('calculate_daily_seller_stats', {
            seller_uuid: sellerData.id,
            target_date: new Date().toISOString().split('T')[0]
          });

        if (dailyError) {
          console.error("Error loading daily stats:", dailyError);
        } else {
          setDailyStats(dailyData[0]);
        }

        // Load sales report
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        
        const { data: reportData, error: reportError } = await supabase
          .rpc('generate_sales_report', {
            seller_uuid: sellerData.id,
            start_date: startDate.toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          });

        if (reportError) {
          console.error("Error loading sales report:", reportError);
        } else {
          setSalesReport(reportData[0]);
        }

        // Load trending sellers
        const { data: trendingData, error: trendingError } = await supabase
          .rpc('get_trending_sellers', { days_back: 7 });

        if (trendingError) {
          console.error("Error loading trending:", trendingError);
        } else {
          setTrending(trendingData || []);
        }

      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [period]);

  async function runAutomation() {
    try {
      const { data, error } = await supabase
        .rpc('run_daily_automations');

      if (error) {
        console.error("Automation error:", error);
        setAutomationLog("Errore nell'esecuzione automazioni: " + error.message);
      } else {
        setAutomationLog(data);
      }
    } catch (err) {
      console.error("Error running automation:", err);
      setAutomationLog("Errore: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento analytics...</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <h2>Accesso negato</h2>
        <p>Devi essere un venditore registrato per accedere agli analytics.</p>
        <a href="/dashboard/settings" style={{ color: "#667eea", textDecoration: "underline" }}>
          Registrati come venditore
        </a>
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* MODERN HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 20,
        padding: 32,
        color: "white",
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32
          }}>
            📊
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              Analytics Avanzati
            </h1>
            <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
              Analisi dettagliate delle performance e automazioni intelligenti
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              <option value="7">7 giorni</option>
              <option value="30">30 giorni</option>
              <option value="90">90 giorni</option>
            </select>
            <button
              onClick={runAutomation}
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              🤖 Esegui Automazioni
            </button>
          </div>
        </div>
      </div>

      {/* DAILY STATS */}
      {dailyStats && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            📈 Performance Oggi
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <div style={{ textAlign: "center", padding: 16, background: "#f8f9ff", borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#667eea", marginBottom: 8 }}>
                {dailyStats.views_count}
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>Visualizzazioni</div>
            </div>
            
            <div style={{ textAlign: "center", padding: 16, background: "#f0fdf4", borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#00b894", marginBottom: 8 }}>
                {dailyStats.sales_count}
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>Vendite</div>
            </div>
            
            <div style={{ textAlign: "center", padding: 16, background: "#fffbeb", borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>
                €{dailyStats.revenue_total}
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>Ricavi</div>
            </div>
            
            <div style={{ textAlign: "center", padding: 16, background: "#fef2f2", borderRadius: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
                {dailyStats.conversion_rate}%
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>Tasso Conversione</div>
            </div>
          </div>
        </div>
      )}

      {/* SALES REPORT */}
      {salesReport && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          marginBottom: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            💰 Report Vendite - Ultimi {period} giorni
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: 16,
              color: "white"
            }}>
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Ricavi Totali</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>€{salesReport.period_revenue}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                Crescita: {salesReport.growth_percentage > 0 ? '+' : ''}{salesReport.growth_percentage}%
              </div>
            </div>
            
            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
              borderRadius: 16,
              color: "white"
            }}>
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Vendite Totali</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{salesReport.period_sales}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                Ordini processati
              </div>
            </div>
            
            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              borderRadius: 16,
              color: "white"
            }}>
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Valore Medio Ordine</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>€{salesReport.average_order_value}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                Per transazione
              </div>
            </div>
            
            <div style={{
              padding: 20,
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              borderRadius: 16,
              color: "white"
            }}>
              <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Giorno Top</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {salesReport.top_selling_day ? new Date(salesReport.top_selling_day).toLocaleDateString('it-IT') : 'N/A'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                Migliore performance
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRENDING SELLERS */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            🔥 Venditori in Tendenza
          </h3>
          
          {trending.length === 0 ? (
            <div style={{ textAlign: "center", padding: 20, color: "#718096" }}>
              Nessun dato trending disponibile
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {trending.slice(0, 5).map((seller, index) => (
                <div key={seller.seller_id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 16,
                  background: index === 0 ? "#fff7ed" : "#fafafa",
                  borderRadius: 12,
                  border: index === 0 ? "2px solid #fb923c" : "1px solid #e5e7eb"
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, hsl(${index * 60}, 70%, 60%), hsl(${index * 60 + 30}, 70%, 50%))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 16
                  }}>
                    #{index + 1}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#2d3748", marginBottom: 4 }}>
                      {seller.seller_name}
                    </div>
                    <div style={{ fontSize: 14, color: "#718096" }}>
                      €{seller.total_revenue} • {seller.total_sales} vendite
                    </div>
                  </div>
                  
                  <div style={{
                    padding: "4px 12px",
                    borderRadius: 16,
                    background: seller.growth_rate > 0 ? "#dcfce7" : "#fee2e2",
                    color: seller.growth_rate > 0 ? "#166534" : "#dc2626",
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {seller.growth_rate > 0 ? '+' : ''}{parseFloat(seller.growth_rate).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AUTOMATION LOG */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            🤖 Log Automazioni
          </h3>
          
          {automationLog ? (
            <div style={{
              background: "#1a1a1a",
              color: "#00ff00",
              padding: 16,
              borderRadius: 12,
              fontFamily: "monospace",
              fontSize: 12,
              lineHeight: 1.5,
              height: 300,
              overflow: "auto",
              whiteSpace: "pre-wrap"
            }}>
              {automationLog}
            </div>
          ) : (
            <div style={{
              textAlign: "center",
              padding: 40,
              color: "#718096",
              background: "#fafafa",
              borderRadius: 12
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Automazioni Pronte</div>
              <div style={{ fontSize: 14 }}>
                Clicca "Esegui Automazioni" per ottimizzare le campagne
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
          ⚡ Azioni Rapide
        </h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <a
            href="/seller/ads"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              textDecoration: "none",
              borderRadius: 12,
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 24 }}>📢</span>
            Gestisci Pubblicità
          </a>
          
          <a
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
              color: "white",
              textDecoration: "none",
              borderRadius: 12,
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 24 }}>🏠</span>
            Dashboard Venditore
          </a>
          
          <a
            href="/sell"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              textDecoration: "none",
              borderRadius: 12,
              fontWeight: 600,
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 24 }}>📺</span>
            Studio Live
          </a>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 16,
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <span style={{ fontSize: 24 }}>🔄</span>
            Aggiorna Dati
          </button>
        </div>
      </div>
    </div>
  );
}
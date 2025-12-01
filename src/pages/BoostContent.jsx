// src/pages/BoostContent.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function BoostContent() {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [boostType, setBoostType] = useState("live_stream");
  const [bidAmount, setBidAmount] = useState("5.00");
  const [boostDuration, setBoostDuration] = useState("1");
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [feedPreview, setFeedPreview] = useState([]);
  const [message, setMessage] = useState("");
  const [spamCheck, setSpamCheck] = useState(null);

  useEffect(() => {
    async function loadBoostData() {
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

        // Load active campaigns
        const { data: campaigns } = await supabase
          .from("ad_campaigns")
          .select("*")
          .eq("seller_id", sellerData.id)
          .eq("status", "active")
          .in("content_type", ["post", "profile", "live_stream"])
          .order("created_at", { ascending: false });

        setActiveCampaigns(campaigns || []);

        // Load feed preview (simulato)
        setFeedPreview([
          { content_type: "live_stream", content_id: "1", score: 2500.5, is_sponsored: true, position_in_feed: 1 },
          { content_type: "post", content_id: "2", score: 1800.2, is_sponsored: false, position_in_feed: 2 },
          { content_type: "live_stream", content_id: "3", score: 1650.8, is_sponsored: true, position_in_feed: 3 },
          { content_type: "profile", content_id: "4", score: 980.1, is_sponsored: false, position_in_feed: 4 },
          { content_type: "post", content_id: "5", score: 750.3, is_sponsored: false, position_in_feed: 5 },
          { content_type: "product", content_id: "6", score: 450.7, is_sponsored: false, position_in_feed: 6 },
          { content_type: "live_stream", content_id: "7", score: 380.9, is_sponsored: false, position_in_feed: 7 },
          { content_type: "post", content_id: "8", score: 280.4, is_sponsored: true, position_in_feed: 8 }
        ]);

      } catch (err) {
        console.error("Error loading boost data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBoostData();
  }, []);

  // Rimossa - feed simulato direttamente nel loadBoostData

  async function checkSpamPrevention() {
    if (!seller) return;

    // Simula spam check basato su logica business
    const recentCampaigns = activeCampaigns.filter(c => 
      c.content_type === boostType && 
      new Date(c.created_at) > new Date(Date.now() - getCooldownMs(boostType))
    );

    const limits = {
      live_stream: { max: 3, cooldown: "30 minuti" },
      post: { max: 5, cooldown: "2 ore" },
      profile: { max: 1, cooldown: "24 ore" }
    };

    const limit = limits[boostType] || { max: 2, cooldown: "1 ora" };
    
    if (recentCampaigns.length >= limit.max) {
      setSpamCheck({
        allowed: false,
        reason: `Troppi boost ${boostType} recenti - max ${limit.max} ogni ${limit.cooldown}`,
        cooldown_remaining: null
      });
    } else {
      setSpamCheck({
        allowed: true,
        reason: "Boost consentito",
        cooldown_remaining: null
      });
    }
  }

  function getCooldownMs(type) {
    switch (type) {
      case "live_stream": return 30 * 60 * 1000; // 30 min
      case "post": return 2 * 60 * 60 * 1000; // 2 ore
      case "profile": return 24 * 60 * 60 * 1000; // 24 ore
      default: return 60 * 60 * 1000; // 1 ora
    }
  }

  useEffect(() => {
    if (seller) {
      checkSpamPrevention();
    }
  }, [boostType, seller]);

  async function createBoostCampaign(e) {
    e.preventDefault();

    if (!seller) {
      setMessage("Devi essere un venditore per creare campagne boost");
      return;
    }

    if (spamCheck && !spamCheck.allowed) {
      setMessage("Boost non consentito: " + spamCheck.reason);
      return;
    }

    try {
      const dailyBudget = parseFloat(bidAmount) * 24; // €/ora * 24 ore
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + parseInt(boostDuration));

      const { data, error } = await supabase
        .from("ad_campaigns")
        .insert({
          seller_id: seller.id,
          name: `Boost ${boostType} - ${new Date().toLocaleDateString()}`,
          content_type: boostType,
          target_content_id: crypto.randomUUID(), // In produzione: ID reale del contenuto
          bid_amount: parseFloat(bidAmount),
          daily_budget: dailyBudget,
          boost_multiplier: calculateBoostMultiplier(parseFloat(bidAmount)),
          end_date: endDate.toISOString(),
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      setMessage("Boost attivato con successo! 🚀");
      setActiveCampaigns([data, ...activeCampaigns]);
      
      // Reset form
      setBidAmount("5.00");
      setBoostDuration("1");
      
      setTimeout(() => setMessage(""), 3000);
      
    } catch (err) {
      setMessage("Errore nell'attivazione boost: " + err.message);
    }
  }

  function calculateBoostMultiplier(bidAmount) {
    // Moltiplicatori fissi basati sui prezzi
    if (bidAmount >= 19.99) return 10; // €19.99 = x10 boost
    if (bidAmount >= 14.99) return 5; // €14.99 = x5 boost  
    if (bidAmount >= 9.99) return 2; // €9.99 = x2 boost
    return 1; // Nessun boost
  }

  async function pauseCampaign(campaignId) {
    try {
      const { error } = await supabase
        .from("ad_campaigns")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (error) throw error;

      setActiveCampaigns(campaigns => 
        campaigns.map(c => 
          c.id === campaignId ? { ...c, status: "paused" } : c
        )
      );
      
      setMessage("Campagna messa in pausa");
      setTimeout(() => setMessage(""), 3000);
      
    } catch (err) {
      setMessage("Errore: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento sistema boost...</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <h2>Accesso negato</h2>
        <p>Devi essere un venditore registrato per utilizzare il sistema boost.</p>
        <a href="/dashboard/settings" style={{ color: "#667eea", textDecoration: "underline" }}>
          Registrati come venditore
        </a>
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)",
        borderRadius: 20,
        padding: 32,
        color: "white",
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(110, 58, 255, 0.3)"
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
            🚀
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              Boost BIDLi
            </h1>
            <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
              Sponsorizza Post, Profili e Live per apparire in cima al feed
            </p>
          </div>
          <div style={{
            padding: "12px 24px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 12,
            textAlign: "center"
          }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{activeCampaigns.length}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Campagne Attive</div>
          </div>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div style={{
          background: message.includes("Errore") ? "#fee2e2" : "#dcfce7",
          color: message.includes("Errore") ? "#dc2626" : "#166534",
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          fontWeight: 600,
          border: `2px solid ${message.includes("Errore") ? "#fca5a5" : "#86efac"}`
        }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* CREATE BOOST CAMPAIGN */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            🎯 Crea Nuovo Boost
          </h3>

          <form onSubmit={createBoostCampaign}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 12, color: "#2d3748" }}>
                Tipo di Contenuto da Boostare
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { value: "live_stream", label: "📺 Live", desc: "Priorità massima" },
                  { value: "post", label: "📝 Post", desc: "Priorità alta" },
                  { value: "profile", label: "👤 Profilo", desc: "Priorità media" }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setBoostType(type.value)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: boostType === type.value ? "2px solid #6e3aff" : "2px solid #e2e8f0",
                      background: boostType === type.value ? "#f0f4ff" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>{type.label}</div>
                    <div style={{ fontSize: 12, color: "#718096" }}>{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SPAM CHECK NOTIFICATION */}
            {spamCheck && !spamCheck.allowed && (
              <div style={{
                background: "#fee2e2",
                color: "#dc2626",
                padding: 16,
                borderRadius: 12,
                marginBottom: 20,
                border: "2px solid #fca5a5"
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>❌ Boost Non Consentito</div>
                <div style={{ fontSize: 14 }}>{spamCheck.reason}</div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                  Offerta (€/ora)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="1.00"
                  max="50.00"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "2px solid #e2e8f0",
                    fontSize: 16,
                    outline: "none"
                  }}
                  required
                />
                <div style={{ fontSize: 12, color: "#718096", marginTop: 4 }}>
                  Moltiplicatore boost: {calculateBoostMultiplier(parseFloat(bidAmount))}x
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                  Durata (ore)
                </label>
                <select
                  value={boostDuration}
                  onChange={(e) => setBoostDuration(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "2px solid #e2e8f0",
                    fontSize: 16,
                    outline: "none"
                  }}
                  required
                >
                  <option value="1">1 ora</option>
                  <option value="3">3 ore</option>
                  <option value="6">6 ore</option>
                  <option value="12">12 ore</option>
                  <option value="24">24 ore</option>
                </select>
              </div>
            </div>

            <div style={{
              background: "#f8f9ff",
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
              border: "2px solid #e0e7ff"
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                💰 Stima Costi
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>
                • Costo orario: €{bidAmount}
                <br />
                • Durata: {boostDuration} ore
                <br />
                • <strong>Totale stimato: €{(parseFloat(bidAmount) * parseInt(boostDuration)).toFixed(2)}</strong>
              </div>
            </div>

            <button
              type="submit"
              disabled={spamCheck && !spamCheck.allowed}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                border: "none",
                background: (spamCheck && !spamCheck.allowed) ? 
                  "#9ca3af" : "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)",
                color: "white",
                fontWeight: 700,
                fontSize: 16,
                cursor: (spamCheck && !spamCheck.allowed) ? "not-allowed" : "pointer",
                opacity: (spamCheck && !spamCheck.allowed) ? 0.6 : 1
              }}
            >
              🚀 Attiva Boost
            </button>
          </form>
        </div>

        {/* FEED PREVIEW */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            📱 Anteprima Feed TikTok
          </h3>
          
          <div style={{ display: "grid", gap: 12, maxHeight: 400, overflow: "auto" }}>
            {feedPreview.map((item, index) => (
              <div key={index} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                background: item.is_sponsored ? "#fff7ed" : "#fafafa",
                borderRadius: 8,
                border: item.is_sponsored ? "2px solid #fb923c" : "1px solid #e5e7eb"
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: getContentColor(item.content_type),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 16
                }}>
                  {getContentIcon(item.content_type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {getContentTypeLabel(item.content_type)}
                    {item.is_sponsored && " 🚀"}
                  </div>
                  <div style={{ fontSize: 12, color: "#718096" }}>
                    Score: {parseFloat(item.score).toFixed(1)} • Posizione #{item.position_in_feed}
                  </div>
                </div>
                
                {item.is_sponsored && (
                  <div style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "#fb923c",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 600
                  }}>
                    SPONSORED
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ACTIVE CAMPAIGNS */}
      {activeCampaigns.length > 0 && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          marginTop: 32,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0"
        }}>
          <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            ⚡ Campagne Boost Attive
          </h3>
          
          <div style={{ display: "grid", gap: 16 }}>
            {activeCampaigns.map((campaign) => (
              <div key={campaign.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: 16,
                background: "#f8f9ff",
                borderRadius: 12,
                border: "2px solid #e0e7ff"
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: getContentColor(campaign.content_type),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 20
                }}>
                  {getContentIcon(campaign.content_type)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {campaign.name}
                  </div>
                  <div style={{ fontSize: 14, color: "#718096" }}>
                    €{campaign.bid_amount}/ora • Boost {campaign.boost_multiplier}x • 
                    Budget: €{campaign.daily_budget}
                  </div>
                </div>
                
                <div style={{
                  padding: "8px 16px",
                  background: "#dcfce7",
                  color: "#166534",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  ATTIVA
                </div>
                
                <button
                  onClick={() => pauseCampaign(campaign.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#ef4444",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Pausa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getContentIcon(type) {
  switch (type) {
    case "live_stream": return "📺";
    case "post": return "📝";
    case "profile": return "👤";
    default: return "📦";
  }
}

function getContentColor(type) {
  switch (type) {
    case "live_stream": return "#ef4444";
    case "post": return "#6e3aff";
    case "profile": return "#00b894";
    default: return "#718096";
  }
}

function getContentTypeLabel(type) {
  switch (type) {
    case "live_stream": return "Live Stream";
    case "post": return "Post";
    case "profile": return "Profilo";
    default: return "Prodotto";
  }
}
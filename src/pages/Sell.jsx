// src/pages/Sell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getCategoryNumericId } from '../constants/categories';
import BackButton from '../components/BackButton';

const fmtEUR = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );

const statusLabel = {
  draft: "Bozza",
  scheduled: "Programmato",
  live: "In diretta",
  ended: "Terminato",
};

export default function Sell() {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [categories, setCategories] = useState([]);

  // form: vai live OR programma
  const [tab, setTab] = useState("now"); // now | schedule

  const [titleNow, setTitleNow] = useState("");
  const [categoryNow, setCategoryNow] = useState(null);
  const [startPriceNow, setStartPriceNow] = useState(5);
  const [sponsoredNow, setSponsoredNow] = useState(false);
  const [boostNow, setBoostNow] = useState(null); // null, 2, 5, 10

  const [titleSch, setTitleSch] = useState("");
  const [categorySch, setCategorySch] = useState(null);
  const [startPriceSch, setStartPriceSch] = useState(5);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm (local)
  });
  const [sponsoredSch, setSponsoredSch] = useState(false);
  const [boostSch, setBoostSch] = useState(null); // null, 2, 5, 10

  // elenco live del venditore
  const [myLives, setMyLives] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Stati per gestione prodotti
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState(null);
  const [newProduct, setNewProduct] = useState({
    title: '',
    startPrice: '',
    imageUrl: ''
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [lots, setLots] = useState({});
  const [draggedProductId, setDraggedProductId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // USA SOLO DATABASE REALE - NO LOCALSTORAGE FORZATO

      setLoading(true);
      // 1) utente → seller (USA DATABASE LOCALE)
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setMsg({ type: "err", text: "Accedi per creare o gestire le live." });
        setLoading(false);
        return;
      }
      
      // 🎯 CONTROLLO VENDITORE CON SISTEMA UNIFICATO
      const { unifiedDetectRole } = await import('../lib/globalRole.js');
      const userRole = await unifiedDetectRole(uid, auth.session?.access_token);
      
      console.log('✅ Sell.jsx: UNIFIED ROLE DETECTED:', userRole);
      
      if (userRole !== 'seller') {
        setMsg({
          type: "err",
          text: "Completa il profilo venditore prima (vai su /dashboard/settings).",
        });
        setLoading(false);
        return;
      }

      // Carica/crea seller data
      let currentSeller = null;
      
      try {
        const sellerResponse = await fetch(`/api/sellers/user/${uid}`);
        
        if (sellerResponse.ok) {
          const sellerData = await sellerResponse.json();
          console.log('✅ Sell.jsx: VENDITORE TROVATO:', sellerData.display_name);
          setSeller(sellerData);
          currentSeller = sellerData;
        } else {
          // Auto-crea seller se ruolo confermato ma record mancante
          console.log('⚠️ Sell.jsx: Creazione automatica seller...');
          
          const profileResponse = await fetch(`/api/profiles/${uid}`);
          const profile = profileResponse.ok ? await profileResponse.json() : {};
          
          const createResponse = await fetch('/api/sellers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.session?.access_token}`
            },
            body: JSON.stringify({
              user_id: uid,
              handle: 'seller_bidli',
              display_name: profile.store_name || 'Venditore BIDLi',
              bio: 'Venditore verificato su BIDLi'
            })
          });
          
          if (createResponse.ok) {
            const newSeller = await createResponse.json();
            console.log('✅ Sell.jsx: SELLER CREATO:', newSeller.display_name);
            setSeller(newSeller);
            currentSeller = newSeller;
          } else {
            setMsg({
              type: "err",
              text: "Errore creazione profilo venditore.",
            });
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Errore gestione seller:', error);
        setMsg({
          type: "err",
          text: "Errore caricamento profilo venditore.",
        });
        setLoading(false);
        return;
      }
      if (cancelled) return;

      // 2) categorie (fallback se la tabella è vuota)
      console.log('🔄 Sell.jsx: Caricamento categorie...');
      await loadCategories();
      console.log('✅ Sell.jsx: Categorie caricate');

      // 3) live mie - USA CURRENTseller.ID CORRETTO
      console.log('🔄 Sell.jsx: Caricamento live per seller ID:', currentSeller?.id);
      if (currentSeller?.id) {
        await refreshLives(currentSeller.id);
        console.log('✅ Sell.jsx: Live caricate');
      }

      console.log('✅ Sell.jsx: COMPLETATO CARICAMENTO');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Funzione per caricare categorie
  const loadCategories = async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, label")
      .order("label", { ascending: true });
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
  };

  async function refreshLives(sellerId) {
    try {
      const response = await fetch(`/api/lives/seller/${sellerId}`);
      if (response.ok) {
        const list = await response.json();
        setMyLives(list || []);
      } else {
        console.error('Errore caricamento live:', response.status);
        setMyLives([]);
      }
    } catch (error) {
      console.error('Errore caricamento live:', error);
      setMyLives([]);
    }
  }

  function toastOk(t) {
    setMsg({ type: "ok", text: t });
    setTimeout(() => setMsg(null), 2500);
  }
  function toastErr(t) {
    setMsg({ type: "err", text: t });
    setTimeout(() => setMsg(null), 3500);
  }

  // Funzione per creare campagna boost
  async function createBoostCampaign(liveId, multiplier, contentType, startDate = null) {
    const prices = { 2: 9.99, 5: 14.99, 10: 20.00 };
    const price = prices[multiplier];
    
    if (!price) return;

    const campaignData = {
      seller_id: seller.id,
      name: `Boost Live x${multiplier} - ${new Date().toLocaleDateString()}`,
      content_type: contentType,
      target_content_id: liveId,
      bid_amount: price,
      daily_budget: price * 24,
      boost_multiplier: multiplier,
      status: "active"
    };

    if (startDate) {
      campaignData.start_date = startDate;
    }

    try {
      const { error } = await supabase
        .from("ad_campaigns")
        .insert(campaignData);
      
      if (error) throw error;
    } catch (err) {
      console.error("Errore creazione boost:", err);
      toastErr("Boost non attivato: " + err.message);
    }
  }

  // Prezzi fissi boost
  const boostPrices = {
    2: { price: "9.99", label: "x2 Boost" },
    5: { price: "14.99", label: "x5 Boost" },
    10: { price: "19.99", label: "x10 Boost" }
  };

  async function goLiveNow(e) {
    e?.preventDefault?.();
    if (!seller) return;
    if (!titleNow.trim()) return toastErr("Inserisci un titolo.");
    if (!categoryNow) return toastErr("Seleziona una categoria.");

    try {
      setSaving(true);
      // crea live con status 'live' tramite API locale
      const response = await fetch('/api/lives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seller_id: seller.id,
          title: titleNow.trim(),
          category_id: getCategoryNumericId(categoryNow),
          start_price: Number(startPriceNow || 0),
          scheduled_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Aggiorna subito lo status a 'live'
      const statusResponse = await fetch(`/api/lives/${data.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'live' })
      });

      if (!statusResponse.ok) {
        console.error('Errore aggiornamento status a live');
      }

      // Se c'è boost, crea campagna pubblicitaria
      if (boostNow && data?.id) {
        await createBoostCampaign(data.id, boostNow, "live_stream");
      }

      setSaving(false);

      toastOk(`Live avviata${boostNow ? ' con boost x' + boostNow : ''}! Ti porto nella stanza…`);
      
      // 🎯 Rileva se mobile o desktop - Definizione sicura
      const isMobile = ((typeof window !== 'undefined') && window.innerWidth <= 768) || 
        ((typeof navigator !== 'undefined') && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      console.log('🔍 isMobile:', isMobile);
      console.log('🔍 window.innerWidth:', typeof window !== 'undefined' ? window.innerWidth : 'undefined');
      
      if (isMobile) {
        // Mobile: usa la live appena creata con ID specifico
        console.log('📱 REDIRECT A LIVE CREATA:', `/live/${data.id}`);
        window.location.href = `/live/${data.id}`;
      } else {
        // Desktop: usa dashboard completa (LiveDashboard.jsx)
        console.log('🖥️ REDIRECT A DESKTOP:', `/live-dashboard/${data.id}`);
        window.location.href = `/live-dashboard/${data.id}`;
      }
    } catch (e2) {
      console.error(e2);
      setSaving(false);
      toastErr(e2.message || "Errore inatteso.");
    }
  }

  async function scheduleLive(e) {
    e?.preventDefault?.();
    if (!seller) return;
    if (!titleSch.trim()) return toastErr("Inserisci un titolo.");
    if (!categorySch) return toastErr("Seleziona una categoria.");
    if (!scheduledAt) return toastErr("Imposta data/ora.");

    try {
      setSaving(true);
      // ricava ISO UTC dalla stringa local `yyyy-MM-ddTHH:mm`
      const iso = new Date(scheduledAt).toISOString();

      const response = await fetch('/api/lives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seller_id: seller.id,
          title: titleSch.trim(),
          category_id: getCategoryNumericId(categorySch),
          start_price: Number(startPriceSch || 0),
          scheduled_at: iso
        })
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Se c'è boost, crea campagna programmata
      if (boostSch && data?.id) {
        await createBoostCampaign(data.id, boostSch, "live_stream", iso);
      }

      setSaving(false);

      toastOk(`Live programmata${boostSch ? ' con boost x' + boostSch : ''} ✅`);
      await refreshLives(seller.id);
      // reset form leggero
      setTitleSch("");
      setStartPriceSch(5);
      setBoostSch(null);
    } catch (e2) {
      console.error(e2);
      setSaving(false);
      toastErr(e2.message || "Errore inatteso.");
    }
  }

  // Funzione per aggiungere prodotto a una live
  const addProductToLive = async () => {
    if (!newProduct.title || !newProduct.startPrice || !selectedLiveId) return;
    
    try {
      // Se è un ID temporaneo (per live immediate), gestisci localmente
      if (selectedLiveId.startsWith('temp-')) {
        const tempProduct = {
          id: `temp-product-${Date.now()}`,
          title: newProduct.title,
          start_price: Number(newProduct.startPrice),
          image_url: newProduct.imageUrl || null,
          buy_now_price: newProduct.buyNowPrice ? Number(newProduct.buyNowPrice) : null,
          min_bid_increment: Number(newProduct.minBidIncrement || '1'),
          status: 'queued',
          order_index: (lots[selectedLiveId] || []).length
        };
        
        setLots(prev => ({
          ...prev,
          [selectedLiveId]: [...(prev[selectedLiveId] || []), tempProduct]
        }));
        
        setNewProduct({ title: '', startPrice: '', imageUrl: '', buyNowPrice: '', minBidIncrement: '1' });
        setMediaFile(null);
        setShowAddProduct(false);
        toastOk('Prodotto aggiunto alla live!');
        return;
      }
      
      // Per live programmate esistenti, salva nel database
      const { data, error } = await supabase
        .from('live_lots')
        .insert({
          live_id: selectedLiveId,
          title: newProduct.title,
          start_price: Number(newProduct.startPrice),
          image_url: newProduct.imageUrl || null,
          buy_now_price: newProduct.buyNowPrice ? Number(newProduct.buyNowPrice) : null,
          min_bid_increment: Number(newProduct.minBidIncrement || '1'),
          status: 'queued',
          order_index: (lots[selectedLiveId] || []).length
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setLots(prev => ({
        ...prev,
        [selectedLiveId]: [...(prev[selectedLiveId] || []), data]
      }));
      
      setNewProduct({ title: '', startPrice: '', imageUrl: '', buyNowPrice: '', minBidIncrement: '1' });
      setMediaFile(null);
      setShowAddProduct(false);
      toastOk('Prodotto aggiunto alla live!');
    } catch (err) {
      console.error('Errore aggiunta prodotto:', err);
      toastErr('Errore durante l\'aggiunta del prodotto');
    }
  };

  // Funzione per riordinare prodotti
  const reorderProducts = (liveId, fromIndex, toIndex) => {
    const products = [...(lots[liveId] || [])];
    const [removed] = products.splice(fromIndex, 1);
    products.splice(toIndex, 0, removed);
    
    // Aggiorna gli order_index
    const updatedProducts = products.map((product, index) => ({
      ...product,
      order_index: index
    }));
    
    setLots(prev => ({
      ...prev,
      [liveId]: updatedProducts
    }));
  };

  // Rimuovi prodotto
  const removeProduct = (liveId, productId) => {
    setLots(prev => ({
      ...prev,
      [liveId]: (prev[liveId] || []).filter(p => p.id !== productId)
    }));
  };

  // Carica prodotti per una live
  const loadLots = async (liveId) => {
    if (lots[liveId]) return; // Già caricati
    
    try {
      const { data } = await supabase
        .from('live_lots')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: true });
        
      setLots(prev => ({
        ...prev,
        [liveId]: data || []
      }));
    } catch (err) {
      console.error('Errore caricamento prodotti:', err);
    }
  };

  async function setStatus(liveId, newStatus) {
    try {
      setSaving(true);
      const response = await fetch(`/api/lives/${liveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      setSaving(false);
      
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      if (newStatus === "live") {
        window.location.href = `/live/${liveId}`;
        return;
      }
      await refreshLives(seller.id);
    } catch (e2) {
      console.error(e2);
      setSaving(false);
      toastErr(e2.message || "Impossibile aggiornare stato live.");
    }
  }

  if (loading) {
    return (
      <main className="container section">
        <h1>Studio Live</h1>
        <div className="muted">Caricamento…</div>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="container section">
        <h1>Studio Live</h1>
        <p>
          Nessun profilo venditore collegato. Vai su{" "}
          <a href="/dashboard/settings">Impostazioni venditore</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="container section" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* MODERN HEADER */}
      <div style={{
        background: "#000",
        borderRadius: 20,
        padding: 32,
        color: "#40e0d0",
        border: "2px solid #40e0d0",
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
          📺
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
          Studio Live
        </h1>
        <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
          Gestisci le tue dirette e connettiti con i tuoi clienti
        </p>
      </div>

      {/* MESSAGES */}
      {msg && (
        <div
          style={{
            background: msg.type === "ok" 
              ? "linear-gradient(135deg, #00b894 0%, #00a085 100%)"
              : "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
            color: "white",
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >
          <span style={{ fontSize: 20 }}>
            {msg.type === "ok" ? "✅" : "⚠️"}
          </span>
          {msg.text}
        </div>
      )}

      {/* MODERN TABS */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 32,
        background: "#f8f9ff",
        borderRadius: 16,
        padding: 6
      }}>
        <button
          onClick={() => setTab("now")}
          style={{
            flex: 1,
            padding: "16px 24px",
            borderRadius: 12,
            border: "none",
            background: tab === "now" 
              ? "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)"
              : "transparent",
            color: tab === "now" ? "white" : "#666",
            fontSize: 16,
            fontWeight: tab === "now" ? 600 : 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: tab === "now" ? "0 6px 20px rgba(110, 58, 255, 0.3)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          <span style={{ fontSize: 20 }}>🔴</span>
          Vai in live ora
        </button>
        <button
          onClick={() => setTab("schedule")}
          style={{
            flex: 1,
            padding: "16px 24px",
            borderRadius: 12,
            border: "none",
            background: tab === "schedule" 
              ? "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)"
              : "transparent",
            color: tab === "schedule" ? "white" : "#666",
            fontSize: 16,
            fontWeight: tab === "schedule" ? 600 : 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: tab === "schedule" ? "0 6px 20px rgba(110, 58, 255, 0.3)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8
          }}
        >
          <span style={{ fontSize: 20 }}>⏰</span>
          Programma live
        </button>
      </div>

      {tab === "now" ? (
        <section className="panel">
          <form
            onSubmit={goLiveNow}
            style={{ display: "grid", gap: 10, alignItems: "start" }}
          >
            <Field label="Titolo">
              <input
                value={titleNow}
                onChange={(e) => setTitleNow(e.target.value)}
                placeholder="Es. Svuota magazzino denim"
                className="inp"
                required
              />
            </Field>

            <Field label="Categoria">
              <select
                value={categoryNow || ""}
                onChange={(e) => setCategoryNow(e.target.value || null)}
                className="inp"
                required
              >
                <option value="">— seleziona —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prezzo di partenza (asta)">
              <input
                type="number"
                step="0.5"
                min="0"
                value={startPriceNow}
                onChange={(e) => setStartPriceNow(e.target.value)}
                className="inp"
              />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={sponsoredNow}
                onChange={(e) => setSponsoredNow(e.target.checked)}
              />
              <span>Metti in evidenza (sponsorizzata)</span>
            </label>

            {/* SEZIONE PRODOTTI - NOW */}
            <div style={{
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              border: "2px solid #7dd3fc",
              borderRadius: 16,
              padding: 20,
              marginTop: 16
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: "#0369a1"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                  Prodotti per questa Live
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Crea la live temporaneamente per gestire i prodotti
                    const tempLiveId = 'temp-now-' + Date.now();
                    setSelectedLiveId(tempLiveId);
                    setLots(prev => ({ ...prev, [tempLiveId]: [] }));
                    setShowAddProduct(true);
                  }}
                  style={{
                    background: "#0369a1",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  + Aggiungi Prodotti
                </button>
              </div>
              
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                color: "#0369a1"
              }}>
                💡 <strong>Suggerimento:</strong> Aggiungi i prodotti ora per averli pronti quando vai in live. 
                Potrai sempre aggiungerne altri durante la diretta.
              </div>

              {/* Lista prodotti ordinabile */}
              {Object.keys(lots).some(liveId => liveId.startsWith('temp-now-')) && (
                <div style={{ marginTop: 16 }}>
                  {Object.entries(lots).filter(([liveId]) => liveId.startsWith('temp-now-')).map(([liveId, products]) => (
                    products.length > 0 && (
                      <div key={liveId}>
                        <h4 style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: 14, 
                          fontWeight: 600, 
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          📋 Lista Prodotti ({products.length})
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>
                            Trascina per riordinare
                          </span>
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {products.map((product, index) => (
                            <div
                              key={product.id}
                              draggable
                              onDragStart={() => setDraggedProductId(product.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedProductId) {
                                  const draggedIndex = products.findIndex(p => p.id === draggedProductId);
                                  reorderProducts(liveId, draggedIndex, index);
                                  setDraggedProductId(null);
                                }
                              }}
                              style={{
                                background: 'white',
                                border: '2px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: 'grab',
                                transition: 'all 0.2s ease',
                                opacity: draggedProductId === product.id ? 0.5 : 1,
                                transform: draggedProductId === product.id ? 'rotate(2deg)' : 'none'
                              }}
                            >
                              <div style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: 12,
                                fontWeight: 600,
                                minWidth: 30,
                                textAlign: 'center'
                              }}>
                                #{index + 1}
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
                                  {product.title}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                  Prezzo di partenza: €{product.start_price}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => removeProduct(liveId, product.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: 4,
                                  borderRadius: 4,
                                  fontSize: 16
                                }}
                                title="Rimuovi prodotto"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* BOOST SECTION */}
            <div style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
              border: "2px solid #fed7aa",
              borderRadius: 16,
              padding: 20,
              marginTop: 16
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8, 
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: "#d97706"
              }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                Boost BIDLi - Priorità nel Feed
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setBoostNow(null)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 12,
                    border: boostNow === null ? "2px solid #6b7280" : "2px solid #e5e7eb",
                    background: boostNow === null ? "#f3f4f6" : "white",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  <div style={{ marginBottom: 4 }}>Nessun Boost</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Gratuito</div>
                </button>
                
                {Object.entries(boostPrices).map(([multiplier, info]) => (
                  <button
                    key={multiplier}
                    type="button"
                    onClick={() => setBoostNow(parseInt(multiplier))}
                    style={{
                      padding: "16px 12px",
                      borderRadius: 12,
                      border: boostNow === parseInt(multiplier) ? "2px solid #d97706" : "2px solid #e5e7eb",
                      background: boostNow === parseInt(multiplier) ? "#fff7ed" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: "#d97706" }}>€{info.price}</div>
                  </button>
                ))}
              </div>
              
              {boostNow && (
                <div style={{
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                  fontSize: 14,
                  color: "#166534"
                }}>
                  🎯 La tua live apparirà in cima al feed con boost <strong>x{boostNow}</strong> per €{boostPrices[boostNow].price}
                </div>
              )}
              
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #7dd3fc",
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                fontSize: 13,
                color: "#0369a1"
              }}>
                💡 <strong>Come funziona:</strong> Il boost moltiplica il punteggio della tua live nell'algoritmo Bidli. 
                Il punteggio base dipende da spettatori, offerte e engagement reale che ricevi durante la trasmissione.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-viola" type="submit" disabled={saving}>
                {saving ? "Creo…" : boostNow ? `Vai live con boost x${boostNow}` : "Vai in live adesso"}
              </button>
              <a className="btn btn-ghost" href="/live">
                Apri live corrente
              </a>
            </div>
          </form>
        </section>
      ) : (
        <section className="panel">
          <form
            onSubmit={scheduleLive}
            style={{ display: "grid", gap: 10, alignItems: "start" }}
          >
            <Field label="Titolo">
              <input
                value={titleSch}
                onChange={(e) => setTitleSch(e.target.value)}
                placeholder="Es. Retro-Tech selezione serale"
                className="inp"
                required
              />
            </Field>

            <Field label="Categoria">
              <select
                value={categorySch || ""}
                onChange={(e) => setCategorySch(e.target.value || null)}
                className="inp"
                required
              >
                <option value="">— seleziona —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data e ora">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="inp"
                required
              />
            </Field>

            <Field label="Prezzo di partenza (asta)">
              <input
                type="number"
                step="0.5"
                min="0"
                value={startPriceSch}
                onChange={(e) => setStartPriceSch(e.target.value)}
                className="inp"
              />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={sponsoredSch}
                onChange={(e) => setSponsoredSch(e.target.checked)}
              />
              <span>Metti in evidenza (sponsorizzata)</span>
            </label>

            {/* SEZIONE PRODOTTI - SCHEDULED */}
            <div style={{
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              border: "2px solid #7dd3fc",
              borderRadius: 16,
              padding: 20,
              marginTop: 16
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: "#0369a1"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                  Prodotti per questa Live
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Crea la live temporaneamente per gestire i prodotti
                    const tempLiveId = 'temp-sch-' + Date.now();
                    setSelectedLiveId(tempLiveId);
                    setLots(prev => ({ ...prev, [tempLiveId]: [] }));
                    setShowAddProduct(true);
                  }}
                  style={{
                    background: "#0369a1",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  + Aggiungi Prodotti
                </button>
              </div>
              
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                color: "#0369a1"
              }}>
                💡 <strong>Suggerimento:</strong> Prepara i prodotti ora per la live programmata. 
                Potrai sempre aggiungerne altri quando andra in onda.
              </div>

              {/* Lista prodotti ordinabile - SCHEDULED */}
              {Object.keys(lots).some(liveId => liveId.startsWith('temp-sch-')) && (
                <div style={{ marginTop: 16 }}>
                  {Object.entries(lots).filter(([liveId]) => liveId.startsWith('temp-sch-')).map(([liveId, products]) => (
                    products.length > 0 && (
                      <div key={liveId}>
                        <h4 style={{ 
                          margin: '0 0 12px 0', 
                          fontSize: 14, 
                          fontWeight: 600, 
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          📋 Lista Prodotti ({products.length})
                          <span style={{ fontSize: 12, fontWeight: 400, color: '#6b7280' }}>
                            Trascina per riordinare
                          </span>
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {products.map((product, index) => (
                            <div
                              key={product.id}
                              draggable
                              onDragStart={() => setDraggedProductId(product.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedProductId) {
                                  const draggedIndex = products.findIndex(p => p.id === draggedProductId);
                                  reorderProducts(liveId, draggedIndex, index);
                                  setDraggedProductId(null);
                                }
                              }}
                              style={{
                                background: 'white',
                                border: '2px solid #e5e7eb',
                                borderRadius: 8,
                                padding: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: 'grab',
                                transition: 'all 0.2s ease',
                                opacity: draggedProductId === product.id ? 0.5 : 1,
                                transform: draggedProductId === product.id ? 'rotate(2deg)' : 'none'
                              }}
                            >
                              <div style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: 12,
                                fontWeight: 600,
                                minWidth: 30,
                                textAlign: 'center'
                              }}>
                                #{index + 1}
                              </div>
                              
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>
                                  {product.title}
                                </div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>
                                  Prezzo di partenza: €{product.start_price}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => removeProduct(liveId, product.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: 4,
                                  borderRadius: 4,
                                  fontSize: 16
                                }}
                                title="Rimuovi prodotto"
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* BOOST SECTION - SCHEDULED */}
            <div style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
              border: "2px solid #fed7aa",
              borderRadius: 16,
              padding: 20,
              marginTop: 16
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 8, 
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 600,
                color: "#d97706"
              }}>
                <span style={{ fontSize: 20 }}>🚀</span>
                Boost BIDLi - Priorità nel Feed
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setBoostSch(null)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 12,
                    border: boostSch === null ? "2px solid #6b7280" : "2px solid #e5e7eb",
                    background: boostSch === null ? "#f3f4f6" : "white",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  <div style={{ marginBottom: 4 }}>Nessun Boost</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Gratuito</div>
                </button>
                
                {Object.entries(boostPrices).map(([multiplier, info]) => (
                  <button
                    key={multiplier}
                    type="button"
                    onClick={() => setBoostSch(parseInt(multiplier))}
                    style={{
                      padding: "16px 12px",
                      borderRadius: 12,
                      border: boostSch === parseInt(multiplier) ? "2px solid #d97706" : "2px solid #e5e7eb",
                      background: boostSch === parseInt(multiplier) ? "#fff7ed" : "white",
                      cursor: "pointer",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: "#d97706" }}>€{info.price}</div>
                  </button>
                ))}
              </div>
              
              {boostSch && (
                <div style={{
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                  fontSize: 14,
                  color: "#166534"
                }}>
                  🎯 La tua live programmata avrà boost <strong>x{boostSch}</strong> per €{boostPrices[boostSch].price}
                </div>
              )}
              
              <div style={{
                background: "#f0f9ff",
                border: "1px solid #7dd3fc",
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                fontSize: 13,
                color: "#0369a1"
              }}>
                💡 <strong>Come funziona:</strong> Il boost moltiplica il punteggio della tua live nell'algoritmo Bidli. 
                Il punteggio base dipende da spettatori, offerte e engagement reale che ricevi durante la trasmissione.
              </div>
            </div>

            <div>
              <button className="btn btn-viola" type="submit" disabled={saving}>
                {saving ? "Programmo…" : boostSch ? `Programma con boost x${boostSch}` : "Programma live"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Le mie live */}
      <section className="section" style={{ paddingTop: 12 }}>
        <h2>Le mie live</h2>
        {myLives.length === 0 ? (
          <div className="muted">Nessuna live ancora.</div>
        ) : (
          <div className="live-list">
            {myLives.map((l) => (
              <div key={l.id} className="live-row">
                <div className={`badge ${l.status === "live" ? "live" : ""}`}>
                  {statusLabel[l.status] || l.status}
                </div>
                <div className="live-main" style={{ flex: 1 }}>
                  <div className="live-title" style={{ fontWeight: 800 }}>
                    {l.title}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {l.category?.label || "—"} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("it-IT") : "Subito"}
                    {" · "} Prezzo base {fmtEUR(l.start_price || 0)}
                    {l.sponsored ? " · In evidenza" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      console.log('CLICK PRODOTTI per live:', l.id);
                      setSelectedLiveId(l.id);
                      loadLots(l.id);
                      setShowAddProduct(true);
                    }}
                    style={{ 
                      background: "#f59e0b", 
                      color: "white", 
                      fontSize: "12px",
                      padding: "6px 12px" 
                    }}
                  >
                    📦 Prodotti ({lots[l.id]?.length || 0})
                  </button>
                  
                  {l.status === "scheduled" && (
                    <button className="btn btn-ghost" onClick={() => setStatus(l.id, "live")}>
                      Avvia ora
                    </button>
                  )}
                  {l.status === "live" && (
                    <>
                      <a className="btn btn-viola" href={`/live/${l.id}`}>Apri</a>
                      <button className="btn btn-ghost" onClick={() => setStatus(l.id, "ended")}>
                        Termina
                      </button>
                    </>
                  )}
                  {l.status !== "live" && (
                    <a className="btn btn-ghost" href={`/live/${l.id}`}>Anteprima</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Popup Gestione Prodotti */}
      {showAddProduct && selectedLiveId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 20 
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Gestione Prodotti Live
              </h3>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setSelectedLiveId(null);
                  setNewProduct({ title: '', startPrice: '', imageUrl: '', buyNowPrice: '', minBidIncrement: '1' });
                  setMediaFile(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Lista prodotti esistenti */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#666' }}>
                Prodotti già aggiunti ({lots[selectedLiveId]?.length || 0})
              </h4>
              {lots[selectedLiveId]?.length === 0 ? (
                <p style={{ color: '#999', fontStyle: 'italic', fontSize: 14 }}>
                  Nessun prodotto ancora. Aggiungi il primo!
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 8, maxHeight: 150, overflow: 'auto' }}>
                  {lots[selectedLiveId]?.map((lot, index) => (
                    <div key={lot.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 8,
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      backgroundColor: '#fafafa',
                      fontSize: 13
                    }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        backgroundColor: '#e5e7eb',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#6b7280'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{lot.title}</div>
                        <div style={{ color: '#6b7280' }}>
                          {fmtEUR(lot.start_price)} • {lot.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Form aggiungi prodotto */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#666' }}>
                Aggiungi nuovo prodotto
              </h4>
              
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                    Titolo Prodotto *
                  </label>
                  <input
                    type="text"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Es. Giacca vintage anni '80"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                    Prezzo di Partenza (€) *
                  </label>
                  <input
                    type="number"
                    value={newProduct.startPrice}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, startPrice: e.target.value }))}
                    placeholder="15.00"
                    min="0"
                    step="0.50"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                    Compra Subito (€) - Opzionale
                  </label>
                  <input
                    type="number"
                    value={newProduct.buyNowPrice || ''}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, buyNowPrice: e.target.value }))}
                    placeholder="30.00"
                    min="0"
                    step="0.50"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #ef4444',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 12 }}>
                    Min Rilancio (€) - Default €1
                  </label>
                  <input
                    type="number"
                    value={newProduct.minBidIncrement || '1'}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, minBidIncrement: e.target.value }))}
                    placeholder="1.00"
                    min="0.50"
                    step="0.50"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #f59e0b',
                      borderRadius: 6,
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 12 }}>
                    Foto Prodotto (opzionale)
                  </label>
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: 16,
                    border: "2px dashed #d1d5db",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#6b7280",
                    background: "#f9fafb",
                    fontSize: 13
                  }}>
                    📷 {mediaFile ? mediaFile.name : "Scegli foto dalla galleria"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => setMediaFile(e.target.files[0] || null)}
                    />
                  </label>
                  {mediaFile && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#374151" }}>
                        📷 {(mediaFile.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setMediaFile(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 2,
                          fontSize: 16
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setNewProduct({ title: '', startPrice: '', imageUrl: '', buyNowPrice: '', minBidIncrement: '1' });
                    setMediaFile(null);
                  }}
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  Reset
                </button>
                <button
                  onClick={addProductToLive}
                  disabled={!newProduct.title || !newProduct.startPrice}
                  style={{
                    backgroundColor: !newProduct.title || !newProduct.startPrice ? '#d1d5db' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: !newProduct.title || !newProduct.startPrice ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  + Aggiungi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
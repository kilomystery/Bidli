// src/pages/LiveDashboard.jsx - Dashboard completa per il venditore durante la live
import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";
import MobileLiveOverlay from "../components/MobileLiveOverlay";
import MobileSellDashboard from "../components/MobileSellDashboard";
import Footer from "../components/Footer";
import LiveVideoStream from "../components/LiveVideoStream";

const fmtEUR = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );

export default function LiveDashboard({ liveIdParam: propsLiveId }) {
  console.log('🎯 LIVE DASHBOARD CARICATA! (Questa è la pagina del venditore)');
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { liveId: urlLiveId } = useParams();
  
  // ✅ PRIORITÀ: props da SmartLiveRouter > URL params > search params
  const liveId = propsLiveId || urlLiveId || searchParams.get("liveId");
  
  // ✅ DEBUG: Verifica liveId con nuova logica
  console.log('🔍 LiveDashboard liveId debug:', { 
    propsLiveId, 
    urlLiveId, 
    searchParams: searchParams.get("liveId"), 
    final: liveId 
  });

  // Stati principali
  const [live, setLive] = useState({
    id: liveId,
    title: 'Archivio Workwear anni \'80',
    status: 'live',
    category_label: 'Moda Vintage',
    seller_display_name: 'denim_lab',
    seller_handle: 'denim_lab',
    viewers: 540
  });
  const [currentLot, setCurrentLot] = useState({
    id: 1,
    title: 'Camicia Vintage Anni \'80',
    description: 'Bellissima camicia vintage',
    start_price: 15,
    image_url: null
  });
  const [lots, setLots] = useState([]);
  const [messages, setMessages] = useState([
    { id: 1, sender_name: 'Marco_92', content: 'Ciao a tutti! 👋' },
    { id: 2, sender_name: 'VintageQueen', content: 'Bellissima questa camicia!' },
    { id: 3, sender_name: 'CollectorItaly', content: 'Quanto parte?' },
    { id: 4, sender_name: 'FashionLover', content: 'Stupenda! La voglio!' },
    { id: 5, sender_name: 'Milano_Style', content: 'Che taglia è?' },
    { id: 6, sender_name: 'Vintage_Fan', content: 'Meravigliosa! 😍' },
    { id: 7, sender_name: 'ItaliaVintage', content: 'Quando inizia?' },
  ]);
  const [bids, setBids] = useState([
    { id: 1, amount: 25, user_name: 'CollectorItaly', timestamp: Date.now() - 30000 },
    { id: 2, amount: 30, user_name: 'VintageQueen', timestamp: Date.now() - 15000 },
    { id: 3, amount: 35, user_name: 'Milano_Style', timestamp: Date.now() - 5000 },
  ]);
  
  // ✅ TIMER/COUNTDOWN per auctions
  const [timeLeft, setTimeLeft] = useState(120); // 2 minuti default
  const [timerActive, setTimerActive] = useState(false);
  
  // Form nuovo prodotto
  const [newProduct, setNewProduct] = useState({
    title: "",
    description: "",
    start_price: "",
    image_url: ""
  });
  const [adding, setAdding] = useState(false);
  
  // Chat management
  const [chatMsg, setChatMsg] = useState("");
  const chatEndRef = useRef(null);
  
  // Mobile/Desktop detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carica dati iniziali
  useEffect(() => {
    if (!liveId) {
      navigate("/dashboard");
      return;
    }

    let mounted = true;

    (async () => {
      // Per demo, salta la verifica del venditore
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        navigate("/auth");
        return;
      }

      // Carica live - USA API LOCALE
      let liveData = null;
      try {
        const response = await fetch(`/api/lives/${liveId}`);
        if (response.ok) {
          const apiData = await response.json();
          liveData = {
            id: apiData.id,
            title: apiData.title,
            status: apiData.status,
            current_lot_id: apiData.current_lot_id,
            seller: {
              id: apiData.seller_id,
              user_id: apiData.seller_user_id,
              display_name: apiData.seller_display_name || 'Venditore'
            }
          };
        }
      } catch (error) {
        console.error('Errore caricamento live:', error);
      }

      if (!liveData || liveData.seller?.user_id !== session.session.user.id) {
        alert("Non autorizzato per questa live");
        navigate("/dashboard");
        return;
      }

      if (!mounted) return;
      setLive(liveData);

      // Carica lotti
      const { data: lotsData } = await supabase
        .from("live_lots")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true });

      setLots(lotsData || []);

      // Carica lotto corrente
      if (liveData.current_lot_id) {
        const currentLotData = lotsData?.find(l => l.id === liveData.current_lot_id);
        setCurrentLot(currentLotData || null);
      }

      // Carica chat
      const { data: msgsData } = await supabase
        .from("messages")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(msgsData || []);

      // Carica offerte per lotto corrente
      if (liveData.current_lot_id) {
        const { data: bidsData } = await supabase
          .from("bids")
          .select("*")
          .eq("lot_id", liveData.current_lot_id)
          .order("amount", { ascending: false });

        setBids(bidsData || []);
      }
    })();

    return () => { mounted = false; };
  }, [liveId, navigate]);

  // Real-time subscriptions
  useEffect(() => {
    if (!liveId) return;

    // Chat realtime
    const chatChannel = supabase
      .channel("dashboard_messages_" + liveId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `live_id=eq.${liveId}` },
        (payload) => {
          setMessages(prev => [...prev.slice(-99), payload.new]);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
        }
      )
      .subscribe();

    // Bids realtime
    let bidsChannel = null;
    if (currentLot?.id) {
      bidsChannel = supabase
        .channel("dashboard_bids_" + currentLot.id)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids", filter: `lot_id=eq.${currentLot.id}` },
          (payload) => {
            setBids(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(chatChannel);
      if (bidsChannel) supabase.removeChannel(bidsChannel);
    };
  }, [liveId, currentLot?.id]);

  // Aggiungi nuovo prodotto
  async function addProduct() {
    if (!newProduct.title || !newProduct.start_price || !liveId) return;

    setAdding(true);
    try {
      const { error } = await supabase
        .from("live_lots")
        .insert({
          live_id: liveId,
          title: newProduct.title,
          description: newProduct.description,
          start_price: Number(newProduct.start_price),
          image_url: newProduct.image_url,
          status: "queued"
        });

      if (error) throw error;

      // Ricarica lista lotti
      const { data: lotsData } = await supabase
        .from("live_lots")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: true });

      setLots(lotsData || []);
      setNewProduct({ title: "", description: "", start_price: "", image_url: "" });
    } catch (e) {
      alert(e.message || "Errore aggiunta prodotto");
    } finally {
      setAdding(false);
    }
  }

  // Avvia lotto
  async function startLot(lotId) {
    try {
      await supabase.from("live_lots").update({ status: "active" }).eq("id", lotId);
      await supabase.from("lives").update({ current_lot_id: lotId }).eq("id", liveId);
      
      // Aggiorna stato locale
      setCurrentLot(lots.find(l => l.id === lotId));
      setLots(prev => prev.map(l => l.id === lotId ? { ...l, status: "active" } : l));
      
      // Carica offerte per nuovo lotto
      const { data: bidsData } = await supabase
        .from("bids")
        .select("*")
        .eq("lot_id", lotId)
        .order("amount", { ascending: false });

      setBids(bidsData || []);
    } catch (e) {
      alert(e.message || "Errore avvio lotto");
    }
  }

  // Assegna vincitore
  async function assignWinner(lotId) {
    if (!lotId) return;
    
    try {
      const { data, error } = await supabase.rpc("create_order_from_lot", {
        p_lot_id: lotId,
      });
      if (error) throw error;
      
      if (!data) {
        alert("Nessuna offerta: lotto rimesso in vendita");
        // Rimetti in coda
        await supabase.from("live_lots").update({ status: "queued" }).eq("id", lotId);
      } else {
        alert(`Ordine creato! ID: ${data}`);
        // Marca come venduto
        await supabase.from("live_lots").update({ status: "sold" }).eq("id", lotId);
      }
      
      // Aggiorna stato locale
      setLots(prev => prev.map(l => 
        l.id === lotId 
          ? { ...l, status: data ? "sold" : "queued" } 
          : l
      ));
      
      // Se era il lotto corrente, resetta
      if (currentLot?.id === lotId) {
        setCurrentLot(null);
        setBids([]);
        await supabase.from("lives").update({ current_lot_id: null }).eq("id", liveId);
      }
    } catch (e) {
      alert(e.message || "Errore assegnazione");
    }
  }

  // Invia messaggio chat
  async function sendChatMessage() {
    if (!chatMsg.trim() || !liveId) return;

    try {
      await supabase.from("messages").insert({
        live_id: liveId,
        user_id: (await supabase.auth.getUser()).data?.user?.id,
        username: live?.seller?.display_name || "Venditore",
        text: chatMsg.trim(),
      });
      setChatMsg("");
    } catch (e) {
      alert(e.message || "Errore invio messaggio");
    }
  }

  if (!live) {
    return (
      <>
        <Header />
        <div className="container section" style={{ textAlign: "center" }}>
          Caricamento dashboard...
        </div>
        <Footer />
      </>
    );
  }

  const queuedLots = lots.filter(l => l.status === "queued");
  const soldLots = lots.filter(l => l.status === "sold");
  const topBid = bids[0];

  // Mobile handlers
  const handleAssignLot = (lotId) => {
    // Logic per assegnare lotto
    console.log('Assegnando lotto:', lotId);
  };
  
  const handleSendMessage = (message) => {
    sendMessage(message);
  };
  
  const handleAcceptBid = (bid) => {
    // Logic per accettare offerta
    console.log('Accettando offerta:', bid);
  };
  
  const handleAddQuickProduct = async (product) => {
    return addProduct(product);
  };

  // ✅ FUNZIONE MANCANTE: handleAddProduct
  const handleAddProduct = async (productData) => {
    if (productData) {
      setNewProduct(productData);
    }
    await addProduct();
  };
  
  const handleNextLot = async () => {
    try {
      // Trova prossimo lotto in coda
      const queuedLots = lots.filter(l => l.status === 'queued');
      if (queuedLots.length === 0) {
        alert('Nessun prodotto in coda');
        return;
      }
      
      const nextLot = queuedLots[0];
      
      // Aggiorna lotto corrente nel database e stato
      const { error } = await supabase
        .from("lives")
        .update({ current_lot_id: nextLot.id })
        .eq("id", liveId);
        
      if (error) throw error;
      
      // Aggiorna stato locale
      setCurrentLot(nextLot);
      setBids([]);
      
      // Aggiorna status del lotto
      setLots(lots.map(l => 
        l.id === nextLot.id 
          ? { ...l, status: 'active' }
          : l
      ));
      
      console.log('✅ Prossimo lotto attivato:', nextLot.title);
    } catch (error) {
      console.error('Errore prossimo lotto:', error);
      alert('Errore nel passare al prossimo lotto');
    }
  };
  
  const handleEndLive = async () => {
    try {
      // Aggiorna stato live a 'ended'
      const { error } = await supabase
        .from('lives')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', liveId);
      
      if (error) throw error;
      
      // Naviga alla dashboard principale
      navigate('/dashboard');
    } catch (error) {
      console.error('Errore terminazione live:', error);
      alert('Errore durante la chiusura della live');
    }
  };

  // Mobile view - niente header per mobile
  if (isMobile) {
    return (
      <>
        <div style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          background: '#000',
          overflow: 'hidden'
        }}>
          {/* Video a schermo intero */}
          <div style={{
            width: '100%',
            height: '100%'
          }}>
            <LiveVideoStream
              streamId={liveId}
              isSeller={true}
              autoPlay={true}
              controls={false}
              onStreamReady={(stream) => {
                console.log('🎥 VENDITORE MOBILE: Video stream attivato!');
              }}
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          </div>
          
          {/* Messaggi Chat Overlay */}
          <div style={{
            position: 'absolute',
            left: 16,
            bottom: '52vh', // Sopra la dashboard mobile
            right: 16,
            height: 200,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 6,
            zIndex: 50
          }}>
            {messages.slice(-6).map((msg, idx) => (
              <div
                key={msg.id}
                style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                  lineHeight: 1.4,
                  animation: `slideInLeft 0.3s ease-out`
                }}
              >
                <div style={{
                  fontSize: '12px',
                  opacity: 0.9,
                  fontWeight: 600,
                  marginBottom: '2px'
                }}>
                  {msg.sender_name}:
                </div>
                <div style={{ fontSize: '13px' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pop-up Offerte Verdi */}
          {bids.slice(-2).map((bid, idx) => (
            <div
              key={bid.id}
              style={{
                position: 'absolute',
                top: '20%',
                right: 16,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                animation: `bounceIn 0.6s ease-out ${idx * 0.2}s both`,
                zIndex: 60
              }}
            >
              💰 {fmtEUR(bid.amount)}<br/>
              <small style={{ opacity: 0.9 }}>{bid.user_name}</small>
            </div>
          ))}
          
          {/* Pulsante Termina Live Overlay */}
          <button
            onClick={() => {
              if (window.confirm('Terminare la live? Tutti i prodotti in coda verranno persi.')) {
                handleEndLive();
              }
            }}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
              zIndex: 70
            }}
          >
            🔴 Termina Live
          </button>
        </div>
        
        {/* SOSTITUITO: Usa componente MobileSellDashboard vero */}
        <MobileSellDashboard
          onAddProduct={handleAddProduct}
          adding={adding}
          currentLot={currentLot}
          lots={lots}
          onNextLot={handleNextLot}
          onEndLive={handleEndLive}
          isStreaming={true}
          onPauseStream={null}
          onStopStream={null}
        />
      </>
    );
  }

  // Desktop view
  return (
    <>
      <Header />
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        {/* Header Dashboard */}
        <div style={{ 
          background: "white", 
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 0"
        }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: "0 0 4px 0", fontSize: "1.5rem", fontWeight: 700 }}>
                  Dashboard Live
                </h1>
                <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  {live.title} • Status: {live.status}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "12px" }}>
                <a 
                  href={`/live/${liveId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Visualizza Live
                </a>
                <button className="btn btn-primary">
                  {live.status === "live" ? "🔴 IN DIRETTA" : "📺 Avvia Live"}
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Sei sicuro di voler terminare definitivamente questa live? Tutti i prodotti in coda verranno persi.')) {
                      handleEndLive();
                    }
                  }}
                  className="btn"
                  style={{
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    border: "none"
                  }}
                >
                  🔴 Termina Live
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container" style={{ padding: "24px 0" }}>
          {/* SEZIONE VIDEO VENDITORE - SEMPRE PRESENTE */}
          <div style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "24px"
          }}>
            <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", fontWeight: 600 }}>
              🎥 La Tua Live Video
            </h2>
            <div style={{
              width: "100%",
              height: "400px",
              borderRadius: "12px",
              overflow: "hidden",
              background: "#000"
            }}>
              <LiveVideoStream
                streamId={liveId}
                isSeller={true}
                autoPlay={true}
                controls={false}
                onStreamReady={(stream) => {
                  console.log('🎥 VENDITORE: Video stream attivato!');
                }}
                style={{
                  width: "100%",
                  height: "100%"
                }}
              />
            </div>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr 400px", 
            gap: "24px",
            alignItems: "start"
          }}>
            
            {/* COLONNA 1: Gestione Prodotti */}
            <div>
              {/* Prodotto Corrente */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", fontWeight: 600 }}>
                  🎯 Prodotto in Asta
                </h2>
                
                {currentLot ? (
                  <div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "16px",
                      marginBottom: "16px"
                    }}>
                      {currentLot.image_url && (
                        <img 
                          src={currentLot.image_url} 
                          alt={currentLot.title}
                          style={{
                            width: "80px",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "8px"
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: "0 0 4px 0", fontSize: "1.125rem", fontWeight: 600 }}>
                          {currentLot.title}
                        </h3>
                        <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "8px" }}>
                          Prezzo partenza: {fmtEUR(currentLot.start_price)}
                        </div>
                        <div style={{ 
                          fontSize: "1.25rem", 
                          fontWeight: 700, 
                          color: topBid ? "#10b981" : "#6b7280" 
                        }}>
                          {topBid ? fmtEUR(topBid.amount) : "Nessuna offerta"}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => assignWinner(currentLot.id)}
                      >
                        Assegna Vincitore
                      </button>
                      <button 
                        className="btn btn-ghost"
                        onClick={() => {
                          setCurrentLot(null);
                          supabase.from("lives").update({ current_lot_id: null }).eq("id", liveId);
                        }}
                      >
                        Termina Asta
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#6b7280", 
                    padding: "40px 20px" 
                  }}>
                    <div style={{ fontSize: "3rem", marginBottom: "12px" }}>⏳</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "4px" }}>
                      Nessun prodotto in asta
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>
                      Seleziona un prodotto dalla coda per iniziare
                    </div>
                  </div>
                )}
              </div>

              {/* Lista Prodotti in Coda */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", fontWeight: 600 }}>
                  📦 Prodotti in Coda ({queuedLots.length})
                </h2>
                
                {queuedLots.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#6b7280", 
                    padding: "20px" 
                  }}>
                    Nessun prodotto in coda
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {queuedLots.map((lot) => (
                      <div 
                        key={lot.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px",
                          background: "#f8fafc",
                          borderRadius: "8px"
                        }}
                      >
                        {lot.image_url && (
                          <img 
                            src={lot.image_url} 
                            alt={lot.title}
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              borderRadius: "6px"
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                            {lot.title}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                            {fmtEUR(lot.start_price)}
                          </div>
                        </div>
                        <button 
                          className="btn btn-primary"
                          onClick={() => startLot(lot.id)}
                          style={{ fontSize: "0.875rem", padding: "6px 12px" }}
                        >
                          Avvia
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COLONNA 2: Aggiungi Prodotto & Venduti */}
            <div>
              {/* Form Nuovo Prodotto */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", fontWeight: 600 }}>
                  ➕ Aggiungi Prodotto
                </h2>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input
                    type="text"
                    placeholder="Titolo prodotto"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, title: e.target.value }))}
                    style={{
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.875rem"
                    }}
                  />
                  
                  <textarea
                    placeholder="Descrizione (opzionale)"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      resize: "vertical"
                    }}
                  />
                  
                  <input
                    type="number"
                    placeholder="Prezzo di partenza"
                    value={newProduct.start_price}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, start_price: e.target.value }))}
                    step="0.5"
                    min="0"
                    style={{
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.875rem"
                    }}
                  />
                  
                  <input
                    type="url"
                    placeholder="URL immagine (opzionale)"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))}
                    style={{
                      padding: "12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.875rem"
                    }}
                  />
                  
                  <button 
                    className="btn btn-primary"
                    onClick={addProduct}
                    disabled={adding || !newProduct.title || !newProduct.start_price}
                  >
                    {adding ? "Aggiunta..." : "Aggiungi alla Coda"}
                  </button>
                </div>
              </div>

              {/* Prodotti Venduti */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", fontWeight: 600 }}>
                  ✅ Venduti ({soldLots.length})
                </h2>
                
                {soldLots.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#6b7280", 
                    padding: "20px" 
                  }}>
                    Nessun prodotto venduto ancora
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {soldLots.map((lot) => (
                      <div 
                        key={lot.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px",
                          background: "#f0fdf4",
                          borderRadius: "6px",
                          border: "1px solid #bbf7d0"
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                            {lot.title}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: "0.875rem", 
                          fontWeight: 600,
                          color: "#059669" 
                        }}>
                          Venduto ✓
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* COLONNA 3: Chat e Offerte */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Chat */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px",
                height: "400px",
                display: "flex",
                flexDirection: "column"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.125rem", fontWeight: 600 }}>
                  💬 Chat ({messages.length})
                </h2>
                
                <div style={{ 
                  flex: 1, 
                  overflowY: "auto", 
                  marginBottom: "12px",
                  fontSize: "0.875rem"
                }}>
                  {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: "8px" }}>
                      <span style={{ fontWeight: 600, color: "#6366f1" }}>
                        {msg.username}:
                      </span>
                      {" "}
                      <span>{msg.text}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Scrivi un messaggio..."
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem"
                    }}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={sendChatMessage}
                    style={{ fontSize: "0.875rem", padding: "8px 12px" }}
                  >
                    Invia
                  </button>
                </div>
              </div>

              {/* Offerte Correnti */}
              <div style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "20px"
              }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "1.125rem", fontWeight: 600 }}>
                  💰 Offerte ({bids.length})
                </h2>
                
                {bids.length === 0 ? (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#6b7280", 
                    padding: "20px",
                    fontSize: "0.875rem"
                  }}>
                    {currentLot ? "Nessuna offerta ancora" : "Seleziona un prodotto"}
                  </div>
                ) : (
                  <div style={{ 
                    maxHeight: "300px", 
                    overflowY: "auto",
                    fontSize: "0.875rem"
                  }}>
                    {bids.map((bid, idx) => (
                      <div 
                        key={bid.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom: idx < bids.length - 1 ? "1px solid #f3f4f6" : "none"
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {bid.username}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                            {new Date(bid.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <div style={{ 
                          fontWeight: 700,
                          color: idx === 0 ? "#10b981" : "#6b7280",
                          fontSize: idx === 0 ? "1rem" : "0.875rem"
                        }}>
                          {fmtEUR(bid.amount)}
                          {idx === 0 && " 🏆"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
// LiveNew.jsx - BIDLi Mobile Live Streaming
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LiveVideoStream from "../components/LiveVideoStream";
import LiveVideoPlayer from "../components/LiveVideoPlayer";
import CheckoutModal from "../components/CheckoutModal";
import { useViewerCount, useFormattedViewerCount } from "../hooks/useViewerCount";
import LiveReviewsSystem from "../components/LiveReviewsSystem";
import "../styles/live-new.css";

const fmtEUR = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    Number(n || 0)
  );
const minInc = (p) => (p < 10 ? 0.5 : p < 50 ? 1 : p < 200 ? 2 : 5);

export default function LiveNew() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  
  console.log('🚀 LIVE PAGE LOADED - Route ID:', routeId);
  console.log('🔍 URL completo:', window.location.href);
  console.log('🔍 Path:', window.location.pathname);

  // live data
  const [live, setLive] = useState(null);
  
  // Tracking spettatori in tempo reale
  const { viewerCount, totalViewers, isLoading: viewersLoading } = useViewerCount(live?.id || null);
  const formattedViewerCount = useFormattedViewerCount(viewerCount);
  const [liveVideoActive, setLiveVideoActive] = useState(false);

  // lotto corrente
  const [currentLot, setCurrentLot] = useState(null);
  const [allLots, setAllLots] = useState([]);

  // Chat - messaggi persistenti
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const chatEndRef = useRef(null);

  // Offerte
  const [currentPrice, setCurrentPrice] = useState(0);
  const [bid, setBid] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [customBid, setCustomBid] = useState(''); // Campo personalizzato per rilanci

  // UI: tab
  const [tab, setTab] = useState("chat"); // "chat" | "offerte"
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ LIVE MODE - Nascondi bottom bar durante live
  useEffect(() => {
    console.log('🎥 LiveNew: Activating live-mode (hiding bottom bar)');
    document.body.classList.add('live-mode');
    
    return () => {
      console.log('🎥 LiveNew: Deactivating live-mode (showing bottom bar)');
      document.body.classList.remove('live-mode');
    };
  }, []); // Solo mount/unmount
  
  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  
  // Mobile overlay messages
  const [overlayMessages, setOverlayMessages] = useState([]);
  
  // Countdown viewer (for anti-sniping display)
  const [viewerCountdown, setViewerCountdown] = useState(0);
  
  // Video sticky e scroll
  const [scrollY, setScrollY] = useState(0);
  const [showPiP, setShowPiP] = useState(false);
  
  // Detect mobile e scroll
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // PiP mode se scrolla molto in basso
      setShowPiP(currentScrollY > 400);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Handle overlay messages for mobile
  useEffect(() => {
    // Keep only last 6 messages for overlay
    const recentMessages = messages.slice(-6).map((msg, idx) => ({
      ...msg,
      id: msg.id || Date.now() + idx,
      timestamp: Date.now()
    }));
    
    setOverlayMessages(recentMessages);
  }, [messages]);

  // Nasconde header e bottom bar durante live per esperienza immersiva
  useEffect(() => {
    // Forza header nascosto durante live
    document.body.classList.add('header-hidden');
    // Aggiungi classe per nascondere bottom bar su mobile
    document.body.classList.add('live-mode');
    
    return () => {
      // Ripristina header e bottom bar quando si esce dalla live
      document.body.classList.remove('header-hidden');
      document.body.classList.remove('live-mode');
    };
  }, []);


  /** Load live data with seller information */
  useEffect(() => {
    let active = true;
    (async () => {
      // live - USA API LOCALE invece di Supabase
      let row = null;
      // CORREZIONE UUID: Non cercare nel DB se routeId è "new" 
      if (routeId && routeId !== 'new') {
        try {
          const response = await fetch(`/api/lives/${routeId}`);
          if (response.ok) {
            const liveData = await response.json();
            // Converti il formato API locale al formato atteso
            // L'API restituisce già tutti i dati flat - li assegno direttamente
            row = liveData;
          }
        } catch (error) {
          console.error('Errore caricamento live:', error);
        }
      } else {
        // Se non c'è routeId specifico, errore
        row = null;
      }

      console.log('🔍 RAW API DATA:', row);
      
      const normalized = row
        ? {
            id: row.id,
            title: row.title,
            status: row.status,
            current_lot_id: row.current_lot_id,
            category_label: row.category_label || 'Categoria',
            seller_id: row.seller_id || null,
            seller_user_id: row.seller_user_id, // NON fare || null qui!
            seller_display_name: row.seller_display_name || "Venditore",
            seller_handle: row.seller_handle || "seller", 
            seller_avatar_url: row.seller_avatar_url || null,
            viewers: row.viewers ?? 0,
            start_price: row.start_price ?? 0,
          }
        : null;
        
      console.log('🔍 NORMALIZED DATA:', normalized);

      if (!active) return;
      setLive(normalized);

      console.log('🎯 LiveNew (BUYER): Live data loaded successfully');
    })();

    return () => {
      active = false;
    };
  }, [routeId]);

  /** Carica lotto corrente + prezzo attuale */
  useEffect(() => {
    // SKIP for /live/new since live object is null
    if (!live?.id && routeId !== 'new') return;

    let mounted = true;

    (async () => {
      console.log('🔴 CARICAMENTO LOTTO - Live:', live?.id, 'Current Lot ID:', live?.current_lot_id);
      
      if (live.current_lot_id) {
        const { data: lot } = await supabase
          .from("live_lots")
          .select("id, title, image_url, start_price, status")
          .eq("id", live.current_lot_id)
          .maybeSingle();

        console.log('🔴 LOTTO CARICATO:', lot);
        if (mounted) setCurrentLot(lot || null);

        const { data: tb } = await supabase
          .from("bids")
          .select("amount")
          .eq("lot_id", live.current_lot_id)
          .order("amount", { ascending: false })
          .limit(1);

        const top = tb?.[0]?.amount ?? 0;
        const base = top || lot?.start_price || live.start_price || 0;
        setCurrentPrice(base);
        setBid(Number((base + minInc(base)).toFixed(2)));
      } else {
        console.log('🔴 NESSUN LOTTO CORRENTE - caricando il primo disponibile');
        
        // Carica tutti i lotti della live dall'API locale
        try {
          const lotsResponse = await fetch(`/api/live-lots/live/${live.id}`);
          if (lotsResponse.ok) {
            const allLotsData = await lotsResponse.json();
            setAllLots(allLotsData || []);
            
            // Trova il primo lotto attivo o in coda
            const firstLot = allLotsData.find(lot => 
              lot.status === 'active' || lot.status === 'queued'
            );
            
            if (firstLot && mounted) {
              console.log('🔴 PRIMO LOTTO TROVATO:', firstLot);
              setCurrentLot(firstLot);
            } else {
              console.log('🔴 NESSUN LOTTO ATTIVO TROVATO');
              setCurrentLot(null);
            }
          } else {
            console.log('🔴 ERRORE CARICAMENTO LOTTI');
            setAllLots([]);
            setCurrentLot(null);
          }
        } catch (error) {
          console.error('Errore caricamento lotti:', error);
          setAllLots([]);
          setCurrentLot(null);
        }
      }
    })();

    // realtime: se cambia il current_lot in lives
    if (!live?.id) return;
    
    const chLive = supabase
      .channel("live_" + live.id)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${live.id}` },
        async (payload) => {
          const newLotId = payload.new.current_lot_id;
          if (!newLotId) {
            setCurrentLot(null);
            const base = payload.new.start_price || 0;
            setCurrentPrice(base);
            setBid(Number((base + minInc(base)).toFixed(2)));
            return;
          }
          const { data: lot } = await supabase
            .from("live_lots")
            .select("id, title, image_url, start_price, status")
            .eq("id", newLotId)
            .maybeSingle();
          setCurrentLot(lot || null);

          const { data: tb } = await supabase
            .from("bids")
            .select("amount")
            .eq("lot_id", newLotId)
            .order("amount", { ascending: false })
            .limit(1);
          const top = tb?.[0]?.amount ?? 0;
          const base = top || lot?.start_price || live.start_price || 0;
          setCurrentPrice(base);
          setBid(Number((base + minInc(base)).toFixed(2)));
        }
      )
      .subscribe();

    // Sottoscrizione per eventi real-time (countdown)
    const chEvents = supabase
      .channel(`live-events-${live.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'live_events', filter: `live_id=eq.${live.id}` },
        (payload) => {
          const event = payload.new;
          console.log('📡 EVENTO LIVE:', event);
          
          // Se è un countdown e l'utente non è il venditore
          if (event.event_type === 'countdown_start') {
            setViewerCountdown(event.event_data?.seconds || 10);
            setCountdownActive(true);
          }
          
          // Estensione countdown per anti-sniping
          if (event.event_type === 'countdown_extended') {
            const newTime = event.event_data?.seconds || 30;
            {
              setViewerCountdown(newTime);
            }
            console.log(`⏰ COUNTDOWN ESTESO: ${newTime}s`);
          }
          
          // Countdown fermato
          if (event.event_type === 'countdown_stop') {
            setCountdownActive(false);
            setViewerCountdown(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chLive);
      supabase.removeChannel(chEvents);
      mounted = false;
    };
  }, [live?.id, live?.current_lot_id]); // eslint-disable-line

  // 🎯 COUNTDOWN INTERVAL MANAGEMENT
  useEffect(() => {
    // Gestisce il countdown del seller
    if (countdownActive && countdown > 0 && isSeller) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          const newValue = prev - 1;
          
          // Auto-close asta quando raggiunge 0
          if (newValue <= 0) {
            setCountdownActive(false);
            if (currentLot?.id) {
              console.log('🏁 COUNTDOWN TERMINATO - Auto-close asta');
              // Per demo, non chiudiamo automaticamente
              // autoCloseAuction();
            }
            return 0;
          }
          
          return newValue;
        });
      }, 1000);
      
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    }
    
    // Gestisce il countdown dei viewer (sincronizzato via eventi)
    if (countdownActive && viewerCountdown > 0 && !isSeller) {
      const viewerInterval = setInterval(() => {
        setViewerCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      return () => clearInterval(viewerInterval);
    }
  }, [countdownActive, countdown, viewerCountdown, isSeller, currentLot?.id]);

  // Sincronizza display countdown per viewer
  useEffect(() => {
    if (!isSeller && countdownActive) {
      setCountdown(viewerCountdown);
    }
  }, [viewerCountdown, isSeller, countdownActive]);

  /** Chat & offerte realtime (chat per tutta la live, bids sul lotto) */
  useEffect(() => {
    if (!live?.id) return;

    let subMsgs, chBids;

    (async () => {
      // chat - carica messaggi esistenti preservandoli
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, username, text, created_at")
        .eq("live_id", live.id)
        .order("created_at", { ascending: true })
        .limit(300);
      
      const loadedMessages = msgs || [];
      
      // Aggiungi messaggi demo se non ce ne sono
      if (loadedMessages.length === 0) {
        const demoMessages = [
          { id: 'd1', username: 'Marco_92', text: 'Ciao a tutti! 👋' },
          { id: 'd2', username: 'VintageQueen', text: 'Bellissima questa camicia!' },
          { id: 'd3', username: 'CollectorItaly', text: 'Quanto parte?' },
          { id: 'd4', username: 'FashionLover', text: 'Stupenda! La voglio!' },
          { id: 'd5', username: 'Milano_Style', text: 'Che taglia è?' },
          { id: 'd6', username: 'Vintage_Fan', text: 'Meravigliosa! 😍' },
          { id: 'd7', username: 'ItaliaVintage', text: 'Quando inizia?' }
        ];
        setMessages(demoMessages);
      } else {
        setMessages(loadedMessages);
      }

      subMsgs = supabase
        .channel("messages_" + live.id)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `live_id=eq.${live.id}` },
          (payload) => {
            setMessages((prev) => {
              // Evita duplicati
              const exists = prev.find(m => m.id === payload.new.id);
              if (exists) return prev;
              
              // Mantieni solo ultimi 50 messaggi per performance
              const newMessages = [...prev, payload.new];
              return newMessages.slice(-50);
            });
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        )
        .subscribe();
    })();

    // bids sul lotto corrente
    async function bindBids(lotId) {
      if (!lotId) return;
      const { data: tb } = await supabase
        .from("bids")
        .select("amount")
        .eq("lot_id", lotId)
        .order("amount", { ascending: false })
        .limit(1);
      const top = tb?.[0]?.amount ?? 0;
      const base = top || currentLot?.start_price || live.start_price || 0;
      setCurrentPrice(base);
      setBid(Number((base + minInc(base)).toFixed(2)));

      chBids = supabase
        .channel("bids_" + lotId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids", filter: `lot_id=eq.${lotId}` },
          (payload) => {
            const a = Number(payload.new.amount || 0);
            setCurrentPrice((prev) => (a > prev ? a : prev));
            const baseNow = Math.max(a, prev);
            setBid(Number((baseNow + minInc(baseNow)).toFixed(2)));
          }
        )
        .subscribe();
    }

    if (live.current_lot_id) bindBids(live.current_lot_id);

    return () => {
      subMsgs && supabase.removeChannel(subMsgs);
      chBids && supabase.removeChannel(chBids);
    };
  }, [live?.id, currentLot?.id]);

  // Effect per gestire il countdown del venditore
  useEffect(() => {
    let interval;
    if (countdownActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCountdownActive(false);
            // Auto-assegna il prodotto quando il countdown finisce
            assignWinner();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdownActive, countdown]); // eslint-disable-line

  // Effect per gestire il countdown degli spettatori
  useEffect(() => {
    let interval;
    if (viewerCountdown > 0) {
      interval = setInterval(() => {
        setViewerCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewerCountdown]);

  /** Azioni utente (chat/bid) */
  async function sendMessage(e) {
    e?.preventDefault?.();
    const text = msgText.trim();
    if (!text || !live?.id) return;

    let username = "ospite";
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      username =
        auth.user.user_metadata?.name ||
        auth.user.email?.split("@")[0] ||
        "utente";
    } else {
      username = "ospite_" + String(Math.random()).slice(2, 6);
    }

    setMsgText("");
    await supabase.from("messages").insert({
      live_id: live.id,
      user_id: auth?.user?.id || null,
      username,
      text,
    });
  }

  async function placeBid() {
    if (placing || !live?.id || !currentLot?.id) return;
    const amount = Number(bid || 0);

    setPlacing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const username =
        auth?.user?.user_metadata?.name ||
        auth?.user?.email?.split("@")[0] ||
        "offerente";

      // Se è un prodotto demo, aggiorna solo localmente
      if (currentLot.id.startsWith('demo-')) {
        console.log(`💰 OFFERTA DEMO: ${amount}€ su ${currentLot.title}`);
        
        // Anti-sniping per demo: se countdown sotto 30 secondi, estendi
        if (countdownActive && countdown > 0 && countdown <= 30) {
          const extendedTime = Math.max(30, countdown + 30);
          setCountdown(extendedTime);
          console.log(`⏰ ANTI-SNIPING: Countdown esteso a ${extendedTime}s`);
        }
        
        // Aggiorna stato locale solo per demo
        setCurrentPrice(amount);
        setCurrentLot(prev => ({ ...prev, current_price: amount }));
        setBid(Number((amount + minInc(amount)).toFixed(2)));
        
        return;
      }

      // Per prodotti reali, salva nel database
      const { error: bidError } = await supabase.from("bids").insert({
        live_id: live.id,
        lot_id: currentLot.id,
        user_id: auth?.user?.id || null,
        username,
        amount,
        type: 'bid'
      });
      if (bidError) throw bidError;

      // Aggiorna il prezzo corrente del lotto nel database
      const { error: updateError } = await supabase
        .from("live_lots")
        .update({ 
          current_price: amount,
          last_bidder_id: auth?.user?.id || null 
        })
        .eq("id", currentLot.id);

      if (updateError) throw updateError;

      // 🎯 ANTI-SNIPING LOGIC: Estendi countdown se offerta negli ultimi 30 secondi
      if (countdownActive && countdown > 0 && countdown <= 30) {
        const extendedTime = Math.max(30, countdown + 30);
        setCountdown(extendedTime);
        
        // Trasmetti estensione countdown a tutti i viewer
        await supabase.from('live_events').insert({
          live_id: live.id,
          event_type: 'countdown_extended',
          event_data: { 
            seconds: extendedTime,
            reason: 'anti_sniping',
            lot_id: currentLot.id
          }
        });
        
        console.log(`⏰ ANTI-SNIPING: Countdown esteso a ${extendedTime}s per offerta last-minute`);
      }

      // Aggiorna stato locale
      setCurrentPrice(amount);
      setCurrentLot(prev => ({ ...prev, current_price: amount }));
      setBid(Number((amount + minInc(amount)).toFixed(2)));
      
      console.log(`💰 OFFERTA PIAZZATA: ${amount}€ su ${currentLot.title}`);

    } catch (e) {
      console.error("Errore offerta:", e);
      alert(e.message || "Offerta rifiutata");
    } finally {
      setPlacing(false);
    }
  }


  async function buyNow() {
    if (!currentLot?.buy_now_price || placing || !live?.id || !currentLot?.id) return;

    const confirmed = window.confirm(
      `🛒 Confermi l'acquisto di "${currentLot.title}" per €${currentLot.buy_now_price}?`
    );
    
    if (!confirmed) return;

    setPlacing(true);
    console.log(`🛒 ACQUISTO IMMEDIATO: €${currentLot.buy_now_price} per "${currentLot.title}"`);
    
    try {
      const { data: auth } = await supabase.auth.getUser();
      const username =
        auth?.user?.user_metadata?.name ||
        auth?.user?.email?.split("@")[0] ||
        "acquirente";

      // Se è un prodotto demo
      if (currentLot.id.startsWith('demo-')) {
        console.log(`🛒 ACQUISTO DEMO: ${currentLot.buy_now_price}€ su ${currentLot.title}`);
        alert(`🎉 ACQUISTO DEMO COMPLETATO! "${currentLot.title}" è tuo per €${currentLot.buy_now_price}!`);
        return;
      }

      // Salva l'acquisto diretto nel database
      const { error: bidError } = await supabase.from("bids").insert({
        live_id: live.id,
        lot_id: currentLot.id,
        user_id: auth?.user?.id || null,
        username,
        amount: parseFloat(currentLot.buy_now_price),
        type: 'buy_now'
      });
      if (bidError) throw bidError;

      // Marca il prodotto come completato con vincitore
      const response = await fetch(`/api/live-lots/${currentLot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          final_price: parseFloat(currentLot.buy_now_price),
          winner_user_id: auth?.user?.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Errore completamento acquisto');
      }
      
      // Ricarica i prodotti per aggiornare la lista
      const lotsResponse = await fetch(`/api/live-lots/live/${live.id}`);
      if (lotsResponse.ok) {
        const updatedLots = await lotsResponse.json();
        setAllLots(updatedLots || []);
      }

      alert(`🎉 ACQUISTO COMPLETATO! "${currentLot.title}" è tuo per €${currentLot.buy_now_price}!`);
      
      // Trova il prossimo prodotto disponibile
      const queuedLots = allLots.filter(l => l.status === 'queued' && l.id !== currentLot.id);
      if (queuedLots.length > 0) {
        setCurrentLot(queuedLots[0]);
        setBid(queuedLots[0].start_price);
        setCurrentPrice(queuedLots[0].start_price);
      } else {
        setCurrentLot(null);
      }
        
      console.log('✅ Acquisto completato con successo');
      
    } catch (error) {
      console.error('❌ Errore acquisto immediato:', error);
      alert('❌ Errore durante l\'acquisto. Riprova!');
    } finally {
      setPlacing(false);
    }
  }

  function bump(multiplier = 1) {
    const currentBase = currentPrice || currentLot?.current_price || currentLot?.start_price || 5;
    const minIncrement = currentLot?.min_bid_increment || 1; // Default €1 se non specificato
    const delta = minIncrement * multiplier;
    const newAmount = currentBase + delta;
    setBid(newAmount);
  }

  // Helper per ottenere incrementi dinamici
  function getDynamicIncrements() {
    const minIncrement = currentLot?.min_bid_increment || 1;
    return {
      first: minIncrement,
      second: minIncrement * 2
    };
  }

  // Rilancio personalizzato - importo come incremento al prezzo attuale
  function handleCustomBid() {
    const increment = parseFloat(customBid);
    if (!increment || increment <= 0) {
      alert(`Inserisci un incremento positivo (es: 5 per aggiungere 5€)`);
      return;
    }
    const currentBase = currentPrice || currentLot?.current_price || currentLot?.start_price || 5;
    const newBid = currentBase + increment;
    setBid(newBid);
    setCustomBid('');
    // Piazza automaticamente l'offerta
    setTimeout(() => placeBid(), 100);
  }


  /** Azioni REGIA per venditore (mini pannello in pagina) */
  async function startNextQueued() {
    if (!live?.id || !isSeller) return;
    
    try {
      console.log('🔄 StartNextQueued: Trovando prossimo in coda...');
      
      // Trova il prossimo lotto in coda dall'array locale
      const queuedLots = allLots.filter(l => l.status === 'queued');
      const nextLot = queuedLots[0];
      
      if (!nextLot) {
        alert("Nessun lotto in coda.");
        return;
      }
      
      console.log('🔄 StartNextQueued: Attivando:', nextLot.title);
      
      // Imposta il lotto corrente come completato (se esiste)
      if (currentLot?.id) {
        await fetch(`/api/live-lots/${currentLot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
      }
      
      // Attiva il prossimo lotto
      const response = await fetch(`/api/live-lots/${nextLot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      
      if (!response.ok) {
        throw new Error('Errore API attivazione lotto');
      }
      
      const activatedLot = await response.json();
      
      // Aggiorna lo stato locale
      setCurrentLot(activatedLot);
      
      // Aggiorna la lista completa
      const lotsResponse = await fetch(`/api/live-lots/live/${live.id}`);
      if (lotsResponse.ok) {
        const updatedLots = await lotsResponse.json();
        setAllLots(updatedLots || []);
      }
      
      console.log('✅ StartNextQueued: ATTIVATO:', activatedLot.title);
      
    } catch (error) {
      console.error('Errore nel passare al prossimo:', error);
      alert('Errore nel passare al prossimo prodotto');
    }
  }


  // Effect per gestire il countdown degli spettatori
  useEffect(() => {
    let interval;
    if (viewerCountdown > 0) {
      interval = setInterval(() => {
        setViewerCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viewerCountdown]);

  /** Azioni utente (chat/bid) */
  async function sendMessage(e) {
    e?.preventDefault?.();
    const text = msgText.trim();
    if (!text || !live?.id) return;

    let username = "ospite";
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user) {
      username =
        auth.user.user_metadata?.name ||
        auth.user.email?.split("@")[0] ||
        "utente";
    } else {
      username = "ospite_" + String(Math.random()).slice(2, 6);
    }

    setMsgText("");
    await supabase.from("messages").insert({
      live_id: live.id,
      user_id: auth?.user?.id || null,
      username,
      text,
    });
  }

  // Aggiorna analytics della live automaticamente  
  async function updateLiveAnalytics() {
    try {
      // Placeholder per analytics buyer
      console.log('📊 Analytics buyer aggiornate');
      return true;
    } catch (e) {
      console.error("Errore aggiornamento analytics:", e.message);
    }
  }

  // Calcola i miei acquisti (per acquirenti)
  async function calculateMyPurchases() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) {
        alert("Devi essere loggato per vedere i tuoi acquisti");
        return;
      }

      // Per demo: simula acquisti
      if (currentLot?.id?.startsWith('demo-')) {
        const demoPurchases = {
          items: [
            {
              title: "Camicia Vintage Demo",
              finalPrice: 16,
              orderId: "demo-order-1"
            }
          ],
          totalAmount: 16,
          itemCount: 1,
          buyerName: "Demo User"
        };
        
        setMyPurchases(demoPurchases);
        setShowMyPurchases(true);
        return;
      }

      // Carica ordini reali dell'utente
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, total_amount,
          lots:order_lots ( lot:lot_id ( title, current_price ) )
        `)
        .eq("live_id", live.id)
        .eq("buyer_id", auth.user.id);

      if (error) throw error;

      const items = [];
      let totalAmount = 0;

      orders?.forEach(order => {
        order.lots?.forEach(lot => {
          items.push({
            title: lot.lot?.title || "Prodotto",
            finalPrice: lot.lot?.current_price || 0,
            orderId: order.id
          });
          totalAmount += lot.lot?.current_price || 0;
        });
      });

      setMyPurchases({
        items,
        totalAmount,
        itemCount: items.length,
        buyerName: auth?.user?.user_metadata?.name || auth?.user?.email || "Tu"
      });
      
      setShowMyPurchases(true);
      
    } catch (e) {
      alert("Errore nel calcolare i tuoi acquisti: " + e.message);
    }
  }

  // Gestione aggiungi prodotto
  const handleAddProduct = async () => {
    if (!newProductTitle || !newProductPrice) {
      alert('Inserisci titolo e prezzo');
      return;
    }
    
    try {
      console.log('🚀 Aggiungendo prodotto via API locale:', {
        live_id: live.id,
        title: newProductTitle,
        start_price: parseFloat(newProductPrice)
      });
      
      // Aggiungi il prodotto via API locale
      const response = await fetch('/api/live-lots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          live_id: live.id,
          title: newProductTitle,
          start_price: parseFloat(newProductPrice),
          buy_now_price: newProductBuyNow ? parseFloat(newProductBuyNow) : null,
          min_bid_increment: parseFloat(newProductMinBid || '1'),
          status: 'queued'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore API');
      }
      
      const newProduct = await response.json();
      console.log('✅ Prodotto aggiunto:', newProduct);
      
      // Aggiorna la lista dei lotti immediatamente
      const lotsResponse = await fetch(`/api/live-lots/live/${live.id}`);
      if (lotsResponse.ok) {
        const updatedLots = await lotsResponse.json();
        setAllLots(updatedLots || []);
      }
      
      alert(`Prodotto "${newProductTitle}" aggiunto con successo!`);
      
      // Chiudi popup e resetta campi
      setSlideOpen(false);
      setNewProductTitle('');
      setNewProductPrice('');
      setNewProductBuyNow('');
      setNewProductMinBid('1');
      setMediaFile(null);
      
    } catch (error) {
      console.error('Errore aggiunta prodotto:', error);
      alert('Errore durante l\'aggiunta del prodotto: ' + error.message);
    }
  };

  if (!live) {
    return (
      <>
        <div className="container section" style={{ textAlign: "center" }}>
          Caricamento live…
        </div>
        <Footer />
      </>
    );
  }

  // Layout mobile: TikTok style - Video fullscreen
  if (isMobile) {
    // STRATEGIA NUCLEARE: Se slideOpen è true, mostra SOLO il form
    if (slideOpen) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #1f2937, #374151)',
          zIndex: 999999,
          color: 'white',
          overflow: 'auto'
        }}>
          {/* Header form gigante */}
          <div style={{
            padding: '30px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            textAlign: 'center',
            borderBottom: '4px solid #000'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }}>
              ➕ AGGIUNGI NUOVO PRODOTTO
            </h1>
            <button
              onClick={() => setSlideOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.3)',
                border: '3px solid white',
                borderRadius: '50%',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>

          {/* Form content gigante */}
          <div style={{
            padding: '40px 30px',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{
              marginBottom: '30px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#f59e0b'
              }}>
                🏷️ Titolo Prodotto
              </label>
              <input
                type="text"
                placeholder="Es: Camicia Vintage Anni '80"
                value={newProductTitle}
                onChange={(e) => setNewProductTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'white',
                  border: '4px solid #f59e0b',
                  borderRadius: '12px',
                  color: 'black',
                  boxSizing: 'border-box',
                  fontSize: '18px',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              marginBottom: '30px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#10b981'
              }}>
                💰 Prezzo di Partenza
              </label>
              <input
                type="number"
                placeholder="Es: 25"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'white',
                  border: '4px solid #10b981',
                  borderRadius: '12px',
                  color: 'black',
                  boxSizing: 'border-box',
                  fontSize: '18px',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              marginBottom: '30px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#ef4444'
              }}>
                🛒 Compra Subito (Opzionale)
              </label>
              <input
                type="number"
                placeholder="Es: 50"
                value={newProductBuyNow}
                onChange={(e) => setNewProductBuyNow(e.target.value)}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'white',
                  border: '4px solid #ef4444',
                  borderRadius: '12px',
                  color: 'black',
                  boxSizing: 'border-box',
                  fontSize: '18px',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              marginBottom: '30px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#f59e0b'
              }}>
                📈 Min Rilancio (Default €1)
              </label>
              <input
                type="number"
                placeholder="1.00"
                value={newProductMinBid}
                onChange={(e) => setNewProductMinBid(e.target.value)}
                style={{
                  width: '100%',
                  padding: '20px',
                  background: 'white',
                  border: '4px solid #f59e0b',
                  borderRadius: '12px',
                  color: 'black',
                  boxSizing: 'border-box',
                  fontSize: '18px',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              marginBottom: '40px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#8b5cf6'
              }}>
                📷 Foto Prodotto (Opzionale)
              </label>
              <label style={{
                display: "block",
                padding: '25px',
                border: "4px dashed #8b5cf6",
                borderRadius: '12px',
                cursor: "pointer",
                color: "#d1d5db",
                background: "rgba(139, 92, 246, 0.1)",
                fontSize: '16px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {mediaFile ? `📷 ${mediaFile.name}` : "📷 Tocca per selezionare foto dal tuo device"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setMediaFile(e.target.files[0] || null)}
                />
              </label>
              {mediaFile && (
                <div style={{ 
                  marginTop: '15px',
                  padding: '15px',
                  background: 'rgba(139, 92, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#d1d5db',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>📷 {(mediaFile.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button
                    onClick={() => setMediaFile(null)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.3)',
                      border: '2px solid #ef4444',
                      borderRadius: '6px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    ✕ Rimuovi
                  </button>
                </div>
              )}
            </div>

            {/* Pulsanti giganti */}
            <div style={{
              display: 'flex',
              gap: '15px',
              marginTop: '40px'
            }}>
              <button
                onClick={() => setSlideOpen(false)}
                style={{
                  flex: 1,
                  padding: '20px',
                  background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '700'
                }}
              >
                ❌ Annulla
              </button>
              <button
                onClick={() => {
                  handleAddProduct();
                  setSlideOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '20px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '700'
                }}
              >
                ✅ Aggiungi Prodotto
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Video Fullscreen Container */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#000',
          zIndex: 10
        }}>
          {/* Video Player Fullscreen - CON LIVESTREAM FUNZIONANTE */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}>
            
            {(() => {
              console.log('🔧 RENDER DECISION:', { isSeller, live: live?.id });
              return isSeller ? (
                // VENDITORE: Mostra la propria camera
                <LiveVideoStream
                  streamId={live?.id || 'new-live-stream'}
                  isSeller={isSeller}
                  autoPlay={true}
                  controls={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '0'
                  }}
                />
              ) : (
                // SPETTATORE: Riceve il video del venditore
                <LiveVideoPlayer
                  roomName={`live-${live?.id}`}
                  participantName={`viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                  style={{
                    width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '0'
                }}
                  onViewerJoin={() => {
                    console.log('👁️ Spettatore mobile connesso alla live');
                  }}
                />
              );
            })()}
          </div>
          
          {/* Top Bar con info venditore */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            zIndex: 20
          }}>
            {/* Profilo Venditore - Cliccabile */}
            <div 
              onClick={() => navigate(`/seller/${live?.seller_handle || 'unknown'}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <img
                src={live?.seller_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(live?.seller_display_name || "V")}&background=6366f1&color=fff&size=40`}
                alt="Venditore"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  transition: 'transform 0.2s ease',
                  ':hover': {
                    transform: 'scale(1.1)'
                  }
                }}
              />
              <div>
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)'
                }}>
                  {live?.seller_display_name || "Venditore"}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '12px',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⭐ 5.00 • {live?.category_label || "Vintage"}
                </div>
              </div>
            </div>
            
            {/* Live Badge + Spettatori */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                🔴 LIVE
              </div>
              
              {/* Badge spettatori prominente stile Foto 2 */}
              <div style={{
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                👁️ {formattedViewerCount || '30'}
              </div>
            </div>
          </div>
          
          {/* Controlli laterali stile Foto 2 */}
          <div style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            zIndex: 25
          }}>
            {/* Seguir */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#000' }}>👤</span>
            </div>
            
            {/* Audio */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '18px', color: 'white' }}>🔊</span>
            </div>
            
            {/* Condividi */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '16px', color: 'white' }}>↗️</span>
            </div>
            
            {/* Store */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '18px', color: 'white' }}>🏪</span>
            </div>
          </div>
          
          {/* Chat overlay sinistra stile Foto 2 */}
          <div style={{
            position: 'absolute',
            left: '16px',
            bottom: '200px',
            width: '60%',
            maxHeight: '300px',
            zIndex: 25
          }}>
            {overlayMessages.slice(-4).map((msg, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  fontSize: '12px',
                  lineHeight: 1.3,
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontWeight: 600, color: '#40e0d0' }}>
                  {msg.username}:
                </span>{' '}
                {msg.text}
              </div>
            ))}
          </div>
          
          {/* Area prodotto e pulsanti offerta stile Foto 2 */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3))',
            padding: '24px 16px 32px',
            zIndex: 25
          }}>
            {/* Info prodotto */}
            {currentLot && (
              <div style={{
                marginBottom: '16px',
                color: 'white'
              }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  lineHeight: 1.2
                }}>
                  {currentLot.title || "Prodotto in asta"}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#ff6b35'
                }}>
                  {fmtEUR(currentPrice || currentLot.start_price || 0)}
                </div>
                
                {/* 🎯 COUNTDOWN TIMER DISPLAY */}
                {(countdownActive || countdown > 0) && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: countdown <= 10 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                    borderRadius: '20px',
                    animation: countdown <= 10 ? 'pulse 1s infinite' : 'none'
                  }}>
                    <div style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 700
                    }}>
                      ⏰ {Math.max(0, Math.floor(countdown))}s
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '12px'
                    }}>
                      {countdown <= 10 ? 'ULTIMI SECONDI!' : 'tempo rimasto'}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Pulsanti offerta stile Foto 2 */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              {/* Mi puja (scuro) */}
              <button
                onClick={() => placeBid()}
                disabled={placing || !currentLot}
                style={{
                  flex: '0.4',
                  padding: '16px 20px',
                  background: 'rgba(30, 30, 30, 0.9)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: currentLot ? 'pointer' : 'not-allowed',
                  opacity: currentLot ? 1 : 0.5,
                  backdropFilter: 'blur(10px)'
                }}
              >
                Mi puja
              </button>
              
              {/* Pujar amount (arancione) */}
              <button
                onClick={() => placeBid()}
                disabled={placing || !currentLot}
                style={{
                  flex: '1',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #ff6b35, #f59e0b)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: currentLot ? 'pointer' : 'not-allowed',
                  opacity: currentLot ? 1 : 0.5,
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)'
                }}
              >
                Pujar {fmtEUR(bid || 0)} →
              </button>
            </div>
          </div>
        </div>
        
      </>
    );
  }

  // Layout desktop continua qui...
  return (
    <div className="live-page-desktop">
      <div className="container">
        {/* Desktop layout per live */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '20px',
          minHeight: '80vh'
        }}>
          {/* Video principale */}
          <div style={{
            background: '#000',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {(() => {
              console.log('🔧 DESKTOP RENDER DECISION:', { isSeller, live: live?.id });
              return isSeller ? (
                <LiveVideoStream
                  streamId={live?.id || 'new-live-stream'}
                  isSeller={isSeller}
                  autoPlay={true}
                  controls={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <LiveVideoPlayer
                  roomName={`live-${live?.id}`}
                  participantName={`viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onViewerJoin={() => {
                    console.log('👁️ Spettatore desktop connesso alla live');
                  }}
                />
              );
            })()}
          </div>
          
          {/* Sidebar desktop */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            
            {/* Sistema recensioni e spettatori reali */}
            <LiveReviewsSystem
              liveId={live?.id}
              sellerId={live?.seller_id}
              isVisible={true}
              onViewerCountChange={(count) => {
                console.log('👁️ Viewer count aggiornato:', count);
                // Aggiorna stato spettatori reali
              }}
            />
            
            {/* LISTA PRODOTTI IN CODA - Solo se venditore */}
            {isSeller && allLots && allLots.length > 0 && (
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '12px',
                padding: '8px 10px',
                minWidth: '140px',
                maxWidth: '160px',
                marginBottom: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <div style={{
                  color: '#f59e0b',
                  fontSize: '10px',
                  fontWeight: '700',
                  marginBottom: '6px',
                  textAlign: 'center'
                }}>
                  📋 CODA ({allLots.filter(l => l.status !== 'completed').length})
                </div>
                {allLots.filter(l => l.status !== 'completed').map((lot, index) => (
                  <div 
                    key={lot.id}
                    onClick={() => selectProduct(lot)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 6px',
                      background: lot.id === currentLot?.id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(75, 85, 99, 0.2)',
                      border: lot.id === currentLot?.id ? '1px solid #10b981' : '1px solid rgba(156, 163, 175, 0.2)',
                      borderRadius: '6px',
                      marginBottom: '3px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{
                      background: lot.id === currentLot?.id ? '#10b981' : '#6b7280',
                      color: 'white',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      fontWeight: '700'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{
                      color: 'white',
                      flex: 1,
                      fontSize: '9px',
                      fontWeight: '500'
                    }}>
                      {(lot.title || "Prodotto").substring(0, 10)}
                      {(lot.title || "Prodotto").length > 10 && "..."}
                    </div>
                    <div style={{
                      color: lot.id === currentLot?.id ? '#10b981' : 'rgba(255,255,255,0.6)',
                      fontSize: '8px'
                    }}>
                      {lot.id === currentLot?.id ? '🔴' : '⏳'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Prezzo Corrente */}
            <div style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '24px',
              textAlign: 'center',
              minWidth: '80px'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{Number(currentPrice || currentLot?.current_price || currentLot?.start_price || 5).toFixed(2)}€</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>OFFERTA</div>
              <div style={{ 
                fontSize: '9px', 
                marginTop: '4px',
                color: '#f59e0b',
                fontWeight: '600'
              }}>
                {currentLot?.title || "Prodotto in asta"}
              </div>
            </div>
            
            {/* Pulsanti Rilancio per Spettatori - SEMPRE VISIBILI PER TEST */}
            {!isSeller && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <button
                  onClick={() => placeBid()}
                  disabled={placing || !currentLot}
                  style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #ff6b35, #f59e0b)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: currentLot ? 'pointer' : 'not-allowed',
                    opacity: currentLot ? 1 : 0.5
                  }}
                >
                  🔥 Fai Offerta {fmtEUR(bid || 0)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

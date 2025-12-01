// src/pages/Discover.jsx - Griglia compatta moderna per scoprire live
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getCurrentRole, getCurrentSession } from "../lib/globalRole";
import CompactLiveCard from "../components/CompactLiveCard";
import StoriesBar from "../components/StoriesBar";
import StoryViewer from "../components/StoryViewer";
import LoadingPage from "../components/LoadingPage";
import { Heart, Star, Users, UserPlus } from "lucide-react";

export default function Discover() {
  const navigate = useNavigate();
  const [lives, setLives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [trendingSellers, setTrendingSellers] = useState([]);
  const [followingStatus, setFollowingStatus] = useState({});
  const [session, setSession] = useState(null);
  const [stories, setStories] = useState([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Carica live dal database
  useEffect(() => {
    const fetchLives = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("lives")
          .select(`
            id, title, status, viewers,
            seller:seller_id ( display_name, handle, avatar_url ),
            category:category_id ( label )
          `)
          .eq("status", "live")
          .order("viewers", { ascending: false })
          .limit(20);

        if (error) throw error;

        // Trasforma i dati per la compatibilità
        const transformedLives = data?.map(live => ({
          id: live.id,
          seller_handle: live.seller?.handle || 'unknown',
          seller_display_name: live.seller?.display_name || 'Venditore',
          seller_avatar_url: live.seller?.avatar_url,
          category_label: live.category?.label || 'Live',
          viewer_count: live.viewers || 0,
          current_lot_title: live.title || 'Asta in corso',
          current_price: Math.floor(Math.random() * 50) + 10 // Prezzo simulato
        })) || [];

        // Dati demo per Discover con negozi vintage italiani e immagini copertina
        const demoLives = [
          {
            id: 1,
            seller_handle: "vintagemilano",
            seller_display_name: "Vintage Milano",
            category_label: "Fashion",
            current_lot_title: "Giacche Vintage Anni '80 - Selezione Esclusiva",
            startTime: "Ora",
            scheduled: false,
            viewer_count: 432,
            cover_image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=400&fit=crop"
          },
          {
            id: 2,
            seller_handle: "retroroma",
            seller_display_name: "Retro Roma",
            category_label: "Sneakers",
            current_lot_title: "Jordan e Nike Vintage Rare Collection",
            startTime: "Domani - 21:00",
            scheduled: true,
            scheduledDate: "Martedì 10 Gen",
            scheduledTime: "21:00",
            duration: "2h",
            reminderSet: false,
            cover_image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=400&fit=crop"
          },
          {
            id: 3,
            seller_handle: "napolitrend",
            seller_display_name: "Napoli Trend",
            category_label: "Electronics",
            current_lot_title: "Console e Gaming Vintage - PlayStation Rare",
            startTime: "Ora",
            scheduled: false,
            viewer_count: 287,
            cover_image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=400&fit=crop"
          },
          {
            id: 4,
            seller_handle: "torinoantico",
            seller_display_name: "Torino Antico",
            category_label: "Collectibles",
            current_lot_title: "Orologi e Gioielli Vintage Certificati",
            startTime: "Ven 11 Gen - 19:30",
            scheduled: true,
            scheduledDate: "Venerdì 11 Gen",
            scheduledTime: "19:30",
            duration: "3h",
            reminderSet: true,
            cover_image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=400&fit=crop"
          },
          {
            id: 5,
            seller_handle: "genovalux",
            seller_display_name: "Genova Luxury",
            category_label: "Fashion",
            current_lot_title: "Borse Designer Vintage - Hermès, Chanel, Gucci",
            startTime: "Sab 12 Gen - 15:30",
            scheduled: true,
            scheduledDate: "Sabato 12 Gen",
            scheduledTime: "15:30",
            duration: "4h",
            reminderSet: false,
            cover_image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=400&fit=crop"
          },
          {
            id: 6,
            seller_handle: "bolognastyle",
            seller_display_name: "Bologna Style",
            category_label: "Home Design",
            current_lot_title: "Mobili e Design Anni '70 - Modernariato",
            startTime: "Dom 13 Gen - 17:00",
            scheduled: true,
            scheduledDate: "Domenica 13 Gen",
            scheduledTime: "17:00",
            duration: "2.5h",
            reminderSet: false,
            cover_image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=400&fit=crop"
          }
        ];
        
        if (transformedLives.length === 0) {
          setLives(demoLives);
        } else {
          setLives([...transformedLives, ...demoLives]);
        }
      } catch (error) {
        console.error("Errore caricamento live:", error);
        // Demo fallback in caso di errore
        setLives([{
          id: 1,
          seller_handle: "vintagemilano",
          seller_display_name: "Vintage Milano",
          category_label: "Fashion",
          current_lot_title: "Collezione Vintage",
          startTime: "Ora",
          scheduled: false,
          viewer_count: 432,
          cover_image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&h=400&fit=crop"
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLives();
    loadUserSession();
    loadTrendingSellers();
    loadStories();
  }, []);

  // 🎭 Carica stories demo per tutte le categorie
  const loadStories = () => {
    const demoStories = [
      {
        id: 'story-1',
        seller_handle: 'vintagemilano',
        seller_display_name: 'Vintage Milano',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VintageMilano',
        sponsored: false,
        category: 'Fashion',
        content: 'Nuova collezione vintage anni 80 in arrivo! 🔥',
        background_color: '#FF6B6B',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 ore fa
      },
      {
        id: 'story-2',
        seller_handle: 'retroroma',
        seller_display_name: 'Retro Roma',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RetroRoma',
        sponsored: false,
        category: 'Sneakers',
        content: 'Jordan 1 del 1985 autentiche! Non perdertele 👟',
        background_color: '#4ECDC4',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'story-3',
        seller_handle: 'torinoantico',
        seller_display_name: 'Torino Antico',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TorinoAntico',
        sponsored: false,
        category: 'Collectibles',
        content: 'Rolex vintage anni 70 - solo oggi! ⌚',
        background_color: '#45B7D1',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'story-4',
        seller_handle: 'genovalux',
        seller_display_name: 'Genova Luxury',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=GenovaLux',
        sponsored: false,
        category: 'Fashion',
        content: 'Hermès Birkin del 1995 - pezzo da collezione! 👜',
        background_color: '#9C88FF',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'story-6',
        seller_handle: 'bolognastyle',
        seller_display_name: 'Bologna Style',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=BolognaStyle',
        sponsored: false,
        category: 'Home Design',
        content: 'Mobili anni 70 unici! Design italiano 🏠',
        background_color: '#FFB347',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    setStories(demoStories);
  };

  // Carica sessione utente
  const loadUserSession = async () => {
    const currentSession = getCurrentSession();
    setSession(currentSession);
  };

  // Carica venditori in tendenza (collegati al sistema ads)
  const loadTrendingSellers = async () => {
    try {
      // Prima prova a caricare venditori con ads attivi
      const adsResponse = await fetch('/api/ads/trending-sellers');
      if (adsResponse.ok) {
        const adsSellers = await adsResponse.json();
        setTrendingSellers(adsSellers);
        return;
      }
    } catch (error) {
      console.log('Ads API non disponibile, uso dati demo');
    }

    // Fallback: dati demo per venditori premium
    const demoTrendingSellers = [
      {
        id: 'trending-1',
        handle: 'vintageking_milano',
        display_name: 'VintageKing Milano',
        specialty: 'Sneakers & Streetwear Premium',
        followers_count: 12500,
        rating: 4.9,
        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=VintageKing',
        verified: true,
        lives_this_month: 15,
        is_premium_sponsor: true,
        bio: 'I migliori sneakers vintage e streetwear autentici dal 1985'
      },
      {
        id: 'trending-2',
        handle: 'funkomaster_roma',
        display_name: 'FunkoMaster Roma',
        specialty: 'Funko Pop & Collectibles',
        followers_count: 8200,
        rating: 4.8,
        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=FunkoMaster',
        verified: true,
        lives_this_month: 22,
        is_premium_sponsor: true,
        bio: 'Funko Pop rari e limited edition, sempre autentici'
      },
      {
        id: 'trending-3',
        handle: 'techtraders_torino',
        display_name: 'TechTraders Torino',
        specialty: 'Gaming & Retro Tech',
        followers_count: 15700,
        rating: 4.9,
        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=TechTraders',
        verified: true,
        lives_this_month: 18,
        is_premium_sponsor: true,
        bio: 'Console vintage, gaming e tecnologia retro certificata'
      },
      {
        id: 'trending-4',
        handle: 'cardcollector_napoli',
        display_name: 'CardCollector Napoli',
        specialty: 'TCG & Sport Cards',
        followers_count: 9800,
        rating: 4.7,
        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=CardCollector',
        verified: true,
        lives_this_month: 12,
        is_premium_sponsor: true,
        bio: 'Carte da gioco e sportive rare, grading professionale'
      }
    ];
    
    setTrendingSellers(demoTrendingSellers);
  };

  // Gestione follow/unfollow
  const handleFollowToggle = async (sellerId) => {
    if (!session?.user?.id) {
      // Apri modal login
      window.dispatchEvent(new CustomEvent('auth:open'));
      return;
    }

    try {
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: session.user.id,
          followingId: sellerId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setFollowingStatus(prev => ({
          ...prev,
          [sellerId]: result.action === 'followed'
        }));
        
        // Aggiorna il conteggio follower
        setTrendingSellers(prev => prev.map(seller => 
          seller.id === sellerId 
            ? { 
                ...seller, 
                followers_count: seller.followers_count + (result.action === 'followed' ? 1 : -1)
              }
            : seller
        ));
      }
    } catch (error) {
      console.error('Errore follow toggle:', error);
    }
  };

  // Gestione click su card
  const handleCardClick = (live) => {
    if (live.scheduled) {
      // Live programmata - mostra dettagli o imposta reminder
      console.log('Live programmata:', live);
      alert(`⏰ Live programmata per ${live.scheduledDate} alle ${live.scheduledTime}. Vuoi impostare un reminder?`);
    } else {
      // Live attiva - mostra loading page e naviga con routing intelligente
      setShowLoading(true);
      
      setTimeout(() => {
        setShowLoading(false);
        
        // Routing intelligente basato su ruolo utente usando sistema real-time
        const currentRole = getCurrentRole();
        const currentSession = getCurrentSession();
        
        if (currentRole === 'seller' && currentSession?.user?.id) {
          // È un seller → dashboard venditore
          navigate(`/live/${live.id}?role=seller`);
        } else {
          // È buyer o guest → interfaccia spettatore
          navigate(`/live/${live.id}?role=buyer`);
        }
      }, 1500);
    }
  };

  // Popup condivisione
  const [showSharePopup, setShowSharePopup] = useState(null);

  const handleShare = (live, e) => {
    e.stopPropagation();
    setShowSharePopup(live);
  };

  const shareToSocial = (platform, live) => {
    const url = `${window.location.origin}/live/${live.id}`;
    const text = `Guarda questa live su BIDLi: "${live.current_lot_title}" by ${live.seller_display_name}`;
    
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        break;
      case 'instagram':
        navigator.clipboard.writeText(url);
        alert('Link copiato! Incollalo nelle tue storie Instagram');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent('Live BIDLi')}&body=${encodeURIComponent(text + '\n\n' + url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copiato negli appunti!');
        break;
    }
    setShowSharePopup(null);
  };

  if (showLoading) {
    return (
      <LoadingPage
        text="BIDLi"
        subtitle="Caricamento live..."
        onLoadComplete={() => {
          setShowLoading(false);
          navigate('/live/demo-live');
        }}
      />
    );
  }

  return (
    <div style={{
      minHeight: '300vh', // 🚨 FORZA SCROLL WINDOW AGGRESSIVO - 3 volte altezza
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      paddingTop: '120px', // Spazio per header mobile
      paddingBottom: '100px' // Spazio per bottom bar
      // 💥 RIMOSSO overflowY: scroll - DEVE scrollare la window!
    }}>
      {/* ✨ Stories Bar - Instagram Style */}
      <StoriesBar 
        stories={stories} 
        onOpen={(index) => {
          setCurrentStoryIndex(index);
          setStoryViewerOpen(true);
        }} 
      />

      {/* Header */}
      <div style={{
        padding: '0 16px 24px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          Scopri Live
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '16px',
          margin: 0
        }}>
          Trova le migliori aste vintage in diretta
        </p>
      </div>

      {/* Sezione Venditori in Voga */}
      {trendingSellers.length > 0 && (
        <div style={{
          padding: '0 16px 32px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #40e0d0 0%, #0891b2 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header Premium */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'white',
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  🔥 Venditori in Voga
                </h2>
                <p style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '14px',
                  margin: 0
                }}>
                  I migliori venditori sponsorizzati questo mese
                </p>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                PREMIUM
              </div>
            </div>

            {/* Grid Venditori */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth > 768 ? 'repeat(2, 1fr)' : '1fr',
              gap: '16px'
            }}>
              {trendingSellers.map(seller => (
                <div
                  key={seller.id}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                  onClick={() => navigate(`/seller/${seller.handle}`)}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: `url(${seller.avatar_url}) center/cover`,
                      backgroundColor: '#f3f4f6',
                      position: 'relative'
                    }}>
                      {seller.verified && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: '#40e0d0',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid white'
                        }}>
                          <span style={{ fontSize: '10px' }}>✓</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#1e293b',
                        margin: 0,
                        marginBottom: '2px'
                      }}>
                        {seller.display_name}
                      </h3>
                      <p style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: 0,
                        fontWeight: 500
                      }}>
                        {seller.specialty}
                      </p>
                    </div>

                    {/* Follow Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFollowToggle(seller.id);
                      }}
                      style={{
                        background: followingStatus[seller.id] ? 'transparent' : '#40e0d0',
                        border: followingStatus[seller.id] ? '2px solid #40e0d0' : '2px solid transparent',
                        color: followingStatus[seller.id] ? '#40e0d0' : 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        if (followingStatus[seller.id]) {
                          e.target.style.background = '#ef4444';
                          e.target.style.borderColor = '#ef4444';
                          e.target.style.color = 'white';
                          e.target.textContent = 'Unfollow';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (followingStatus[seller.id]) {
                          e.target.style.background = 'transparent';
                          e.target.style.borderColor = '#40e0d0';
                          e.target.style.color = '#40e0d0';
                          e.target.textContent = 'Segui';
                        }
                      }}
                    >
                      <UserPlus size={12} />
                      {followingStatus[seller.id] ? 'Segui' : 'Segui'}
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 600
                    }}>
                      <Users size={12} />
                      {seller.followers_count > 1000 
                        ? `${(seller.followers_count / 1000).toFixed(1)}K` 
                        : seller.followers_count} follower
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#f59e0b',
                      fontWeight: 600
                    }}>
                      <Star size={12} fill="currentColor" />
                      {seller.rating}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#10b981',
                      fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '2px 6px',
                      borderRadius: '8px'
                    }}>
                      {seller.lives_this_month} live
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : (
        /* Layout responsive: 2 colonne mobile, 4+ desktop */
        <div style={{
          padding: '0 16px',
          maxWidth: window.innerWidth > 1024 ? '1400px' : '600px', // Molto più ampio su desktop
          margin: '0 auto'
        }}>
          
          {/* SEZIONE NEGOZI IN TENDENZA - Solo desktop */}
          {window.innerWidth > 1024 && (
            <div style={{
              marginBottom: '40px',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🔥 Negozi in Tendenza
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {[
                  { name: "Vintage Milano", category: "Fashion", followers: "12.4k", badge: "⭐ Premium" },
                  { name: "Retro Roma", category: "Sneakers", followers: "8.9k", badge: "🔥 Hot" },
                  { name: "Napoli Trend", category: "Electronics", followers: "6.2k", badge: "✨ New" },
                  { name: "Firenze Style", category: "Home Design", followers: "15.1k", badge: "👑 Top Seller" }
                ].map((seller, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                    borderRadius: '12px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1e293b',
                      marginBottom: '4px'
                    }}>
                      {seller.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginBottom: '8px'
                    }}>
                      {seller.category} • {seller.followers} follower
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      display: 'inline-block'
                    }}>
                      {seller.badge}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ STORIES BAR - RIMOSSO DA QUI */}

          {/* SEZIONE LIVE IN TENDENZA */}
          <div style={{
            marginBottom: '32px'
          }}>
            <h2 style={{
              fontSize: window.innerWidth > 1024 ? '24px' : '20px',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎬 Live in Tendenza
            </h2>
            
            {/* Griglia responsive */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth > 1024 
                ? 'repeat(auto-fit, minmax(280px, 1fr))' 
                : 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              {lives.map((live) => (
                <CompactLiveCard
                  key={live.id}
                  item={live}
                  onClick={handleCardClick}
                  onShare={(e) => handleShare(live, e)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup condivisione */}
      {showSharePopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'flex-end'
        }} onClick={() => setShowSharePopup(null)}>
          <div style={{
            background: 'white',
            width: '100%',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            maxHeight: '60vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Condividi Live
            </h3>
            <p style={{
              color: '#64748b',
              fontSize: '14px',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              {showSharePopup.current_lot_title}
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {[
                { platform: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: '#25D366' },
                { platform: 'telegram', label: 'Telegram', emoji: '📱', color: '#0088cc' },
                { platform: 'instagram', label: 'Instagram', emoji: '📷', color: '#E4405F' },
                { platform: 'email', label: 'Email', emoji: '📧', color: '#6366f1' },
                { platform: 'copy', label: 'Copia Link', emoji: '🔗', color: '#64748b' }
              ].map((social) => (
                <button
                  key={social.platform}
                  onClick={() => shareToSocial(social.platform, showSharePopup)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 8px',
                    background: 'transparent',
                    border: `2px solid ${social.color}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = social.color;
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = social.color;
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{social.emoji}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: social.color,
                    transition: 'color 0.2s ease'
                  }}>
                    {social.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✅ STORY VIEWER - Usa componente esistente */}
      <StoryViewer
        stories={stories}
        index={currentStoryIndex}
        open={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        onNext={() => {
          const nextIndex = (currentStoryIndex + 1) % stories.length;
          setCurrentStoryIndex(nextIndex);
        }}
        onPrev={() => {
          const prevIndex = currentStoryIndex === 0 ? stories.length - 1 : currentStoryIndex - 1;
          setCurrentStoryIndex(prevIndex);
        }}
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
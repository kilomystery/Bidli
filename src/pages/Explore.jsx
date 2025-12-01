// src/pages/Explore.jsx - TikTok Style Scroll per Live Vintage (FIXED)
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, Heart, MessageCircle, Bookmark, Eye } from "lucide-react";
import { getCurrentRole, getCurrentSession } from "../lib/globalRole";

export default function Explore() {
  const navigate = useNavigate();
  const [lives, setLives] = useState([]);
  const [showSharePopup, setShowSharePopup] = useState(null);
  const [likedLives, setLikedLives] = useState(new Set());
  const [savedLives, setSavedLives] = useState(new Set());
  const containerRef = useRef(null);

  // ✅ Nascondi bottom bar in Explore per esperienza immersiva
  useEffect(() => {
    console.log('🎬 Explore: Activating live-mode (hiding bottom bar)');
    document.body.classList.add('live-mode');
    
    return () => {
      console.log('🎬 Explore: Deactivating live-mode (showing bottom bar)');
      document.body.classList.remove('live-mode');
    };
  }, []);

  useEffect(() => {
    // Demo lives TikTok style con negozi vintage italiani
    const demoLives = [
      {
        id: 1,
        seller_handle: "vintagemilano",
        seller_display_name: "Vintage Milano",
        seller_avatar: "https://ui-avatars.com/api/?name=VM&background=ff6b35&color=fff&size=50",
        category_label: "Fashion",
        title: "Giacche Vintage Anni '80 - Selezione Esclusiva Milano",
        description: "Collezione unica di giacche vintage selezionate nel centro di Milano. Pezzi rari e autentici.",
        viewer_count: 432,
        likes: 1247,
        comments: 89,
        video_url: "https://videos.pexels.com/video-files/3196887/3196887-uhd_2560_1440_30fps.mp4",
        cover_image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=600&fit=crop"
      },
      {
        id: 2,
        seller_handle: "retroroma", 
        seller_display_name: "Retro Roma",
        seller_avatar: "https://ui-avatars.com/api/?name=RR&background=8b5cf6&color=fff&size=50",
        category_label: "Sneakers",
        title: "Jordan e Nike Vintage - Collezione Rare Romana",
        description: "Le sneaker più ricercate dal cuore di Roma. Autenticità garantita e condizioni eccellenti.",
        viewer_count: 587,
        likes: 2103,
        comments: 156,
        video_url: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_30fps.mp4",
        cover_image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=600&fit=crop"
      },
      {
        id: 3,
        seller_handle: "napolitrend",
        seller_display_name: "Napoli Trend", 
        seller_avatar: "https://ui-avatars.com/api/?name=NT&background=06b6d4&color=fff&size=50",
        category_label: "Electronics",
        title: "Console Gaming Vintage - PlayStation e Nintendo Rare",
        description: "Console introvabili e giochi vintage. Passion napoletana per il retro gaming autentico.",
        viewer_count: 287,
        likes: 856,
        comments: 67,
        video_url: "https://videos.pexels.com/video-files/3209828/3209828-uhd_2560_1440_30fps.mp4",
        cover_image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=600&fit=crop"
      },
      {
        id: 4,
        seller_handle: "torinoantico",
        seller_display_name: "Torino Antico",
        seller_avatar: "https://ui-avatars.com/api/?name=TA&background=f59e0b&color=fff&size=50", 
        category_label: "Collectibles",
        title: "Orologi e Gioielli Vintage - Certificati Torino",
        description: "Orologi d'epoca e gioielli vintage con certificato di autenticità. Tradizione torinese dal 1965.",
        viewer_count: 392,
        likes: 1534,
        comments: 201,
        video_url: "https://videos.pexels.com/video-files/3196660/3196660-uhd_2560_1440_30fps.mp4",
        cover_image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=600&fit=crop"
      },
      {
        id: 5,
        seller_handle: "genovalux",
        seller_display_name: "Genova Luxury",
        seller_avatar: "https://ui-avatars.com/api/?name=GL&background=10b981&color=fff&size=50",
        category_label: "Fashion",
        title: "Borse Designer Vintage - Hermès, Chanel, Gucci",
        description: "Borse di lusso vintage autentiche. Ogni pezzo selezionato con cura nella storica Genova.",
        viewer_count: 654,
        likes: 2847,
        comments: 312,
        video_url: "https://videos.pexels.com/video-files/3191574/3191574-uhd_2560_1440_30fps.mp4",
        cover_image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=600&fit=crop"
      }
    ];

    setLives(demoLives);
  }, []);

  const handleLiveClick = (live) => {
    // Routing verso demo live viewer con UI completa
    navigate(`/live-demo/${live.id}`);
    const currentRole = getCurrentRole();
    const currentSession = getCurrentSession();
    
    if (currentRole === 'seller' && currentSession?.user?.id) {
      // È un seller → apri lato venditore
      navigate(`/live/${live.id}?role=seller`);
    } else {
      // È buyer o guest → apri lato spettatore
      navigate(`/live/${live.id}?role=buyer`);
    }
  };

  const handleShare = (live, e) => {
    e.stopPropagation();
    setShowSharePopup(live);
  };

  const shareToSocial = (platform, live) => {
    const url = `${window.location.origin}/live/${live.id}`;
    const text = `Guarda questa live vintage su BIDLi: "${live.title}" by ${live.seller_display_name}`;
    
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`);
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        break;
      case 'instagram':
        // Instagram Stories non supporta link diretti, copiamo negli appunti
        navigator.clipboard.writeText(url);
        alert('Link copiato! Incollalo nella tua Storia Instagram');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copiato negli appunti!');
        break;
    }
    setShowSharePopup(null);
  };

  const handleLike = (liveId, e) => {
    e.stopPropagation();
    setLikedLives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(liveId)) {
        newSet.delete(liveId);
      } else {
        newSet.add(liveId);
      }
      return newSet;
    });
  };

  const handleSave = (liveId, e) => {
    e.stopPropagation();
    setSavedLives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(liveId)) {
        newSet.delete(liveId);
      } else {
        newSet.add(liveId);
      }
      return newSet;
    });
  };

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      
      {/* ✅ MAIN CONTAINER - Fix per schermo coperto */}
      <div 
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          scrollSnapType: 'y proximity',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {lives.map((live, index) => (
          <div
            key={live.id}
            onClick={() => handleLiveClick(live)}
            style={{
              position: 'relative',
              width: '100%',
              height: '100vh',
              scrollSnapAlign: 'center',
              backgroundImage: `url(${live.cover_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end'
            }}
          >
            
            {/* Video Overlay Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)',
              zIndex: 1
            }} />

            {/* ✅ TOP OVERLAY - Live Badge + Category */}
            <div style={{
              position: 'absolute',
              top: 60,
              left: 16,
              right: 80,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              {/* Live Badge */}
              <div style={{
                background: 'linear-gradient(135deg, #ff0844 0%, #ff6b6b 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 13,
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(255, 8, 68, 0.4)'
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  animation: 'pulse 2s infinite'
                }} />
                LIVE
              </div>

              {/* Category Badge */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: '600',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                {live.category_label}
              </div>
            </div>

            {/* ✅ SIDE ACTIONS - Posizione fissa destra */}
            <div style={{
              position: 'absolute',
              top: '50%',
              right: 16,
              transform: 'translateY(-50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}>
              
              {/* Like */}
              <div 
                onClick={(e) => handleLike(live.id, e)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Heart 
                    size={20} 
                    color={likedLives.has(live.id) ? '#ff0844' : 'white'} 
                    fill={likedLives.has(live.id) ? '#ff0844' : 'none'}
                  />
                </div>
                <span style={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: '600',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                  {live.likes}
                </span>
              </div>

              {/* Comments */}
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <MessageCircle size={20} color="white" />
                </div>
                <span style={{
                  color: 'white',
                  fontSize: 11,
                  fontWeight: '600',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                  {live.comments}
                </span>
              </div>

              {/* Share */}
              <div 
                onClick={(e) => handleShare(live, e)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Share2 size={20} color="white" />
                </div>
              </div>

              {/* Save */}
              <div 
                onClick={(e) => handleSave(live.id, e)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Bookmark 
                    size={20} 
                    color={savedLives.has(live.id) ? '#fbbf24' : 'white'} 
                    fill={savedLives.has(live.id) ? '#fbbf24' : 'none'}
                  />
                </div>
              </div>
            </div>

            {/* ✅ BOTTOM INFO - Informazioni live */}
            <div style={{
              position: 'absolute',
              bottom: 100,
              left: 16,
              right: 80,
              zIndex: 10
            }}>
              
              {/* Seller Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12
              }}>
                <img 
                  src={live.seller_avatar} 
                  alt={live.seller_display_name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
                <div>
                  <div style={{
                    color: 'white',
                    fontWeight: '700',
                    fontSize: 16,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}>
                    @{live.seller_handle}
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}>
                    {live.seller_display_name}
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <div style={{ marginBottom: 12 }}>
                <h3 style={{
                  color: 'white',
                  fontSize: 18,
                  fontWeight: '700',
                  margin: '0 0 6px 0',
                  lineHeight: 1.3,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                }}>
                  {live.title}
                </h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 14,
                  margin: 0,
                  lineHeight: 1.4,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {live.description}
                </p>
              </div>

              {/* Viewer Count */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'white',
                fontSize: 13,
                fontWeight: '600',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)'
              }}>
                <Eye size={16} />
                <span>{live.viewer_count} spettatori</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ SHARE POPUP */}
      {showSharePopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
          onClick={() => setShowSharePopup(null)}
        >
          <div 
            style={{
              background: 'white',
              width: '100%',
              maxWidth: 500,
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px',
              transform: 'translateY(0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40,
              height: 4,
              backgroundColor: '#e5e7eb',
              borderRadius: 2,
              margin: '0 auto 20px'
            }} />
            
            <h3 style={{
              textAlign: 'center',
              marginBottom: 24,
              fontSize: 18,
              fontWeight: '700',
              color: '#1f2937'
            }}>
              Condividi Live
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              marginBottom: 20
            }}>
              {[
                { key: 'whatsapp', name: 'WhatsApp', color: '#25d366', icon: '📱' },
                { key: 'telegram', name: 'Telegram', color: '#0088cc', icon: '✈️' },
                { key: 'facebook', name: 'Facebook', color: '#1877f2', icon: '📘' },
                { key: 'twitter', name: 'Twitter', color: '#1da1f2', icon: '🐦' }
              ].map(platform => (
                <div
                  key={platform.key}
                  onClick={() => shareToSocial(platform.key, showSharePopup)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: platform.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24
                  }}>
                    {platform.icon}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => shareToSocial('copy', showSharePopup)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              📋 Copia Link
            </button>
          </div>
        </div>
      )}

      {/* ✅ CSS ANIMATIONS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
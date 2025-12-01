// src/pages/LiveDemo.jsx - Demo Live Viewer con UI ispirata all'immagine
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Users, Star, Volume2, VolumeX } from 'lucide-react';

export default function LiveDemo() {
  const { liveId } = useParams();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentBid, setCurrentBid] = useState(89);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour

  // Demo live data
  const liveData = {
    id: liveId || '1',
    seller: {
      username: 'vintagemilano',
      displayName: 'Vintage Milano',
      rating: 4.99,
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VintageMilano'
    },
    title: 'Cartas Futbol - Vintage Collection',
    viewers: 1247,
    isLive: true,
    category: 'Collectibles',
    currentProduct: 'Cartoline vintage calcio anni 80',
    startingPrice: 50,
    coverImage: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=600&h=800&fit=crop'
  };

  const [messages, setMessages] = useState([
    { id: 1, user: 'Figo46', message: 'Hola! Al final pudiste guardar la de Schlump para la seccion?', time: '18:15' },
    { id: 2, user: 'MarcoRossi', message: 'Quanto per quella del Milan?', time: '18:16' },
    { id: 3, user: 'Figo46', message: 'Muchas gracias!', time: '18:17' },
    { id: 4, user: 'CollectorIT', message: 'Bella quella di Maradona!', time: '18:18' }
  ]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        user: 'Tu',
        message: newMessage,
        time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handleBid = () => {
    setCurrentBid(prev => prev + 5);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Video Simulation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${liveData.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.4,
        filter: 'blur(1px)'
      }} />

      {/* Header */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '16px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            padding: '12px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img
            src={liveData.seller.avatar}
            alt={liveData.seller.displayName}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '2px solid #40e0d0'
            }}
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
              {liveData.seller.displayName}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {liveData.seller.rating} <Star size={12} fill="#fbbf24" />
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239, 68, 68, 0.9)',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            background: 'white',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
          <Users size={16} />
          {liveData.viewers}
        </div>
      </div>

      {/* Follow Button */}
      <div style={{
        position: 'absolute',
        top: '80px',
        left: '16px',
        zIndex: 15
      }}>
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          style={{
            background: isFollowing ? 'rgba(64, 224, 208, 0.2)' : 'rgba(255,255,255,0.2)',
            border: `2px solid ${isFollowing ? '#40e0d0' : 'white'}`,
            borderRadius: '20px',
            padding: '8px 16px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isFollowing ? '✓ Seguendo' : 'Seguir'}
        </button>
      </div>

      {/* Live Info Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '200px',
        left: '16px',
        right: '16px',
        zIndex: 15,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: '0 0 8px 0'
        }}>
          {liveData.currentProduct}
        </h2>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Offerta attuale</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#40e0d0' }}>
              €{currentBid}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Tempo rimasto</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <button
          onClick={handleBid}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            marginBottom: '8px'
          }}
        >
          🔔 Guardar y avisar
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.2)',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Share2 size={16} />
          Compartir ahora
        </button>
      </div>

      {/* Chat Section */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '180px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px 20px 0 0',
        padding: '16px',
        zIndex: 20
      }}>
        <div style={{
          height: '100px',
          overflowY: 'auto',
          marginBottom: '12px'
        }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              <span style={{
                color: '#40e0d0',
                fontWeight: 'bold'
              }}>
                {msg.user}
              </span>
              <span style={{ color: 'white', marginLeft: '8px' }}>
                {msg.message}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Escribe aquí"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              background: '#40e0d0',
              border: 'none',
              borderRadius: '50%',
              padding: '12px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <MessageCircle size={18} />
          </button>
        </div>
      </div>

      {/* Right Side Actions */}
      <div style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 15
      }}>
        <button
          onClick={() => setIsLiked(!isLiked)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            padding: '12px',
            color: isLiked ? '#ff6b6b' : 'white',
            cursor: 'pointer'
          }}
        >
          <Heart size={24} fill={isLiked ? '#ff6b6b' : 'none'} />
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            padding: '12px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px'
          }}>
            <h3 style={{ color: '#1e293b', marginBottom: '16px', textAlign: 'center' }}>
              Condividi Live
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px'
            }}>
              {['WhatsApp', 'Instagram', 'Copia Link', 'Altri'].map(platform => (
                <button
                  key={platform}
                  onClick={() => setShowShareModal(false)}
                  style={{
                    padding: '16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {platform}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowShareModal(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
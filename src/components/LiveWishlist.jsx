// src/components/LiveWishlist.jsx
// Wishlist per Live - salvare live interessanti e venditori da seguire

import React, { useState, useEffect } from 'react';
import { Heart, Calendar, Clock, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LiveWishlist = ({ userSession }) => {
  const [savedLives, setSavedLives] = useState([]);
  const [savedSellers, setSavedSellers] = useState([]);
  const [activeTab, setActiveTab] = useState('lives');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userSession?.user?.id) {
      loadWishlistData();
    }
  }, [userSession]);

  const loadWishlistData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSavedLives(),
        loadSavedSellers()
      ]);
    } catch (error) {
      console.error('Errore caricamento wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedLives = async () => {
    const { data, error } = await supabase
      .from('live_wishlist')
      .select(`
        *,
        live:live_id (
          id,
          title,
          description,
          category,
          scheduled_start,
          status,
          viewer_count,
          seller:seller_id (
            id,
            handle,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userSession.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedLives(data);
    }
  };

  const loadSavedSellers = async () => {
    const { data, error } = await supabase
      .from('seller_follows')
      .select(`
        *,
        seller:seller_id (
          id,
          handle,
          display_name,
          avatar_url,
          bio,
          followers,
          next_live_scheduled
        )
      `)
      .eq('follower_id', userSession.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedSellers(data);
    }
  };

  const toggleLiveWishlist = async (liveId) => {
    const isCurrentlySaved = savedLives.some(item => item.live_id === liveId);
    
    try {
      if (isCurrentlySaved) {
        // Rimuovi dalla wishlist
        await supabase
          .from('live_wishlist')
          .delete()
          .eq('user_id', userSession.user.id)
          .eq('live_id', liveId);
        
        setSavedLives(prev => prev.filter(item => item.live_id !== liveId));
      } else {
        // Aggiungi alla wishlist
        await supabase
          .from('live_wishlist')
          .insert([{
            user_id: userSession.user.id,
            live_id: liveId
          }]);
        
        loadSavedLives(); // Ricarica per ottenere i dati completi
      }
    } catch (error) {
      console.error('Errore toggle live wishlist:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    if (diffDays > 0) return `Tra ${diffDays} giorni`;
    
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#94a3b8'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(64, 224, 208, 0.3)',
          borderTop: '3px solid #40e0d0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div>Caricamento wishlist...</div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px'
      }}>
        <h1 style={{
          color: '#ffffff',
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Heart size={28} fill="#40e0d0" stroke="#40e0d0" />
          La Mia Wishlist
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '16px'
        }}>
          Le tue live e venditori preferiti
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '24px',
        borderBottom: '1px solid rgba(64, 224, 208, 0.2)'
      }}>
        <button
          onClick={() => setActiveTab('lives')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'lives' ? '#40e0d0' : '#94a3b8',
            fontSize: '16px',
            fontWeight: activeTab === 'lives' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'lives' ? '2px solid #40e0d0' : '2px solid transparent'
          }}
        >
          Live Salvate ({savedLives.length})
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            color: activeTab === 'sellers' ? '#40e0d0' : '#94a3b8',
            fontSize: '16px',
            fontWeight: activeTab === 'sellers' ? 'bold' : 'normal',
            cursor: 'pointer',
            borderBottom: activeTab === 'sellers' ? '2px solid #40e0d0' : '2px solid transparent'
          }}
        >
          Venditori Seguiti ({savedSellers.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'lives' ? (
        <div>
          {savedLives.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#94a3b8'
            }}>
              <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>
                Nessuna live salvata
              </h3>
              <p>Salva le live che ti interessano per non perdertele!</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {savedLives.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Status live */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: item.live.status === 'live' ? '#ef4444' : 
                                       item.live.status === 'scheduled' ? '#f59e0b' : '#6b7280',
                      color: 'white'
                    }}>
                      {item.live.status === 'live' ? '🔴 LIVE' :
                       item.live.status === 'scheduled' ? '📅 PROGRAMMATA' : '⏹️ TERMINATA'}
                    </span>
                    
                    <button
                      onClick={() => toggleLiveWishlist(item.live_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Heart size={20} fill="#40e0d0" stroke="#40e0d0" />
                    </button>
                  </div>

                  {/* Info live */}
                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {item.live.title}
                  </h3>

                  <p style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}>
                    {item.live.description}
                  </p>

                  {/* Venditore */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <img
                      src={item.live.seller?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.live.seller?.display_name || 'Seller')}&background=40e0d0&color=fff&size=40`}
                      alt={item.live.seller?.display_name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
                        {item.live.seller?.display_name}
                      </div>
                      <div style={{ color: '#40e0d0', fontSize: '12px' }}>
                        @{item.live.seller?.handle}
                      </div>
                    </div>
                  </div>

                  {/* Data e stats */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      {formatDate(item.live.scheduled_start)}
                    </div>
                    
                    {item.live.viewer_count > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={14} />
                        {item.live.viewer_count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {savedSellers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#94a3b8'
            }}>
              <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>
                Nessun venditore seguito
              </h3>
              <p>Inizia a seguire i venditori per rimanere aggiornato sulle loro live!</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {savedSellers.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => window.location.href = `/seller/${item.seller.handle}`}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <img
                      src={item.seller?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.seller?.display_name || 'Seller')}&background=40e0d0&color=fff&size=60`}
                      alt={item.seller?.display_name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #40e0d0'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                      }}>
                        {item.seller.display_name}
                      </h3>
                      <div style={{
                        color: '#40e0d0',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        @{item.seller.handle}
                      </div>
                      <div style={{
                        color: '#94a3b8',
                        fontSize: '12px'
                      }}>
                        {item.seller.followers} follower{item.seller.followers !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {item.seller.bio && (
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}>
                      {item.seller.bio}
                    </p>
                  )}

                  {item.seller.next_live_scheduled && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(64, 224, 208, 0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#40e0d0'
                    }}>
                      📅 Prossima live: {formatDate(item.seller.next_live_scheduled)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveWishlist;
// LiveReviewsSystem.jsx - Sistema recensioni e spettatori in tempo reale
import React, { useState, useEffect } from 'react';
import { Star, Eye, Heart, MessageSquare, Clock } from 'lucide-react';

export default function LiveReviewsSystem({ 
  liveId, 
  sellerId, 
  isVisible = true,
  onViewerCountChange 
}) {
  const [reviews, setReviews] = useState([]);
  const [realViewers, setRealViewers] = useState(0);
  const [liveRating, setLiveRating] = useState(4.8);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  // Simula spettatori reali che entrano/escono
  useEffect(() => {
    const interval = setInterval(() => {
      setRealViewers(prev => {
        const change = Math.floor(Math.random() * 21) - 10; // -10 a +10
        const newCount = Math.max(0, prev + change);
        onViewerCountChange?.(newCount);
        return newCount;
      });
    }, 5000); // Ogni 5 secondi

    // Viewer count iniziale realistico
    setRealViewers(Math.floor(Math.random() * 500) + 50);

    return () => clearInterval(interval);
  }, [liveId, onViewerCountChange]);

  // Carica recensioni demo realistiche
  useEffect(() => {
    const demoReviews = [
      {
        id: 1,
        user: "Marco_Vintage",
        avatar: "https://ui-avatars.com/api/?name=MV&background=3b82f6&color=fff&size=40",
        rating: 5,
        comment: "Prodotti fantastici e autentici! Venditore super affidabile 👍",
        time: "2 minuti fa",
        verified: true
      },
      {
        id: 2,
        user: "Anna_Collectibles",
        avatar: "https://ui-avatars.com/api/?name=AC&background=8b5cf6&color=fff&size=40",
        rating: 5,
        comment: "Spedizione velocissima e imballaggio perfetto. Consiglio!",
        time: "5 minuti fa",
        verified: true
      },
      {
        id: 3,
        user: "Luca_Sneakers",
        avatar: "https://ui-avatars.com/api/?name=LS&background=f59e0b&color=fff&size=40",
        rating: 4,
        comment: "Ottima selezione, prezzi giusti. Tornerò sicuramente",
        time: "8 minuti fa",
        verified: false
      }
    ];
    setReviews(demoReviews);
  }, [liveId]);

  // Aggiungi nuova recensione
  const handleSubmitReview = () => {
    const review = {
      id: Date.now(),
      user: "Il_tuo_nome",
      avatar: "https://ui-avatars.com/api/?name=TU&background=10b981&color=fff&size=40",
      rating: newReview.rating,
      comment: newReview.comment,
      time: "Ora",
      verified: true
    };
    
    setReviews(prev => [review, ...prev]);
    setNewReview({ rating: 5, comment: '' });
    setShowReviewForm(false);
    
    // Aggiorna rating medio
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0) + newReview.rating;
    const avgRating = totalRating / (reviews.length + 1);
    setLiveRating(Math.round(avgRating * 10) / 10);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      {/* Header con statistiche live */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Spettatori in tempo reale */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '20px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Eye size={16} color="#ef4444" />
            <span style={{ 
              fontWeight: 600, 
              color: '#ef4444',
              fontSize: '14px'
            }}>
              {realViewers} live
            </span>
          </div>

          {/* Rating venditore */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Star size={16} color="#f59e0b" fill="#f59e0b" />
            <span style={{ 
              fontWeight: 600, 
              color: '#1f2937',
              fontSize: '14px'
            }}>
              {liveRating}
            </span>
            <span style={{ 
              color: '#6b7280',
              fontSize: '12px'
            }}>
              ({reviews.length} recensioni)
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowReviewForm(!showReviewForm)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <MessageSquare size={14} />
          Recensisci
        </button>
      </div>

      {/* Form recensione */}
      {showReviewForm && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Rating selector */}
            <div>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Valutazione
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4,5].map(star => (
                  <Star
                    key={star}
                    size={20}
                    color={star <= newReview.rating ? "#f59e0b" : "#d1d5db"}
                    fill={star <= newReview.rating ? "#f59e0b" : "none"}
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>

            {/* Comment input */}
            <div>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '6px',
                display: 'block'
              }}>
                Commento
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Condividi la tua esperienza..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'none',
                  height: '60px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowReviewForm(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={!newReview.comment.trim()}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: newReview.comment.trim() ? 'pointer' : 'not-allowed',
                  opacity: newReview.comment.trim() ? 1 : 0.5
                }}
              >
                Pubblica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista recensioni */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {reviews.map((review) => (
          <div
            key={review.id}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              background: 'rgba(248, 250, 252, 0.8)',
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}
          >
            <img
              src={review.avatar}
              alt={review.user}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #e5e7eb'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#1f2937'
                }}>
                  {review.user}
                </span>
                {review.verified && (
                  <span style={{
                    background: '#10b981',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 600
                  }}>
                    ✓ Verificato
                  </span>
                )}
                <div style={{ display: 'flex', gap: '1px' }}>
                  {[1,2,3,4,5].map(star => (
                    <Star
                      key={star}
                      size={12}
                      color={star <= review.rating ? "#f59e0b" : "#d1d5db"}
                      fill={star <= review.rating ? "#f59e0b" : "none"}
                    />
                  ))}
                </div>
              </div>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.4,
                marginBottom: '6px'
              }}>
                {review.comment}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={12} color="#9ca3af" />
                <span style={{
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  {review.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
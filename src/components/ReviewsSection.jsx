import React, { useState, useEffect } from 'react';
import { Filter, Plus } from 'lucide-react';
import ReviewStats from './ReviewStats.jsx';
import ReviewCard from './ReviewCard.jsx';
import ReviewForm from './ReviewForm.jsx';

export default function ReviewsSection({ 
  sellerId, 
  currentUserId,
  canWriteReview = false 
}) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Fetch reviews and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch reviews
      const reviewsResponse = await fetch(
        `/api/reviews/seller/${sellerId}?page=${page}&limit=10&sort=${sortBy}`
      );
      const reviewsData = await reviewsResponse.json();
      
      if (reviewsResponse.ok) {
        setReviews(reviewsData.reviews || []);
        setPagination(reviewsData.pagination);
      }

      // Fetch stats
      const statsResponse = await fetch(`/api/reviews/seller/${sellerId}/stats`);
      const statsData = await statsResponse.json();
      
      if (statsResponse.ok) {
        setStats(statsData);
      }
      
    } catch (error) {
      console.error('Errore caricamento recensioni:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchData();
    }
  }, [sellerId, page, sortBy]);

  const handleReviewSubmit = (newReview) => {
    fetchData(); // Refresh data after new review
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setShowForm(true);
  };

  const handleDeleteReview = async (review) => {
    if (!confirm('Sei sicuro di voler eliminare questa recensione?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ buyer_id: currentUserId })
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || 'Errore eliminazione recensione');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Più recenti' },
    { value: 'oldest', label: 'Più vecchie' },
    { value: 'highest', label: 'Rating più alto' },
    { value: 'lowest', label: 'Rating più basso' }
  ];

  if (loading && page === 1) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Caricamento recensioni...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Stats Section */}
      <div style={{ marginBottom: '24px' }}>
        <ReviewStats stats={stats} />
      </div>

      {/* Header con azioni */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827',
          margin: 0
        }}>
          Recensioni {stats?.total_reviews ? `(${stats.total_reviews})` : ''}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Write review button */}
          {canWriteReview && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#40e0d0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              Scrivi recensione
            </button>
          )}
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280'
        }}>
          {canWriteReview ? (
            <div>
              <p>Nessuna recensione ancora.</p>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  marginTop: '12px',
                  padding: '10px 20px',
                  backgroundColor: '#40e0d0',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Scrivi la prima recensione
              </button>
            </div>
          ) : (
            <p>Questo venditore non ha ancora recensioni.</p>
          )}
        </div>
      ) : (
        <div>
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              showActions={review.buyer_id === currentUserId}
              onEdit={handleEditReview}
              onDelete={handleDeleteReview}
            />
          ))}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: page === 1 ? '#f9fafb' : '#ffffff',
                  color: page === 1 ? '#9ca3af' : '#374151',
                  borderRadius: '6px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Precedente
              </button>
              
              <span style={{ 
                fontSize: '14px', 
                color: '#6b7280',
                margin: '0 8px'
              }}>
                Pagina {page} di {pagination.pages}
              </span>
              
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  backgroundColor: page === pagination.pages ? '#f9fafb' : '#ffffff',
                  color: page === pagination.pages ? '#9ca3af' : '#374151',
                  borderRadius: '6px',
                  cursor: page === pagination.pages ? 'not-allowed' : 'pointer'
                }}
              >
                Successiva
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review form modal */}
      <ReviewForm
        sellerId={sellerId}
        buyerId={currentUserId}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingReview(null);
        }}
        onSubmit={handleReviewSubmit}
        existingReview={editingReview}
      />
    </div>
  );
}
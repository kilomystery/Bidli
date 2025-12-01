import React, { useState } from 'react';
import { X } from 'lucide-react';
import StarRating from './StarRating.jsx';

export default function ReviewForm({ 
  sellerId, 
  buyerId, 
  isOpen, 
  onClose, 
  onSubmit,
  existingReview = null
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Seleziona un punteggio da 1 a 5 stelle');
      return;
    }

    if (!comment.trim()) {
      setError('Scrivi un commento sulla tua esperienza');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const reviewData = {
        buyer_id: buyerId,
        seller_id: sellerId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        purchase_reference: `purchase_${Date.now()}` // Temporary until order system
      };

      const url = existingReview 
        ? `/api/reviews/${existingReview.id}`
        : '/api/reviews';
      
      const method = existingReview ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      onSubmit(result);
      onClose();
      
      // Reset form
      setRating(0);
      setTitle('');
      setComment('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            {existingReview ? 'Modifica recensione' : 'Scrivi una recensione'}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Rating */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              La tua valutazione *
            </label>
            <StarRating
              rating={rating}
              size={32}
              interactive={true}
              onRatingChange={setRating}
              showNumber={false}
            />
            {rating > 0 && (
              <div style={{ 
                marginTop: '6px', 
                fontSize: '12px', 
                color: '#6b7280' 
              }}>
                {rating === 1 && 'Pessimo'}
                {rating === 2 && 'Scarso'}
                {rating === 3 && 'Sufficiente'}
                {rating === 4 && 'Buono'}
                {rating === 5 && 'Eccellente'}
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Titolo (opzionale)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Riassumi la tua esperienza..."
              maxLength={200}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Comment */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              La tua recensione *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Racconta la tua esperienza con questo venditore..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '100px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#374151',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Annulla
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: rating === 0 ? '#d1d5db' : '#40e0d0',
                color: rating === 0 ? '#6b7280' : '#ffffff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: rating === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Invio...' : (existingReview ? 'Aggiorna' : 'Pubblica')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
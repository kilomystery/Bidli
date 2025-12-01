import React from 'react';
import { User, Calendar, MoreVertical } from 'lucide-react';
import StarRating from './StarRating.jsx';

export default function ReviewCard({ 
  review, 
  showActions = false, 
  onEdit = null, 
  onDelete = null 
}) {
  const [showMenu, setShowMenu] = React.useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const getBuyerDisplayName = () => {
    if (review.buyer_first_name || review.buyer_last_name) {
      return `${review.buyer_first_name || ''} ${review.buyer_last_name || ''}`.trim();
    }
    return review.buyer_username || 'Utente';
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      position: 'relative'
    }}>
      {/* Header con info utente */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Avatar utente */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {review.buyer_avatar ? (
              <img 
                src={review.buyer_avatar} 
                alt={getBuyerDisplayName()}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <User size={20} color="#9ca3af" />
            )}
          </div>
          
          {/* Info utente */}
          <div>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '14px',
              color: '#111827',
              marginBottom: '2px'
            }}>
              {getBuyerDisplayName()}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <Calendar size={12} />
              {formatDate(review.created_at)}
            </div>
          </div>
        </div>

        {/* Rating e menu azioni */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StarRating 
            rating={review.rating} 
            size={16} 
            interactive={false}
            showNumber={false}
          />
          
          {showActions && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#6b7280'
                }}
              >
                <MoreVertical size={16} />
              </button>
              
              {showMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 10,
                  minWidth: '120px'
                }}>
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(review);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        borderRadius: '4px'
                      }}
                    >
                      Modifica
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(review);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: '#dc2626',
                        borderRadius: '4px'
                      }}
                    >
                      Elimina
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Titolo recensione */}
      {review.title && (
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 8px 0'
        }}>
          {review.title}
        </h4>
      )}

      {/* Commento */}
      {review.comment && (
        <p style={{
          fontSize: '14px',
          lineHeight: '1.5',
          color: '#374151',
          margin: '0'
        }}>
          {review.comment}
        </p>
      )}
    </div>
  );
}
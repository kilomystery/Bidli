import React from 'react';
import { Star } from 'lucide-react';
import StarRating from './StarRating.jsx';

export default function ReviewStats({ stats }) {
  if (!stats || stats.total_reviews === 0) {
    return (
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          Nessuna recensione ancora
        </div>
      </div>
    );
  }

  const {
    total_reviews,
    average_rating,
    rating_1_star = 0,
    rating_2_star = 0,
    rating_3_star = 0,
    rating_4_star = 0,
    rating_5_star = 0
  } = stats;

  const getPercentage = (count) => {
    return total_reviews > 0 ? (count / total_reviews) * 100 : 0;
  };

  const StarBar = ({ starNumber, count }) => {
    const percentage = getPercentage(count);
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '6px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          minWidth: '60px'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>{starNumber}</span>
          <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
        </div>
        
        <div style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            backgroundColor: '#fbbf24',
            width: `${percentage}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <span style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          minWidth: '30px',
          textAlign: 'right'
        }}>
          {count}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header con rating medio */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: '700',
            color: '#111827',
            marginBottom: '4px'
          }}>
            {average_rating ? parseFloat(average_rating).toFixed(1) : '0.0'}
          </div>
          <StarRating 
            rating={average_rating || 0} 
            size={20} 
            interactive={false}
            showNumber={false}
          />
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginTop: '4px'
          }}>
            {total_reviews} recensioni
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <StarBar starNumber={5} count={rating_5_star} />
          <StarBar starNumber={4} count={rating_4_star} />
          <StarBar starNumber={3} count={rating_3_star} />
          <StarBar starNumber={2} count={rating_2_star} />
          <StarBar starNumber={1} count={rating_1_star} />
        </div>
      </div>

      {/* Footer con informazioni aggiuntive */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        <span>
          {Math.round(getPercentage(rating_5_star + rating_4_star))}% recensioni positive
        </span>
        <span>
          Aggiornato oggi
        </span>
      </div>
    </div>
  );
}
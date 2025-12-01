import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ 
  rating = 0, 
  maxRating = 5, 
  size = 20, 
  interactive = false,
  onRatingChange = null,
  showNumber = true 
}) {
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const [selectedRating, setSelectedRating] = React.useState(rating);

  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      setSelectedRating(value);
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (interactive) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(0);
    }
  };

  const displayRating = interactive ? hoveredRating || selectedRating : rating;

  return (
    <div className="star-rating" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;
        
        return (
          <Star
            key={index}
            size={size}
            fill={isFilled ? '#fbbf24' : 'transparent'}
            stroke={isFilled ? '#fbbf24' : '#d1d5db'}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
          />
        );
      })}
      
      {showNumber && (
        <span style={{ 
          marginLeft: '6px', 
          fontSize: size > 16 ? '14px' : '12px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {rating ? rating.toFixed(1) : '0.0'}
        </span>
      )}
    </div>
  );
}

// Component per mostrare rating compatto (senza interazione)
export function CompactStarRating({ rating, totalReviews = 0, size = 16 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <StarRating 
        rating={rating} 
        size={size} 
        interactive={false} 
        showNumber={false}
      />
      <span style={{ 
        fontSize: '12px', 
        color: '#6b7280',
        fontWeight: '500'
      }}>
        {rating ? rating.toFixed(1) : '0.0'} ({totalReviews})
      </span>
    </div>
  );
}
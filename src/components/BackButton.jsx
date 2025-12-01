import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ 
  to = null, 
  onClick = null, 
  className = "",
  style = {} 
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`back-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '0',
        color: '#3b82f6',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        ...style
      }}
      onMouseEnter={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.2)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
        e.target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = 'rgba(59, 130, 246, 0.1)';
        e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        e.target.style.transform = 'scale(1)';
      }}
      data-testid="back-button"
    >
      <ArrowLeft size={18} />
    </button>
  );
}
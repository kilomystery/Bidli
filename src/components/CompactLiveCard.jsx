// src/components/CompactLiveCard.jsx - Card compatta stile Foto 1
import React, { useState } from "react";
import LoadingPage from "./LoadingPage";

export default function CompactLiveCard({ item, onClick }) {
  const [showLoading, setShowLoading] = useState(false);
  const isScheduled = item.scheduled;
  
  const handleClick = () => {
    if (!item.scheduled) {
      // Per live attive: mostra loading page
      setShowLoading(true);
    } else {
      // Per live programmate: azione diretta
      onClick?.(item);
    }
  };

  if (showLoading) {
    return (
      <LoadingPage
        text="BIDLi"
        subtitle="Connessione alla live..."
        onLoadComplete={() => {
          setShowLoading(false);
          onClick?.(item);
        }}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        border: '1px solid #f0f0f0'
      }}
      onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
    >
      {/* Header con avatar e username */}
      <div style={{
        padding: '12px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#40e0d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: 'white'
        }}>
          {item.seller_display_name.charAt(0).toUpperCase()}
        </div>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333'
        }}>
          {item.seller_display_name}
        </span>
      </div>

      {/* Miniatura/Copertina */}
      <div style={{
        height: 120,
        background: isScheduled 
          ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
          : 'linear-gradient(135deg, #ef4444, #f59e0b)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Badge LIVE/PROGRAMMATA */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: isScheduled ? 'rgba(139, 92, 246, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          fontSize: 9,
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5
        }}>
          {isScheduled ? '🔜 PROSSIMA' : '🔴 LIVE'}
        </div>

        {/* Viewer count (solo per live attive) */}
        {!isScheduled && item.viewer_count && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: 10,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 12
          }}>
            👁️ {item.viewer_count}
          </div>
        )}

        {/* Icona centrale */}
        <div style={{
          fontSize: 32,
          opacity: 0.7,
          color: 'white'
        }}>
          {isScheduled ? '📅' : '📺'}
        </div>
      </div>

      {/* Contenuto card */}
      <div style={{ padding: 12 }}>
        {/* Titolo */}
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#333',
          marginBottom: 8,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          height: 34
        }}>
          {item.current_lot_title}
        </div>

        {/* Categoria */}
        <div style={{
          display: 'inline-block',
          background: '#f0f9ff',
          color: '#0369a1',
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 8,
          marginBottom: 8
        }}>
          {item.category_label}
        </div>

        {/* Orario e notifica */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: 12,
            color: '#666',
            fontWeight: 500
          }}>
            📅 {item.startTime}
          </span>
          
          {isScheduled && (
            <button style={{
              background: 'none',
              border: 'none',
              fontSize: 16,
              cursor: 'pointer',
              color: '#666',
              padding: 0
            }}>
              🔔
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
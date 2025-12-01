// src/components/LoadingPage.jsx - Pagina caricamento elegante stile Foto 3
import React, { useEffect, useState } from "react";

export default function LoadingPage({ 
  text = "BIDLi", 
  subtitle = "Caricamento live...",
  onLoadComplete 
}) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Simula caricamento progressivo
  useEffect(() => {
    setShowContent(true);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onLoadComplete?.(), 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onLoadComplete]);

  // Pattern di testo stile Foto 3
  const createPattern = () => {
    const pattern = [];
    const rows = 25;
    const cols = 8;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        pattern.push(
          <span
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              left: `${col * 12.5}%`,
              top: `${row * 4}%`,
              fontSize: '24px',
              fontWeight: 700,
              color: `rgba(255, 255, 255, ${0.05 + (row % 3) * 0.02})`,
              userSelect: 'none',
              transform: `rotate(${Math.sin(row + col) * 3}deg)`,
              transition: 'all 0.3s ease'
            }}
          >
            {text}
          </span>
        );
      }
    }
    return pattern;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* Pattern di sfondo */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease'
      }}>
        {createPattern()}
      </div>

      {/* Gradiente overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(26, 26, 26, 0.8) 80%)'
      }} />

      {/* Contenuto centrale */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        transform: showContent ? 'translateY(0)' : 'translateY(20px)',
        opacity: showContent ? 1 : 0,
        transition: 'all 0.8s ease'
      }}>
        {/* Logo/Brand principale */}
        <div style={{
          fontSize: '72px',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #ff6b35, #f59e0b, #06b6d4)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          marginBottom: '24px',
          letterSpacing: '4px',
          textShadow: '0 0 30px rgba(255, 107, 53, 0.3)'
        }}>
          {text}
        </div>

        {/* Subtitle */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '18px',
          fontWeight: 500,
          marginBottom: '40px',
          letterSpacing: '1px'
        }}>
          {subtitle}
        </div>

        {/* Barra di caricamento */}
        <div style={{
          width: '300px',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
          margin: '0 auto 20px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff6b35, #f59e0b)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
            boxShadow: '0 0 10px rgba(255, 107, 53, 0.5)'
          }} />
        </div>

        {/* Percentuale */}
        <div style={{
          color: '#ff6b35',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '1px'
        }}>
          {Math.round(progress)}%
        </div>

        {/* Indicatore animato */}
        <div style={{
          marginTop: '30px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff6b35',
                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                opacity: 0.7
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
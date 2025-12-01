import React, { useState, useEffect } from 'react';
import LiveVideoPlayer from './LiveVideoPlayer';

export default function StickyVideoPlayer({ 
  streamKey, 
  participantName,
  isVisible = true,
  onToggle,
  className 
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      // 🎯 Make player sticky on mobile when scrolled down - Definizione sicura
      const isMobile = (typeof window !== 'undefined') && window.innerWidth <= 768;
      if (isMobile && (typeof window !== 'undefined') && window.scrollY > 100) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  if (!isVisible) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <div 
      className={className}
      style={{
        position: isSticky && isMobile ? 'fixed' : 'relative',
        bottom: isSticky && isMobile ? '20px' : 'auto',
        right: isSticky && isMobile ? '20px' : 'auto',
        width: isSticky && isMobile 
          ? (isMinimized ? '80px' : '200px')
          : '100%',
        height: isSticky && isMobile 
          ? (isMinimized ? '60px' : '112px') 
          : '100%',
        zIndex: isSticky ? 1000 : 'auto',
        borderRadius: isSticky && isMobile ? '12px' : '0',
        overflow: 'hidden',
        boxShadow: isSticky && isMobile ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 0.3s ease',
        cursor: isSticky && isMobile && isMinimized ? 'pointer' : 'default'
      }}
      onClick={() => {
        if (isSticky && isMobile && isMinimized) {
          setIsMinimized(false);
        }
      }}
    >
      
      {/* Video Player */}
      <LiveVideoPlayer
        roomName={streamKey}
        participantName={participantName}
        onViewerJoin={() => console.log('Sticky viewer joined')}
        onViewerLeave={() => console.log('Sticky viewer left')}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: isSticky && isMobile ? '12px' : '0'
        }}
      />

      {/* Sticky Controls */}
      {isSticky && isMobile && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          zIndex: 10
        }}>
          {/* Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label={isMinimized ? 'Espandi player' : 'Riduci player'}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(false);
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Chiudi player"
          >
            ✕
          </button>
        </div>
      )}

      {/* Minimized Overlay */}
      {isSticky && isMobile && isMinimized && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '10px',
          fontWeight: 600,
          borderRadius: '12px'
        }}>
          📺 LIVE
        </div>
      )}

      {/* Responsive Styling */}
      <style jsx>{`
        @media (max-width: 768px) {
          .sticky-player {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        }
        
        @media (min-width: 769px) {
          .sticky-player {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
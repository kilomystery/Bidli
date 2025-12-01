// src/components/MobileHeaderMini.jsx - Header Mobile con Categorie + Scroll Auto-Hide
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../constants/categories";

export default function MobileHeaderMini() {
  const ref = useRef(null);
  const navigate = useNavigate();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef(null);
  
  // 🚨 SISTEMA TOUCH DIRETTO - FUNZIONA SEMPRE!
  useEffect(() => {
    const isMobile = window.innerWidth <= 960;
    if (!isMobile) return;

    console.log('🚨 TOUCH DIRECT: Sistema header hide TOUCH attivato');
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      // console.log('👆 TOUCH START:', startY);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diff = startY - currentY;
      
      // console.log('📱 TOUCH MOVE: diff =', diff);
      
      // 🔽 SWIPE UP (nasconde header)
      if (diff > 30) {
        document.body.classList.add('header-hidden');
        setIsHidden(true);
        console.log('✅ Header nascosto - SWIPE UP');
      }
      // 🔼 SWIPE DOWN (mostra header)
      else if (diff < -30) {
        document.body.classList.remove('header-hidden');
        setIsHidden(false);
        console.log('✅ Header mostrato - SWIPE DOWN');
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
      // console.log('👆 TOUCH END');
    };

    // ✅ Sistema pronto - solo eventi touch naturali

    // 💪 TOUCH EVENTS DIRETTI
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      // 🧹 Cleanup: rimuovi classe
      document.body.classList.remove('header-hidden');
    };
  }, []);

  return (
    <div
      ref={ref}
      className="mh-mini"
      role="banner"
      aria-label="BIDLi"
    >
      {/* Logo compatto a sinistra */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}
        onClick={() => navigate('/discover')}
      >
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #40e0d0, #06b6d4)',
          marginRight: '6px'
        }} />
        <div style={{
          fontSize: '16px',
          fontWeight: 800,
          color: '#40e0d0',
          letterSpacing: '0.5px'
        }}>
          BIDLi
        </div>
      </div>

      {/* Categorie scrollabili inline */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        flex: 1,
        paddingRight: '8px'
      }}
      className="categories-scroll"
      >
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            onClick={() => navigate(`/category/${category.id}`)}
            style={{
              minWidth: 'fit-content',
              padding: '6px 12px',
              background: 'rgba(64, 224, 208, 0.08)',
              border: '1px solid rgba(64, 224, 208, 0.2)',
              borderRadius: '16px',
              color: '#40e0d0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(64, 224, 208, 0.15)';
              e.target.style.borderColor = 'rgba(64, 224, 208, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(64, 224, 208, 0.08)';
              e.target.style.borderColor = 'rgba(64, 224, 208, 0.2)';
            }}
          >
            {category.label}
          </div>
        ))}
      </div>

    </div>
  );
}
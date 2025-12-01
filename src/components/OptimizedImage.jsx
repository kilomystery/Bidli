// src/components/OptimizedImage.jsx
// Componente per immagini ottimizzate con WebP, fallback e lazy loading

import React, { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  width, 
  height,
  lazy = true,
  quality = 80,
  fallback = null,
  onLoad = () => {},
  onError = () => {},
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const imgRef = useRef(null);

  // Genera URL WebP se supportato
  const generateWebPUrl = (originalUrl) => {
    if (!originalUrl) return originalUrl;
    
    // Se è già un'immagine ottimizzata o esterna, usa così com'è
    if (originalUrl.includes('.webp') || originalUrl.startsWith('http')) {
      return originalUrl;
    }
    
    // Per immagini locali, genera versione WebP
    const extension = originalUrl.split('.').pop();
    if (['jpg', 'jpeg', 'png'].includes(extension?.toLowerCase())) {
      return originalUrl.replace(`.${extension}`, `.webp`);
    }
    
    return originalUrl;
  };

  // Controlla supporto WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  };

  // Intersection Observer per lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Inizia caricamento 50px prima che entri in vista
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Imposta source dell'immagine
  useEffect(() => {
    if (!isInView || !src) return;

    let imageUrl = src;
    
    // Usa WebP se supportato
    if (supportsWebP()) {
      imageUrl = generateWebPUrl(src);
    }

    // Aggiungi parametri di ottimizzazione se supportati
    if (width || height || quality !== 80) {
      const url = new URL(imageUrl, window.location.origin);
      if (width) url.searchParams.set('w', width.toString());
      if (height) url.searchParams.set('h', height.toString());
      if (quality !== 80) url.searchParams.set('q', quality.toString());
      imageUrl = url.toString();
    }

    setCurrentSrc(imageUrl);
  }, [isInView, src, width, height, quality]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad(e);
  };

  const handleError = (e) => {
    setImageError(true);
    
    // Fallback: prova versione originale se WebP fallisce
    if (currentSrc.includes('.webp') && src) {
      setCurrentSrc(src);
      setImageError(false);
      return;
    }
    
    onError(e);
  };

  // Placeholder mentre carica
  const renderPlaceholder = () => (
    <div 
      ref={imgRef}
      className={`image-placeholder ${className}`}
      style={{
        ...style,
        width: width || style.width || '100%',
        height: height || style.height || 'auto',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60px'
      }}
    >
      {lazy && !isInView ? (
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(64, 224, 208, 0.3)',
          borderTop: '2px solid #40e0d0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      )}
    </div>
  );

  // Fallback custom se immagine non carica
  const renderFallback = () => {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div 
        className={`image-error ${className}`}
        style={{
          ...style,
          width: width || style.width || '100%',
          height: height || style.height || 'auto',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60px',
          fontSize: '12px',
          textAlign: 'center',
          padding: '8px'
        }}
      >
        ⚠️ Immagine non disponibile
      </div>
    );
  };

  // Se non in vista (lazy loading), mostra placeholder
  if (!isInView) {
    return renderPlaceholder();
  }

  // Se errore di caricamento, mostra fallback
  if (imageError) {
    return renderFallback();
  }

  // Se non c'è src, mostra placeholder
  if (!currentSrc) {
    return renderPlaceholder();
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={className}
        style={{
          ...style,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Placeholder durante caricamento */}
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(64, 224, 208, 0.3)',
            borderTop: '2px solid #40e0d0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
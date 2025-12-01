// src/components/MobileSellDashboard.jsx - Dashboard vendita compatta sotto video mobile
import React, { useState } from 'react';
import { useNotification } from './NotificationSystem';

export default function MobileSellDashboard({ 
  onAddProduct, 
  adding = false,
  currentLot,
  lots = [],
  onNextLot,
  onEndLive,
  isStreaming = false,
  onPauseStream = null,
  onStopStream = null
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    title: '',
    start_price: '',
    buy_now_price: '',
    min_bid_increment: '',
    description: ''
  });
  const { success, error } = useNotification();

  const addQuickProduct = async () => {
    if (!quickProduct.title.trim() || !quickProduct.start_price) {
      error('⚠️ Inserisci almeno titolo e prezzo');
      return;
    }

    const price = parseFloat(quickProduct.start_price);
    if (isNaN(price) || price <= 0) {
      error('⚠️ Prezzo non valido');
      return;
    }

    if (onAddProduct) {
      const productData = {
        title: quickProduct.title.trim(),
        start_price: price,
        description: quickProduct.description.trim() || null
      };
      
      // Aggiungi prezzo fisso se specificato
      if (quickProduct.buy_now_price && String(quickProduct.buy_now_price).trim()) {
        const buyNowPrice = parseFloat(quickProduct.buy_now_price);
        if (!isNaN(buyNowPrice) && buyNowPrice > 0) {
          productData.buy_now_price = buyNowPrice;
        }
      }

      // Aggiungi minimo rilancio se specificato
      if (quickProduct.min_bid_increment && String(quickProduct.min_bid_increment).trim()) {
        const minIncrement = parseFloat(quickProduct.min_bid_increment);
        if (!isNaN(minIncrement) && minIncrement >= 1) {
          productData.min_bid_increment = minIncrement;
        }
      }
      
      await onAddProduct(productData);
      
      // Reset form
      setQuickProduct({ title: '', start_price: '', buy_now_price: '', min_bid_increment: '', description: '' });
      setIsExpanded(false);
      success('🚀 Prodotto aggiunto alla coda!');
    }
  };

  const nextLot = () => {
    if (onNextLot) {
      onNextLot();
      success('⏭️ Prossimo prodotto in asta!');
    }
  };

  const queuedLots = lots.filter(l => l.status === 'queued');

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Handle per espandere */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '12px',
          textAlign: 'center',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}
      >
        <div style={{
          width: '40px',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '2px',
          margin: '0 auto 8px auto'
        }} />
        <div style={{ 
          color: 'white', 
          fontSize: '14px', 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>📊 Dashboard Vendita</span>
          <span style={{ 
            background: 'rgba(16, 185, 129, 0.2)', 
            color: '#10b981',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px'
          }}>
            {queuedLots.length} in coda
          </span>
          <span style={{ 
            fontSize: '12px', 
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ⬆️
          </span>
        </div>
      </div>

      {/* Contenuto espandibile - SCORREVOLE */}
      <div style={{
        maxHeight: isExpanded ? '70vh' : '0',
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: 'max-height 0.3s ease'
      }}>
        <div style={{ padding: '20px' }}>
          
          {/* Stato Asta Corrente */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                🎯 Asta Attuale
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {queuedLots.length > 0 && (
                  <button
                    onClick={nextLot}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    className="hover-scale"
                  >
                    ⏭️ Prossimo
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Terminare la live? Tutti i prodotti in coda verranno persi.')) {
                      onEndLive && onEndLive();
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  className="hover-scale"
                >
                  🔴 Fine Live
                </button>
              </div>
            </div>
            
            {currentLot ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {currentLot.title}
                </div>
                <div style={{ opacity: 0.7, fontSize: '12px', lineHeight: '1.3' }}>
                  Base asta: €{currentLot.start_price}
                  {currentLot.buy_now_price && (
                    <div>Compra subito: €{currentLot.buy_now_price}</div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: '13px',
                fontStyle: 'italic'
              }}>
                Nessun prodotto in asta
              </div>
            )}
          </div>

          {/* Aggiunta Rapida Prodotto */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: 600,
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚡</span>
              <span>Aggiungi Prodotto Veloce</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Titolo */}
              <input
                type="text"
                placeholder="Titolo prodotto..."
                value={quickProduct.title}
                onChange={(e) => setQuickProduct(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />

              {/* Prezzi */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="€ Base asta"
                  value={quickProduct.start_price}
                  onChange={(e) => setQuickProduct(prev => ({ ...prev, start_price: e.target.value }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100px',
                    flexShrink: 0
                  }}
                />
                <input
                  type="number"
                  placeholder="€ Compra subito"
                  value={quickProduct.buy_now_price}
                  onChange={(e) => setQuickProduct(prev => ({ ...prev, buy_now_price: e.target.value }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100px',
                    flexShrink: 0
                  }}
                />
              </div>

              {/* Minimo Rilancio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', minWidth: '80px' }}>
                  Min rilancio:
                </span>
                <input
                  type="number"
                  placeholder="€1"
                  min="1"
                  value={quickProduct.min_bid_increment}
                  onChange={(e) => setQuickProduct(prev => ({ ...prev, min_bid_increment: e.target.value }))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    width: '70px',
                    flexShrink: 0
                  }}
                />
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                  (default €1)
                </span>
              </div>
              
              {/* Descrizione */}
              <input
                type="text"
                placeholder="Descrizione (opzionale)"
                value={quickProduct.description}
                onChange={(e) => setQuickProduct(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%'
                }}
              />

              {/* Pulsante Aggiungi */}
              <button
                onClick={addQuickProduct}
                disabled={adding || !quickProduct.title.trim() || !quickProduct.start_price}
                style={{
                  background: adding || !quickProduct.title.trim() || !quickProduct.start_price
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: adding || !quickProduct.title.trim() || !quickProduct.start_price 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                className={adding || !quickProduct.title.trim() || !quickProduct.start_price ? '' : 'hover-scale'}
              >
                {adding ? (
                  <>
                    <span className="spin">⏳</span>
                    <span>Aggiungendo...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Aggiungi alla Coda</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Lista Coda Veloce */}
          {queuedLots.length > 0 && (
            <div style={{
              marginTop: '16px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                🗂️ Prossimi {queuedLots.length} prodotti:
              </div>
              <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                {queuedLots.slice(0, 5).map((lot, idx) => (
                  <div key={lot.id} style={{ 
                    padding: '4px 0', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    opacity: 0.7
                  }}>
                    <span>{idx + 1}. {lot.title}</span>
                    <div style={{ textAlign: 'right', lineHeight: '1.2', fontSize: '11px' }}>
                      <div>€{lot.start_price}</div>
                      {lot.buy_now_price && (
                        <div style={{ color: '#10b981' }}>
                          Fisso: €{lot.buy_now_price}
                        </div>
                      )}
                      {lot.min_bid_increment && lot.min_bid_increment > 1 && (
                        <div style={{ color: '#f59e0b', fontSize: '10px' }}>
                          Min: +€{lot.min_bid_increment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {queuedLots.length > 5 && (
                  <div style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    ...e altri {queuedLots.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
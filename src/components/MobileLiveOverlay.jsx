// src/components/MobileLiveOverlay.jsx - Overlay mobile per live con commenti su video
import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from './NotificationSystem';

export default function MobileLiveOverlay({ 
  messages = [], 
  bids = [], 
  currentLot, 
  onAssignLot,
  onSendMessage,
  onAcceptBid,
  onEndLive 
}) {
  const [newMessage, setNewMessage] = useState('');
  const [overlayMessages, setOverlayMessages] = useState([]);
  const [bidPopups, setBidPopups] = useState([]);
  const messagesEndRef = useRef(null);
  const { success } = useNotification();

  // Gestisce messaggi overlay con scorrimento automatico
  useEffect(() => {
    // Mantieni solo gli ultimi 6 messaggi
    const recentMessages = messages.slice(-6).map((msg, idx) => ({
      ...msg,
      id: msg.id || Date.now() + idx,
      timestamp: Date.now()
    }));
    
    setOverlayMessages(recentMessages);
  }, [messages]);

  // Gestisce pop-up offerte verdi
  useEffect(() => {
    if (bids.length > 0) {
      const latestBid = bids[0];
      const popupId = Date.now();
      
      setBidPopups(prev => [...prev, {
        id: popupId,
        amount: latestBid.amount,
        bidder: latestBid.bidder_name || 'Anonimo',
        timestamp: Date.now()
      }]);

      // Remove popup dopo 4 secondi
      setTimeout(() => {
        setBidPopups(prev => prev.filter(p => p.id !== popupId));
      }, 4000);
    }
  }, [bids]);

  const sendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const assignLot = () => {
    if (onAssignLot && currentLot) {
      onAssignLot(currentLot.id);
      success('🎯 Prodotto assegnato!');
    }
  };

  const acceptTopBid = () => {
    if (bids.length > 0 && onAcceptBid) {
      onAcceptBid(bids[0]);
      success(`✅ Offerta di €${bids[0].amount} accettata!`);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 10
    }}>
      {/* COMMENTI SCORRIMENTO SUL VIDEO */}
      <div style={{
        position: 'absolute',
        left: 16,
        bottom: 120,
        right: 16,
        height: 200,
        pointerEvents: 'none'
      }}>
        {overlayMessages.map((msg, idx) => (
          <div
            key={msg.id}
            style={{
              color: 'white',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: 500,
              animation: `slideInLeft 0.3s ease-out`,
              maxWidth: '85%',
              wordBreak: 'break-word',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)', // Ombra per leggibilità
              lineHeight: '1.4'
            }}
            className="fade-in"
          >
            <div style={{ 
              fontSize: '12px',
              opacity: 0.9,
              fontWeight: 600,
              marginBottom: '2px'
            }}>
              {msg.sender_name || 'Anonimo'}:
            </div>
            <div style={{ fontSize: '13px' }}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* POP-UP VERDI NUOVE OFFERTE */}
      {bidPopups.map(popup => (
        <div
          key={popup.id}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            animation: 'popBid 4s ease-out forwards',
            zIndex: 20,
            pointerEvents: 'none',
            textAlign: 'center',
            minWidth: '180px'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>
            💰 €{popup.amount}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Nuova offerta da {popup.bidder}
          </div>
        </div>
      ))}

      {/* PULSANTE ASSEGNA PRODOTTO - Trasparente con bordi */}
      {currentLot && (
        <button
          onClick={assignLot}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '25px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 15
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.borderColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 0, 0, 0.5)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)';
          }}
          className="hover-scale"
        >
          🎯 Assegna Prodotto
        </button>
      )}

      {/* PULSANTE ACCETTA OFFERTA MIGLIORE */}
      {bids.length > 0 && (
        <button
          onClick={acceptTopBid}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'rgba(16, 185, 129, 0.9)',
            color: 'white',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '25px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 600,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 15
          }}
          className="hover-scale pulse"
        >
          ✅ €{bids[0].amount}
        </button>
      )}

      {/* PULSANTE TERMINA LIVE */}
      <button
        onClick={() => {
          if (window.confirm('Sei sicuro di voler terminare la live? Questa azione non può essere annullata.')) {
            onEndLive && onEndLive();
          }
        }}
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '25px',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 15
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(220, 38, 38, 0.95)';
          e.target.style.transform = 'translateX(-50%) scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(239, 68, 68, 0.9)';
          e.target.style.transform = 'translateX(-50%) scale(1)';
        }}
      >
        🔴 Termina Live
      </button>

      {/* CHAT INPUT MOBILE */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        display: 'flex',
        gap: '8px',
        pointerEvents: 'auto'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Scrivi in chat..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '25px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '14px',
            backdropFilter: 'blur(10px)',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            padding: '12px 16px',
            borderRadius: '25px',
            border: 'none',
            background: newMessage.trim() 
              ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
              : 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            minWidth: '60px'
          }}
          className={newMessage.trim() ? 'hover-scale' : ''}
        >
          🚀
        </button>
      </div>
    </div>
  );
}

// CSS aggiuntivo per animazioni specifiche
const additionalStyles = `
@keyframes slideInLeft {
  from { 
    transform: translateX(-100%); 
    opacity: 0; 
  }
  to { 
    transform: translateX(0); 
    opacity: 1; 
  }
}

@keyframes popBid {
  0% { 
    transform: translate(-50%, -50%) scale(0.5); 
    opacity: 0; 
  }
  15% { 
    transform: translate(-50%, -50%) scale(1.1); 
    opacity: 1; 
  }
  30% { 
    transform: translate(-50%, -50%) scale(1); 
    opacity: 1; 
  }
  85% { 
    transform: translate(-50%, -50%) scale(1); 
    opacity: 1; 
  }
  100% { 
    transform: translate(-50%, -50%) scale(0.8); 
    opacity: 0; 
  }
}
`;

// Inietta stili
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = additionalStyles;
  document.head.appendChild(style);
}
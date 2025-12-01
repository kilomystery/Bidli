import React from "react";

export default function LiveCard({ item, scheduled = false, onOpen }) {
  const isSponsored = !!item.sponsored;
  
  const handleRemindMe = (e) => {
    e.stopPropagation();
    // Salva la notifica in localStorage
    const savedNotifications = JSON.parse(localStorage.getItem('liveNotifications') || '[]');
    const newNotification = {
      liveId: item.id,
      title: item.title,
      seller: item.seller,
      scheduledAt: item.scheduled_at || item.startIn
    };
    
    if (!savedNotifications.some(n => n.liveId === item.id)) {
      savedNotifications.push(newNotification);
      localStorage.setItem('liveNotifications', JSON.stringify(savedNotifications));
      alert(`🔔 Ti ricorderemo quando "${item.title}" inizierà!`);
    } else {
      alert(`✅ Hai già attivato le notifiche per questa live`);
    }
  };

  const handleSaveLive = (e) => {
    e.stopPropagation();
    // Salva la live nei preferiti
    const savedLives = JSON.parse(localStorage.getItem('savedLives') || '[]');
    const newSave = {
      liveId: item.id,
      title: item.title,
      seller: item.seller,
      category: item.category,
      savedAt: new Date().toISOString()
    };
    
    if (!savedLives.some(l => l.liveId === item.id)) {
      savedLives.push(newSave);
      localStorage.setItem('savedLives', JSON.stringify(savedLives));
      alert(`💾 "${item.title}" salvata nei tuoi preferiti!`);
    } else {
      alert(`✅ Questa live è già nei tuoi preferiti`);
    }
  };

  return (
    <div style={{
      ...styles.card,
      border: isSponsored ? '2px solid #fbbf24' : styles.card.border,
      boxShadow: isSponsored ? '0 8px 25px rgba(251, 191, 36, 0.3)' : '0 4px 15px rgba(64, 224, 208, 0.15)'
    }} onClick={() => onOpen?.(item)}>
      
      {/* THUMB AREA - FORMATO ORIGINALE */}
      <div style={styles.thumb}>
        {/* Badge LIVE in alto a sinistra - CON NEON */}
        <div style={{ 
          ...styles.liveBadge, 
          background: scheduled ? "linear-gradient(135deg, #8b5cf6, #06b6d4)" : "linear-gradient(135deg, #ef4444, #f59e0b)",
          boxShadow: scheduled ? "0 0 20px rgba(139, 92, 246, 0.6)" : "0 0 20px rgba(239, 68, 68, 0.8)"
        }}>
          {scheduled ? "🔜 PROSSIMA" : "🔴 LIVE"}
        </div>
        
        {/* Badge sponsorizzata in alto a destra - CON NEON */}
        {isSponsored && (
          <div style={styles.sponsoredBadge}>
            ✨ SPONSOR
          </div>
        )}
        
        {/* Icona centrale se nessun video */}
        <div style={styles.centerIcon}>
          {scheduled ? "📅" : "📺"}
        </div>
        
        {/* Spettatori in basso a destra - CON NEON */}
        {!scheduled && (
          <div style={styles.viewersBadge}>
            👁️ {item.viewers || 0}
          </div>
        )}
        
        {/* Timer per live programmate */}
        {scheduled && (
          <div style={styles.timerBadge}>
            ⏰ {item.startIn}
          </div>
        )}
      </div>

      {/* BODY AREA - CON TESTI TURCHESI E NEON */}
      <div style={styles.body}>
        <div style={styles.title}>{item.title}</div>
        <div style={styles.sub}>
          <span style={styles.seller}>@{item.seller_display_name || item.seller}</span>
          <span> • {item.category}</span>
        </div>
        
        {/* Pulsanti per live sponsorizzate programmate */}
        {isSponsored && scheduled ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 8
          }}>
            <button
              onClick={handleRemindMe}
              style={{
                ...styles.btn,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                fontSize: 12,
                padding: '8px 12px',
                height: 36,
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
              }}
            >
              🔔 Ricordami
            </button>
            <button
              onClick={handleSaveLive}
              style={{
                ...styles.btn,
                background: 'linear-gradient(135deg, #10b981, #059669)',
                fontSize: 12,
                padding: '8px 12px',
                height: 36,
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
              }}
            >
              💾 Salva
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen?.(item); }}
            style={{
              ...styles.btn,
              background: isSponsored ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              boxShadow: isSponsored ? '0 0 20px rgba(251, 191, 36, 0.6)' : '0 0 20px rgba(6, 182, 212, 0.6)'
            }}
          >
            {scheduled ? 'Anteprima' : '🎯 Entra ora'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  // CARD ORIGINALE - NO ASPECT RATIO FORZATO
  card: { 
    border: "1px solid rgba(64, 224, 208, 0.3)", 
    borderRadius: 16, 
    overflow: "hidden", 
    cursor: "pointer", 
    background: "rgba(64, 224, 208, 0.03)", 
    display: "grid", 
    gridTemplateRows: "auto 1fr", // Lascia spazio naturale al contenuto
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    minWidth: 280,
    maxWidth: 360,
    ':hover': {
      transform: "scale(1.02)",
      boxShadow: "0 0 25px rgba(64, 224, 208, 0.3)"
    }
  },
  
  // THUMB ORIGINALE - ALTEZZA FLESSIBILE  
  thumb: { 
    background: "linear-gradient(135deg, rgba(64, 224, 208, 0.2), rgba(6, 182, 212, 0.1))", 
    position: "relative",
    backgroundSize: "contain", // CONTAIN invece di COVER
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200, // Minimo per non essere troppo piccolo
    height: "auto" // Altezza automatica
  },
  
  liveBadge: { 
    position: "absolute", 
    top: 8, 
    left: 8, 
    color: "#ffffff", 
    fontSize: 10, 
    fontWeight: 800,
    padding: "4px 8px", 
    borderRadius: 12, 
    letterSpacing: 0.5,
    textTransform: "uppercase",
    zIndex: 30,
    backdropFilter: "blur(10px)"
  },
  
  sponsoredBadge: { 
    position: "absolute", 
    top: 8, 
    right: 8, 
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)", 
    color: "#fff", 
    fontSize: 9, 
    fontWeight: 800,
    padding: "3px 6px", 
    borderRadius: 12,
    boxShadow: "0 0 15px rgba(251, 191, 36, 0.6)"
  },
  
  centerIcon: {
    fontSize: 32,
    opacity: 0.4,
    color: "#40e0d0",
    textShadow: "0 0 20px rgba(64, 224, 208, 0.6)"
  },
  
  viewersBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    background: "rgba(0,0,0,0.8)",
    color: "#40e0d0",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 12,
    backdropFilter: "blur(10px)",
    boxShadow: "0 0 15px rgba(64, 224, 208, 0.5)"
  },
  
  timerBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    background: "rgba(139, 92, 246, 0.9)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 12,
    backdropFilter: "blur(10px)",
    boxShadow: "0 0 15px rgba(139, 92, 246, 0.6)"
  },
  
  // BODY CON STILI TURCHESI E NEON
  body: { 
    padding: 16, 
    display: "grid", 
    gap: 8,
    background: "rgba(15, 23, 42, 0.5)"
  },
  
  title: { 
    fontWeight: 800, 
    lineHeight: 1.3,
    fontSize: 16,
    color: "#40e0d0",
    textShadow: "0 0 15px rgba(64, 224, 208, 0.6)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  
  sub: { 
    fontSize: 13, 
    color: "#40e0d0",
    opacity: 0.8
  },
  
  seller: { 
    fontWeight: 700, 
    color: "#40e0d0"
  },
  
  btn: { 
    marginTop: 12, 
    width: "100%", 
    height: 42, 
    borderRadius: 12, 
    color: "#fff", 
    border: 0, 
    fontWeight: 700, 
    cursor: "pointer",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    transition: "all 0.3s ease"
  }
};
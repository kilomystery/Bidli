import React, { useState, useEffect } from 'react';

const NotificationBell = ({ userId }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carica conteggio notifiche non lette
  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/social/notifications/${userId}/unread-count`);
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Errore caricamento conteggio notifiche:', error);
      }
    };

    fetchUnreadCount();
    
    // Ricarica ogni 30 secondi
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Carica notifiche quando apre dropdown
  const loadNotifications = async () => {
    if (!userId || loading) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/social/notifications/${userId}?limit=20`);
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Errore caricamento notifiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!showDropdown) {
      loadNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow': return '👤';
      case 'like': return '❤️';
      case 'new_post': return '📝';
      case 'comment': return '💬';
      case 'live_start': return '🔴';
      default: return '🔔';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
          color: '#ffffff'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {/* Badge conteggio */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0f172a'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notifiche */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: (typeof window !== 'undefined' && window.innerWidth <= 768) ? -80 : 0,
          width: (typeof window !== 'undefined' && window.innerWidth <= 768) ? Math.min(300, window.innerWidth - 32) : '360px',
          maxHeight: (typeof window !== 'undefined' && window.innerWidth <= 768) ? (window.innerHeight - 200) : '480px',
          background: '#0f172a',
          border: '2px solid rgba(64, 224, 208, 0.6)',
          borderRadius: '12px',
          boxShadow: '0 0 30px rgba(64, 224, 208, 0.5), 0 10px 40px rgba(0,0,0,0.7)',
          zIndex: 1000,
          marginTop: '8px',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '2px solid rgba(64, 224, 208, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#ffffff'
            }}>
              🔔 Notifiche
            </h3>
            {unreadCount > 0 && (
              <span style={{
                background: '#40e0d0',
                color: '#0f172a',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {unreadCount} nuove
              </span>
            )}
          </div>

          {/* Lista Notifiche */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: '#ffffff'
              }}>
                <div>Caricamento...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{
                padding: '32px',
                textAlign: 'center',
                color: '#ffffff'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Nessuna notifica</div>
                <div style={{ fontSize: '14px', opacity: 0.7 }}>Le tue notifiche appariranno qui</div>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(64, 224, 208, 0.1)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    opacity: notification.is_read ? 0.7 : 1,
                    background: notification.is_read ? 'transparent' : 'rgba(64, 224, 208, 0.05)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.1)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = notification.is_read ? 'transparent' : 'rgba(64, 224, 208, 0.05)'}
                  onClick={() => {
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                    setShowDropdown(false);
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {/* Icona */}
                    <div style={{
                      fontSize: '20px',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Contenuto */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        {notification.title}
                      </div>
                      
                      <div style={{
                        color: '#ffffff',
                        fontSize: '13px',
                        marginBottom: '6px',
                        lineHeight: '1.4'
                      }}>
                        {notification.actor && (
                          <span style={{ fontWeight: 'bold', color: '#40e0d0' }}>
                            {notification.actor.first_name || notification.actor.username}{' '}
                          </span>
                        )}
                        {notification.message}
                      </div>
                      
                      <div style={{
                        color: '#ffffff',
                        fontSize: '12px',
                        opacity: 0.6
                      }}>
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                    
                    {/* Indicatore non letto */}
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#40e0d0',
                        flexShrink: 0,
                        marginTop: '6px'
                      }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(64, 224, 208, 0.1)',
            textAlign: 'center'
          }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#40e0d0',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              onClick={() => setShowDropdown(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
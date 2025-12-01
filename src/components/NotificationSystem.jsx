// src/components/NotificationSystem.jsx - Sistema notifiche con feedback visivo
import React, { useState, useEffect, createContext, useContext } from 'react';
// Transitions CSS già importato globalmente in App.jsx

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve essere usato dentro NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);

    // Auto-remove dopo duration
    setTimeout(() => {
      removeNotification(id);
    }, duration);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Shortcuts per tipologie comuni
  const success = (message, duration = 4000) => addNotification(message, 'success', duration);
  const error = (message, duration = 6000) => addNotification(message, 'error', duration);
  const info = (message, duration = 5000) => addNotification(message, 'info', duration);
  const warning = (message, duration = 5000) => addNotification(message, 'warning', duration);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    warning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({ notifications, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getStyles = (type) => {
    const baseStyles = {
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
      border: '2px solid transparent',
      animation: isExiting ? 'slideOut 0.3s ease-in' : 'slideIn 0.4s ease-out'
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          border: '2px solid #86efac',
          color: '#166534'
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
          border: '2px solid #fca5a5',
          color: '#dc2626'
        };
      case 'warning':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px solid #fcd34d',
          color: '#d97706'
        };
      case 'info':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '2px solid #93c5fd',
          color: '#1e40af'
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div
      style={getStyles(notification.type)}
      onClick={handleRemove}
      className="notification fade-in"
    >
      <span style={{ fontSize: '18px' }}>
        {getIcon(notification.type)}
      </span>
      <span style={{ flex: 1 }}>
        {notification.message}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '16px',
          cursor: 'pointer',
          opacity: 0.7,
          padding: '4px',
          borderRadius: '4px',
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.7'}
      >
        ✕
      </button>
    </div>
  );
}

// CSS aggiuntivo per animazione slideOut
const additionalStyles = `
@keyframes slideOut {
  from { 
    transform: translateX(0); 
    opacity: 1; 
    max-height: 100px;
  }
  to { 
    transform: translateX(100%); 
    opacity: 0; 
    max-height: 0;
    padding: 0;
    margin: 0;
  }
}
`;

// Inietta gli stili
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = additionalStyles;
  document.head.appendChild(style);
}

export default NotificationProvider;
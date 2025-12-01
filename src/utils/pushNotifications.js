// src/utils/pushNotifications.js
// Sistema notifiche push per follower, messaggi, live

export class PushNotificationManager {
  static vapidPublicKey = 'BMhTYJg-Sl8pxJRa2hGXZZ4dGG9fP9x0mxYqTNjIAkc2OQHqK3B1F_n7Xr3LwVGnhNg_xBLa4Q8Q2QlQ3RLqWz8'; // Placeholder - da sostituire

  static async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser non supporta notifiche');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker non supportato');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static async getSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('Errore nel recupero subscription:', error);
      return null;
    }
  }

  static async subscribe() {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Permesso notifiche negato');
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Salva subscription nel backend
      await this.saveSubscription(subscription);
      
      console.log('✅ Push notifications attivate');
      return subscription;
    } catch (error) {
      console.error('❌ Errore attivazione push notifications:', error);
      throw error;
    }
  }

  static async unsubscribe() {
    try {
      const subscription = await this.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscription(subscription);
        console.log('✅ Push notifications disattivate');
      }
    } catch (error) {
      console.error('❌ Errore disattivazione push notifications:', error);
      throw error;
    }
  }

  static async saveSubscription(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Errore salvataggio subscription');
      }
    } catch (error) {
      console.error('Errore salvataggio subscription:', error);
      throw error;
    }
  }

  static async removeSubscription(subscription) {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Errore rimozione subscription');
      }
    } catch (error) {
      console.error('Errore rimozione subscription:', error);
      throw error;
    }
  }

  static urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  static async isSubscribed() {
    const subscription = await this.getSubscription();
    return !!subscription;
  }

  static async showLocalNotification(title, options = {}) {
    if (!('Notification' in window)) return;

    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/icon-192x192.png',
      tag: 'bidli-notification',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, defaultOptions);
    } catch (error) {
      // Fallback a notifica browser normale
      if (Notification.permission === 'granted') {
        new Notification(title, defaultOptions);
      }
    }
  }
}

// Componente React per gestire notifiche
export const NotificationSettings = ({ onToggle }) => {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      const subscribed = await PushNotificationManager.isSubscribed();
      setIsEnabled(subscribed);
    } catch (error) {
      console.error('Errore controllo stato notifiche:', error);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isEnabled) {
        await PushNotificationManager.unsubscribe();
        setIsEnabled(false);
        onToggle?.(false);
      } else {
        await PushNotificationManager.subscribe();
        setIsEnabled(true);
        onToggle?.(true);
      }
    } catch (error) {
      console.error('Errore toggle notifiche:', error);
      // Mostra messaggio errore all'utente
      PushNotificationManager.showLocalNotification(
        'Errore Notifiche',
        {
          body: 'Impossibile modificare le impostazioni notifiche',
          icon: '/favicon.ico'
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: 'rgba(64, 224, 208, 0.1)',
      borderRadius: '12px',
      border: '1px solid rgba(64, 224, 208, 0.3)'
    }}>
      <div>
        <div style={{
          color: '#ffffff',
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
          Notifiche Push
        </div>
        <div style={{
          color: '#94a3b8',
          fontSize: '14px'
        }}>
          Ricevi notifiche per follower, messaggi e live
        </div>
      </div>
      
      <button
        onClick={handleToggle}
        disabled={loading}
        style={{
          width: '60px',
          height: '32px',
          borderRadius: '16px',
          border: 'none',
          backgroundColor: isEnabled ? '#40e0d0' : '#475569',
          position: 'relative',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.6 : 1
        }}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: '4px',
          left: isEnabled ? '32px' : '4px',
          transition: 'left 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {loading ? (
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #94a3b8',
              borderTop: '2px solid #40e0d0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isEnabled ? '#40e0d0' : '#94a3b8'
            }} />
          )}
        </div>
      </button>
    </div>
  );
};
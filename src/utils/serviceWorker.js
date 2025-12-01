// src/utils/serviceWorker.js
// Utilità per registrazione e gestione Service Worker

export class ServiceWorkerManager {
  static isSupported() {
    return 'serviceWorker' in navigator;
  }

  static async register() {
    if (!this.isSupported()) {
      console.warn('Service Worker non supportato');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ SW: Registrato con successo', registration.scope);

      // Gestisce aggiornamenti
      registration.addEventListener('updatefound', () => {
        this.handleUpdate(registration);
      });

      // Controlla aggiornamenti ogni 30 minuti
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);

      return registration;
    } catch (error) {
      console.error('❌ SW: Registrazione fallita:', error);
      return null;
    }
  }

  static handleUpdate(registration) {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // Nuovo SW disponibile, offri aggiornamento
        this.showUpdateNotification();
      }
    });
  }

  static showUpdateNotification() {
    // Crea notifica di aggiornamento
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0f172a;
      color: white;
      padding: 16px;
      border-radius: 12px;
      border: 2px solid #40e0d0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 10000;
      max-width: 320px;
      font-family: system-ui, sans-serif;
      animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <div style="width: 8px; height: 8px; background: #40e0d0; border-radius: 50%;"></div>
        <strong>Aggiornamento Disponibile</strong>
      </div>
      <p style="margin: 0 0 12px; font-size: 14px; color: #cbd5e1;">
        È disponibile una nuova versione di BIDLi con miglioramenti e correzioni.
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="update-now" style="
          background: #40e0d0;
          color: #0f172a;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
        ">
          Aggiorna Ora
        </button>
        <button id="update-later" style="
          background: transparent;
          color: #94a3b8;
          border: 1px solid #475569;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        ">
          Più Tardi
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Event listeners
    notification.querySelector('#update-now').addEventListener('click', () => {
      this.applyUpdate();
      notification.remove();
    });

    notification.querySelector('#update-later').addEventListener('click', () => {
      notification.remove();
    });

    // Auto-remove dopo 10 secondi
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  static async applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.waiting) return;

    // Dice al SW waiting di saltare il waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Ricarica pagina quando SW prende controllo
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  static async clearCache() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'CACHE_CLEAR' });
    }
  }

  static async getCacheStatus() {
    if (!this.isSupported()) return null;

    try {
      const cacheNames = await caches.keys();
      const bidliCaches = cacheNames.filter(name => name.startsWith('bidli-'));
      
      let totalSize = 0;
      for (const cacheName of bidliCaches) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          try {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          } catch (e) {
            // Ignora errori su singole entry
          }
        }
      }

      return {
        caches: bidliCaches.length,
        sizeKB: Math.round(totalSize / 1024),
        sizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      };
    } catch (error) {
      console.warn('Errore nel calcolo cache status:', error);
      return null;
    }
  }

  static isOnline() {
    return navigator.onLine;
  }

  static onConnectionChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// Auto-registrazione se in produzione
if (import.meta.env.PROD) {
  ServiceWorkerManager.register();
}

// CSS per animazioni
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
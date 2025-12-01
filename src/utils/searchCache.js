// src/utils/searchCache.js
// Sistema di cache intelligente per risultati di ricerca

const CACHE_PREFIX = 'bidli_search_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuti in millisecondi

export class SearchCache {
  static generateKey(query, filters = {}) {
    const filterString = JSON.stringify(filters);
    return `${CACHE_PREFIX}${query}_${btoa(filterString)}`;
  }

  static set(query, results, filters = {}) {
    try {
      const key = this.generateKey(query, filters);
      const cacheData = {
        results,
        timestamp: Date.now(),
        query,
        filters
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      
      // Pulisci cache vecchie per evitare accumulo
      this.cleanExpiredCache();
    } catch (error) {
      console.warn('Cache storage failed:', error);
    }
  }

  static get(query, filters = {}) {
    try {
      const key = this.generateKey(query, filters);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Controlla se la cache è scaduta
      if (now - cacheData.timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return cacheData.results;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  }

  static cleanExpiredCache() {
    try {
      const now = Date.now();
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            const cacheData = JSON.parse(cached);
            
            if (now - cacheData.timestamp > CACHE_DURATION) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // Cache corrotta, rimuovi
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  static clear() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }

  static getStats() {
    try {
      let cacheCount = 0;
      let totalSize = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          cacheCount++;
          const value = localStorage.getItem(key);
          totalSize += (key.length + (value ? value.length : 0)) * 2; // 2 bytes per char
        }
      }
      
      return {
        count: cacheCount,
        sizeKB: Math.round(totalSize / 1024),
        duration: CACHE_DURATION / 1000 / 60 // minuti
      };
    } catch (error) {
      console.warn('Cache stats failed:', error);
      return { count: 0, sizeKB: 0, duration: 5 };
    }
  }
}

// Auto-cleanup periodica ogni 10 minuti
setInterval(() => {
  SearchCache.cleanExpiredCache();
}, 10 * 60 * 1000);
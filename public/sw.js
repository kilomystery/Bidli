// public/sw.js
// Service Worker per cache offline e performance

const CACHE_NAME = 'bidli-v1.0.0';
const RUNTIME_CACHE = 'bidli-runtime';
const SEARCH_CACHE = 'bidli-search';
const IMAGE_CACHE = 'bidli-images';

// Risorse critiche da cachare immediatamente
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // CSS e JS verranno aggiunti automaticamente da Vite
];

// Strategie di cache
const CACHE_STRATEGIES = {
  // Network First per API critiche
  networkFirst: [
    '/api/sellers/search',
    '/api/profiles',
    '/api/notifications'
  ],
  
  // Cache First per assets statici
  cacheFirst: [
    '/assets/',
    '.woff2',
    '.woff',
    '.ttf'
  ],
  
  // Stale While Revalidate per contenuti dinamici
  staleWhileRevalidate: [
    '/api/posts',
    '/api/live',
    '/api/social-posts'
  ]
};

// Installazione SW
self.addEventListener('install', event => {
  console.log('🔧 SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔧 SW: Precaching resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ SW: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ SW: Installation failed:', error);
      })
  );
});

// Attivazione SW
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        // Rimuovi cache vecchie
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('bidli-') && 
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== SEARCH_CACHE &&
              cacheName !== IMAGE_CACHE
            )
            .map(cacheName => {
              console.log('🗑️ SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Intercettazione richieste
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora richieste non HTTP
  if (!request.url.startsWith('http')) return;
  
  // Ignora richieste cross-origin (eccetto immagini)
  if (url.origin !== location.origin && !isImageRequest(request)) {
    return;
  }

  event.respondWith(handleRequest(request));
});

// Gestione strategica delle richieste
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Ricerca venditori - Cache con TTL
    if (url.pathname.includes('/api/sellers/search')) {
      return handleSearchRequest(request);
    }
    
    // Immagini - Cache aggressive
    if (isImageRequest(request)) {
      return handleImageRequest(request);
    }
    
    // API critiche - Network first
    if (isNetworkFirstRequest(request)) {
      return handleNetworkFirst(request);
    }
    
    // Assets statici - Cache first
    if (isCacheFirstRequest(request)) {
      return handleCacheFirst(request);
    }
    
    // Contenuti dinamici - Stale while revalidate
    if (isStaleWhileRevalidateRequest(request)) {
      return handleStaleWhileRevalidate(request);
    }
    
    // Default: Network first con fallback
    return handleNetworkFirst(request);
    
  } catch (error) {
    console.error('SW: Request handling error:', error);
    return handleOffline(request);
  }
}

// Gestione ricerca con cache TTL
async function handleSearchRequest(request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  
  if (!query) {
    return fetch(request);
  }
  
  const cacheKey = `search-${query}`;
  const cache = await caches.open(SEARCH_CACHE);
  const cached = await cache.match(cacheKey);
  
  // Controlla se cache è ancora valida (5 minuti)
  if (cached) {
    const cacheTime = cached.headers.get('sw-cache-time');
    if (cacheTime && Date.now() - parseInt(cacheTime) < 5 * 60 * 1000) {
      console.log('🚀 SW: Search cache HIT for:', query);
      return cached;
    }
  }
  
  try {
    console.log('🔍 SW: Search cache MISS for:', query);
    const response = await fetch(request);
    
    if (response.ok) {
      const responseClone = response.clone();
      const responseWithTime = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...responseClone.headers,
          'sw-cache-time': Date.now().toString()
        }
      });
      
      cache.put(cacheKey, responseWithTime);
    }
    
    return response;
  } catch (error) {
    if (cached) {
      console.log('🔄 SW: Serving stale search cache for:', query);
      return cached;
    }
    throw error;
  }
}

// Gestione immagini con cache aggressiva
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback immagine placeholder
    return new Response(
      createPlaceholderImage(),
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Network First Strategy
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return handleOffline(request);
  }
}

// Cache First Strategy  
async function handleCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return handleOffline(request);
  }
}

// Stale While Revalidate Strategy
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

// Gestione offline
async function handleOffline(request) {
  const url = new URL(request.url);
  
  // Per navigazione, mostra pagina offline
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
    return cache.match('/offline.html') || 
           new Response('Offline - Connessione non disponibile', {
             status: 503,
             headers: { 'Content-Type': 'text/plain' }
           });
  }
  
  // Per API, ritorna errore JSON
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Connessione non disponibile' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response('Risorsa non disponibile offline', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i.test(request.url);
}

function isNetworkFirstRequest(request) {
  return CACHE_STRATEGIES.networkFirst.some(pattern => 
    request.url.includes(pattern)
  );
}

function isCacheFirstRequest(request) {
  return CACHE_STRATEGIES.cacheFirst.some(pattern => 
    request.url.includes(pattern)
  );
}

function isStaleWhileRevalidateRequest(request) {
  return CACHE_STRATEGIES.staleWhileRevalidate.some(pattern => 
    request.url.includes(pattern)
  );
}

function createPlaceholderImage() {
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="300" fill="#f3f4f6"/>
    <text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="16">
      Immagine non disponibile
    </text>
  </svg>`;
}

// Gestione messaggi dal main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_CLEAR') {
    clearAllCaches();
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('bidli-'))
      .map(name => caches.delete(name))
  );
}
import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Sempre true, non modificabile
    functional: false,
    analytics: false,
    marketing: false
  });

  // Controlla se l'utente ha già dato il consenso
  useEffect(() => {
    const consent = localStorage.getItem('bidli_cookie_consent');
    if (!consent) {
      // Mostra banner dopo 1 secondo per migliore UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Carica preferenze salvate
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (error) {
        console.error('Errore lettura preferenze cookies:', error);
      }
    }
  }, []);

  // Salva consenso e nascondi banner
  const saveConsent = (accepted = 'partial') => {
    const consentData = {
      ...preferences,
      timestamp: Date.now(),
      version: '1.0',
      type: accepted // 'all', 'partial', 'necessary'
    };

    localStorage.setItem('bidli_cookie_consent', JSON.stringify(consentData));
    setShowBanner(false);
    setShowSettings(false);

    // Triggera eventi per servizi di tracking
    if (typeof window.gtag !== 'undefined' && preferences.analytics) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }

    console.log('✅ Consenso cookies salvato:', consentData);
  };

  // Accetta tutti i cookies
  const acceptAll = () => {
    setPreferences({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    });
    setTimeout(() => saveConsent('all'), 100);
  };

  // Accetta solo necessari
  const acceptNecessary = () => {
    setPreferences({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    });
    setTimeout(() => saveConsent('necessary'), 100);
  };

  // Aggiorna preferenza specifica
  const updatePreference = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner principale */}
      {!showSettings && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1f2937',
          color: 'white',
          padding: '20px',
          zIndex: 1000,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          borderTop: '3px solid #6366f1'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap'
          }}>
            
            {/* Testo informativo */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '16px', 
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🍪 Utilizziamo i cookies
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#d1d5db', 
                lineHeight: '1.4' 
              }}>
                Utilizziamo cookies tecnici necessari e altri opzionali per migliorare la tua esperienza su BIDLi.
                <br />
                Puoi gestire le tue preferenze in qualsiasi momento. {' '}
                <a 
                  href="/privacy" 
                  style={{ color: '#a78bfa', textDecoration: 'underline' }}
                  target="_blank"
                >
                  Leggi la Privacy Policy
                </a>
              </div>
            </div>

            {/* Pulsanti azioni */}
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#374151';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9ca3af';
                }}
              >
                ⚙️ Gestisci
              </button>

              <button
                onClick={acceptNecessary}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#4b5563'}
                onMouseLeave={(e) => e.target.style.background = '#6b7280'}
              >
                Solo Necessari
              </button>

              <button
                onClick={acceptAll}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#4f46e5'}
                onMouseLeave={(e) => e.target.style.background = '#6366f1'}
              >
                ✅ Accetta Tutti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pannello impostazioni dettagliate */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#111827'
              }}>
                🍪 Gestione Cookies
              </h3>
              
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Categorie cookies */}
            <div style={{ marginBottom: '24px' }}>
              
              {/* Necessari */}
              <div style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    🔒 Cookies Necessari
                  </div>
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    SEMPRE ATTIVI
                  </div>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  Questi cookies sono indispensabili per il funzionamento del sito e non possono essere disattivati. Include autenticazione, sessioni e sicurezza.
                </div>
              </div>

              {/* Funzionali */}
              <div style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    ⚙️ Cookies Funzionali
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px'
                  }}>
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => updatePreference('functional', e.target.checked)}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: preferences.functional ? '#6366f1' : '#ccc',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: preferences.functional ? '23px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  Migliorano l'esperienza utente: preferenze linguistiche, impostazioni dell'interfaccia, salvataggio carrello.
                </div>
              </div>

              {/* Analytics */}
              <div style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    📊 Cookies Analytics
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px'
                  }}>
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => updatePreference('analytics', e.target.checked)}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: preferences.analytics ? '#6366f1' : '#ccc',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: preferences.analytics ? '23px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  Ci aiutano a capire come utilizzi il sito per migliorarne le performance. Google Analytics, statistiche anonime.
                </div>
              </div>

              {/* Marketing */}
              <div style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    🎯 Cookies Marketing
                  </div>
                  <label style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '44px',
                    height: '24px'
                  }}>
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => updatePreference('marketing', e.target.checked)}
                      style={{
                        opacity: 0,
                        width: 0,
                        height: 0
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: preferences.marketing ? '#6366f1' : '#ccc',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: preferences.marketing ? '23px' : '3px',
                        bottom: '3px',
                        background: 'white',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.4'
                }}>
                  Personalizzano pubblicità e contenuti in base ai tuoi interessi. Facebook Pixel, Google Ads, retargeting.
                </div>
              </div>
            </div>

            {/* Pulsanti azione */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={acceptNecessary}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Solo Necessari
              </button>
              
              <button
                onClick={() => saveConsent('partial')}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✅ Salva Preferenze
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
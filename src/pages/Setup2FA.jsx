import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TwoFactorAuth from '../components/TwoFactorAuth';

export default function Setup2FA() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    setUser(user);

    // Carica profilo utente
    const { data: profileData } = await supabase
      .from('profiles')
      .select('two_factor_enabled, phone, phone_verified')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    // Se arriva dal parametro URL, mostra subito il modal
    if (searchParams.get('setup2fa') === 'true') {
      setShowModal(true);
    }
  }

  function handleSetupComplete() {
    setShowModal(false);
    // Ricarica il profilo per aggiornare lo stato
    checkAuthAndLoad();
    // Reindirizza alla dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  }

  function handleSkip() {
    setShowModal(false);
    navigate('/dashboard');
  }

  function handleEnable2FA() {
    setShowModal(true);
  }

  if (!user || !profile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        padding: '40px 20px',
        marginTop: '80px'
      }}>
        
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: profile.two_factor_enabled ? '#10b981' : '#3b82f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              {profile.two_factor_enabled ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4" 
                        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: '#1a202c',
              marginBottom: '8px' 
            }}>
              {profile.two_factor_enabled ? 'Sicurezza Attiva' : 'Proteggi il tuo Account'}
            </h1>
            
            <p style={{ 
              color: '#64748b', 
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              {profile.two_factor_enabled 
                ? 'Il tuo account è protetto con l\'autenticazione a due fattori'
                : 'Aggiungi un livello extra di sicurezza con la verifica SMS'
              }
            </p>
          </div>

          {profile.two_factor_enabled ? (
            // Stato abilitato
            <div>
              <div style={{
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontWeight: 600, color: '#065f46' }}>2FA Attivo</span>
                </div>
                
                <p style={{ color: '#047857', fontSize: '14px', margin: 0 }}>
                  Numero verificato: {profile.phone || 'Non disponibile'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Torna alla Dashboard
                </button>
                
                <button
                  onClick={handleEnable2FA}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#f59e0b',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cambia Numero
                </button>
              </div>
            </div>
          ) : (
            // Stato non abilitato
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>
                  🛡️ Perché abilitare il 2FA?
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    'Protegge da accessi non autorizzati al tuo account',
                    'Sicurezza extra per vendite e acquisti su BIDLi',
                    'Richiesto per operazioni di pagamento sensibili',
                    'Conformità alle normative di sicurezza europee'
                  ].map((benefit, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: '#10b981',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '14px', color: '#374151' }}>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSkip}
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    background: 'white',
                    color: '#374151',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salta per Ora
                </button>
                
                <button
                  onClick={handleEnable2FA}
                  style={{
                    flex: 2,
                    padding: '16px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🚀 Abilita 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TwoFactorAuth
          user={user}
          onSuccess={handleSetupComplete}
          onCancel={() => setShowModal(false)}
        />
      )}
      
      <Footer />
    </div>
  );
}
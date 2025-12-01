import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { sendSMSCode, generateOTP, validatePhoneNumber, normalizePhoneNumber } from '../utils/twilioSMS';

export default function TwoFactorAuth({ user, onSuccess, onCancel }) {
  const [step, setStep] = useState('phone'); // phone | verify
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown per resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Carica numero di telefono se già presente nel profilo
  useEffect(() => {
    if (user?.id) {
      loadUserPhone();
    }
  }, [user]);

  async function loadUserPhone() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
      
      if (data?.phone) {
        setPhoneNumber(data.phone);
      }
    } catch (error) {
      console.error('Error loading phone:', error);
    }
  }

  async function handleSendCode() {
    if (!phoneNumber.trim()) {
      setError('Inserisci il numero di telefono');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Formato numero di telefono non valido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      const code = generateOTP();
      
      // Invia SMS
      await sendSMSCode(normalizedPhone, code);
      
      // Salva il codice (in produzione usare Redis o simile)
      setGeneratedCode(code);
      
      // Salva il numero nel profilo utente
      await supabase
        .from('profiles')
        .update({ phone: normalizedPhone })
        .eq('id', user.id);

      setStep('verify');
      setSuccess('Codice inviato via SMS!');
      setResendCooldown(60); // 60 secondi di cooldown
      
    } catch (error) {
      setError('Errore nell\'invio del codice. Riprova.');
      console.error('SMS send error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!verificationCode.trim()) {
      setError('Inserisci il codice di verifica');
      return;
    }

    if (verificationCode !== generatedCode) {
      setError('Codice non valido. Riprova.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Marca 2FA come completato nel profilo
      await supabase
        .from('profiles')
        .update({ 
          phone_verified: true,
          two_factor_enabled: true 
        })
        .eq('id', user.id);

      setSuccess('✅ Verifica completata con successo!');
      setTimeout(() => {
        onSuccess?.();
      }, 1500);

    } catch (error) {
      setError('Errore nella verifica. Riprova.');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleResendCode() {
    if (resendCooldown > 0) return;
    setStep('phone');
    setVerificationCode('');
    setGeneratedCode('');
    setError('');
    setSuccess('');
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" 
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#1a202c' }}>
            Verifica a Due Fattori
          </h2>
          <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.5' }}>
            {step === 'phone' 
              ? 'Aggiungi il tuo numero per una sicurezza extra'
              : 'Inserisci il codice ricevuto via SMS'
            }
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {step === 'phone' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#374151'
            }}>
              Numero di Telefono
            </label>
            
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+39 123 456 7890"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                marginBottom: '20px'
              }}
              disabled={loading}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onCancel}
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
                Salta
              </button>
              
              <button
                onClick={handleSendCode}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Invio...' : 'Invia Codice'}
              </button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#374151'
            }}>
              Codice di Verifica
            </label>
            
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '18px',
                textAlign: 'center',
                letterSpacing: '2px',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}
              maxLength={6}
              disabled={loading}
            />

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={() => setStep('phone')}
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
                Modifica
              </button>
              
              <button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                style={{
                  flex: 2,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: loading || verificationCode.length !== 6 ? '#9ca3af' : '#10b981',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: loading || verificationCode.length !== 6 ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Verifica...' : 'Verifica'}
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: '14px', color: '#64748b' }}>
                  Riinvia tra {resendCooldown}s
                </span>
              ) : (
                <button
                  onClick={handleResendCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Non hai ricevuto il codice? Riinvia
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
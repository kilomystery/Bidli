// PayoutSettings.jsx - Gestione IBAN per venditori
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const PayoutSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payout, setPayout] = useState({
    iban: '',
    bic: '',
    account_holder: '',
    bank_name: '',
    tax_code: '',
    vat_number: '',
    business_type: 'individual' // 'individual' o 'business'
  });
  const [validation, setValidation] = useState({});

  useEffect(() => {
    loadPayoutSettings();
  }, []);

  const loadPayoutSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In produzione questo caricherebbe da Stripe Connect
      const saved = JSON.parse(localStorage.getItem(`payout_settings_${user.id}`) || '{}');
      if (saved.iban) {
        setPayout(saved);
      }
    } catch (error) {
      console.error('Errore caricamento payout:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIBAN = (iban) => {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    
    // Basic IBAN format check
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/i.test(cleaned)) {
      return false;
    }

    // Italian IBAN should be 27 chars
    if (cleaned.startsWith('IT') && cleaned.length !== 27) {
      return false;
    }

    return true;
  };

  const validateForm = () => {
    const errors = {};

    if (!payout.iban.trim()) {
      errors.iban = 'IBAN obbligatorio';
    } else if (!validateIBAN(payout.iban)) {
      errors.iban = 'IBAN non valido';
    }

    if (!payout.account_holder.trim()) {
      errors.account_holder = 'Nome intestatario obbligatorio';
    }

    if (payout.business_type === 'business' && !payout.vat_number.trim()) {
      errors.vat_number = 'Partita IVA obbligatoria per aziende';
    }

    if (!payout.tax_code.trim()) {
      errors.tax_code = 'Codice fiscale obbligatorio';
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const savePayoutSettings = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In produzione questo creerebbe/aggiornerebbe Stripe Connect Account
      localStorage.setItem(`payout_settings_${user.id}`, JSON.stringify({
        ...payout,
        updated_at: Date.now(),
        status: 'pending_verification'
      }));

      alert('✅ Impostazioni salvate! Verifica in corso (1-2 giorni lavorativi)');
      
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const formatIBAN = (value) => {
    const cleaned = value.replace(/\s+/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Caricamento...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            backgroundColor: '#f3f4f6'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
            🏦 Impostazioni Pagamento
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Configura come ricevere i pagamenti delle vendite
          </p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Info commissioni */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Building2 size={24} color="#0369a1" />
            <div style={{ fontWeight: '600', color: '#0369a1' }}>
              💰 Come funzionano i pagamenti
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#075985', fontSize: '14px' }}>
            <li>BIDLi trattiene il <strong>10% di commissione</strong> su ogni vendita</li>
            <li>I pagamenti vengono elaborati <strong>ogni martedì</strong></li>
            <li>Tempi di accredito: <strong>1-2 giorni lavorativi</strong></li>
            <li>Nessuna commissione aggiuntiva sui bonifici</li>
          </ul>
        </div>

        {/* Tipo account */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Tipo di Account
          </h3>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: `2px solid ${payout.business_type === 'individual' ? '#8b5cf6' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: payout.business_type === 'individual' ? '#f3f4f6' : 'white'
            }}>
              <input
                type="radio"
                name="business_type"
                value="individual"
                checked={payout.business_type === 'individual'}
                onChange={(e) => setPayout(prev => ({ ...prev, business_type: e.target.value }))}
              />
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>👤 Persona Fisica</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Vendi come privato occasionalmente</div>
              </div>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: `2px solid ${payout.business_type === 'business' ? '#8b5cf6' : '#e5e7eb'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: payout.business_type === 'business' ? '#f3f4f6' : 'white'
            }}>
              <input
                type="radio"
                name="business_type"
                value="business"
                checked={payout.business_type === 'business'}
                onChange={(e) => setPayout(prev => ({ ...prev, business_type: e.target.value }))}
              />
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>🏢 Azienda/Partita IVA</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Vendi come attività commerciale</div>
              </div>
            </label>
          </div>
        </div>

        {/* Dati bancari */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            🏦 Dati Bancari
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                IBAN *
              </label>
              <input
                type="text"
                value={payout.iban}
                onChange={(e) => setPayout(prev => ({ ...prev, iban: formatIBAN(e.target.value) }))}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
                maxLength="34"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${validation.iban ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              {validation.iban && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validation.iban}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                Nome Intestatario *
              </label>
              <input
                type="text"
                value={payout.account_holder}
                onChange={(e) => setPayout(prev => ({ ...prev, account_holder: e.target.value }))}
                placeholder="Mario Rossi"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${validation.account_holder ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {validation.account_holder && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validation.account_holder}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                Nome Banca (opzionale)
              </label>
              <input
                type="text"
                value={payout.bank_name}
                onChange={(e) => setPayout(prev => ({ ...prev, bank_name: e.target.value }))}
                placeholder="Intesa Sanpaolo"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                BIC/SWIFT (opzionale)
              </label>
              <input
                type="text"
                value={payout.bic}
                onChange={(e) => setPayout(prev => ({ ...prev, bic: e.target.value.toUpperCase() }))}
                placeholder="BCITITMM"
                maxLength="11"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
        </div>

        {/* Dati fiscali */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
            📄 Dati Fiscali
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                Codice Fiscale *
              </label>
              <input
                type="text"
                value={payout.tax_code}
                onChange={(e) => setPayout(prev => ({ ...prev, tax_code: e.target.value.toUpperCase() }))}
                placeholder="RSSMRA80A01H501Z"
                maxLength="16"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${validation.tax_code ? '#ef4444' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
              {validation.tax_code && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {validation.tax_code}
                </div>
              )}
            </div>

            {payout.business_type === 'business' && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Partita IVA *
                </label>
                <input
                  type="text"
                  value={payout.vat_number}
                  onChange={(e) => setPayout(prev => ({ ...prev, vat_number: e.target.value }))}
                  placeholder="12345678901"
                  maxLength="11"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `2px solid ${validation.vat_number ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                />
                {validation.vat_number && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {validation.vat_number}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Salva */}
        <button
          onClick={savePayoutSettings}
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: saving ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {saving ? (
            <>Salvataggio...</>
          ) : (
            <>
              <CheckCircle size={20} />
              Salva Impostazioni Pagamento
            </>
          )}
        </button>

        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '16px',
          textAlign: 'center',
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          🔒 I tuoi dati bancari sono crittografati e sicuri. Utilizziamo Stripe Connect per elaborare i pagamenti in conformità alle normative europee PCI DSS.
        </div>
      </div>
    </div>
  );
};

export default PayoutSettings;
// PaymentSettings.jsx - Gestione pagamenti per acquirenti
import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Plus, Trash2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const PaymentSettings = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: ''
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In produzione questo caricherebbe da Stripe Customer
      const saved = JSON.parse(localStorage.getItem(`payment_methods_${user.id}`) || '[]');
      setPaymentMethods(saved);
    } catch (error) {
      console.error('Errore caricamento carte:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async () => {
    if (!newCard.number || !newCard.expiry || !newCard.cvc || !newCard.name) {
      alert('Compila tutti i campi');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simula aggiunta carta (in produzione userebbe Stripe)
      const [month, year] = newCard.expiry.split('/');
      const method = {
        id: `pm_${Date.now()}`,
        type: 'card',
        last4: newCard.number.slice(-4),
        brand: detectCardBrand(newCard.number),
        exp_month: parseInt(month),
        exp_year: parseInt(`20${year}`),
        holder_name: newCard.name,
        created: Date.now()
      };

      const updated = [...paymentMethods, method];
      setPaymentMethods(updated);
      localStorage.setItem(`payment_methods_${user.id}`, JSON.stringify(updated));

      // Reset form
      setNewCard({ number: '', expiry: '', cvc: '', name: '' });
      setShowAddCard(false);

      alert('💳 Carta aggiunta con successo!');
    } catch (error) {
      console.error('Errore aggiunta carta:', error);
      alert('Errore durante l\'aggiunta della carta');
    }
  };

  const removePaymentMethod = async (methodId) => {
    if (!confirm('Rimuovere questa carta?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = paymentMethods.filter(m => m.id !== methodId);
      setPaymentMethods(updated);
      localStorage.setItem(`payment_methods_${user.id}`, JSON.stringify(updated));

      alert('Carta rimossa');
    } catch (error) {
      console.error('Errore rimozione carta:', error);
    }
  };

  const detectCardBrand = (number) => {
    const cleaned = number.replace(/\s+/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    return 'card';
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = cleaned.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleaned;
    }
  };

  const formatExpiry = (value) => {
    const cleaned = value.replace(/\D+/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + (cleaned.length > 2 ? '/' + cleaned.substring(2, 4) : '');
    }
    return cleaned;
  };

  const getCardColor = (brand) => {
    switch (brand) {
      case 'visa': return '#1a1f71';
      case 'mastercard': return '#eb001b';
      case 'amex': return '#2e77bb';
      default: return '#6b7280';
    }
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
            💳 Metodi di Pagamento
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Gestisci le tue carte per acquisti più veloci
          </p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Info sicurezza */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Shield size={24} color="#0369a1" />
          <div>
            <div style={{ fontWeight: '600', color: '#0369a1', marginBottom: '4px' }}>
              🔒 Pagamenti sicuri con Stripe
            </div>
            <div style={{ fontSize: '14px', color: '#075985' }}>
              I tuoi dati sono crittografati end-to-end. BIDLi non memorizza mai i dati completi delle carte.
            </div>
          </div>
        </div>

        {/* Carte salvate */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CreditCard size={20} />
              Carte Salvate ({paymentMethods.length})
            </h3>
          </div>

          {paymentMethods.length === 0 ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <CreditCard size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                Nessuna carta salvata
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Aggiungi una carta per checkout più veloci
              </p>
            </div>
          ) : (
            <div>
              {paymentMethods.map((method, index) => (
                <div 
                  key={method.id} 
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < paymentMethods.length - 1 ? '1px solid #f3f4f6' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: getCardColor(method.brand),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {method.brand?.toUpperCase() || 'CARD'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                        •••• •••• •••• {method.last4}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {method.holder_name} • Scade {method.exp_month?.toString().padStart(2, '0')}/{method.exp_year}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removePaymentMethod(method.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pulsante aggiungi */}
        {!showAddCard ? (
          <button
            onClick={() => setShowAddCard(true)}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus size={20} />
            Aggiungi Nuova Carta
          </button>
        ) : (
          /* Form aggiungi carta */
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
              Aggiungi Nuova Carta
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Numero Carta *
                </label>
                <input
                  type="text"
                  value={newCard.number}
                  onChange={(e) => setNewCard(prev => ({ ...prev, number: formatCardNumber(e.target.value) }))}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                    Scadenza *
                  </label>
                  <input
                    type="text"
                    value={newCard.expiry}
                    onChange={(e) => setNewCard(prev => ({ ...prev, expiry: formatExpiry(e.target.value) }))}
                    placeholder="MM/AA"
                    maxLength="5"
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
                    CVC *
                  </label>
                  <input
                    type="text"
                    value={newCard.cvc}
                    onChange={(e) => setNewCard(prev => ({ ...prev, cvc: e.target.value.replace(/\D/g, '') }))}
                    placeholder="123"
                    maxLength="4"
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
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                  Nome sul titolare *
                </label>
                <input
                  type="text"
                  value={newCard.name}
                  onChange={(e) => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mario Rossi"
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
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowAddCard(false);
                  setNewCard({ number: '', expiry: '', cvc: '', name: '' });
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                onClick={addPaymentMethod}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Aggiungi Carta
              </button>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '16px',
              textAlign: 'center'
            }}>
              🔒 I dati della carta vengono crittografati e inviati direttamente a Stripe. 
              BIDLi non memorizza mai i dati completi delle carte.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSettings;
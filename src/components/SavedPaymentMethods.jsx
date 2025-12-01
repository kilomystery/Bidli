import React, { useState, useEffect } from 'react';
import { CreditCard, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SavedPaymentMethods = ({ onMethodSelect, selectedMethodId }) => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In produzione questo caricherebbe da Stripe Customer
      // Per ora simuliamo con dati locali
      const savedMethods = JSON.parse(localStorage.getItem(`payment_methods_${user.id}`) || '[]');
      setMethods(savedMethods);
    } catch (error) {
      console.error('Errore caricamento metodi pagamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNewMethod = async (methodData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newMethod = {
        id: `pm_${Date.now()}`,
        type: 'card',
        last4: methodData.last4,
        brand: methodData.brand,
        exp_month: methodData.exp_month,
        exp_year: methodData.exp_year,
        created: Date.now()
      };

      const updated = [...methods, newMethod];
      setMethods(updated);
      localStorage.setItem(`payment_methods_${user.id}`, JSON.stringify(updated));
      
      return newMethod;
    } catch (error) {
      console.error('Errore salvataggio metodo:', error);
      throw error;
    }
  };

  const removeMethod = async (methodId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updated = methods.filter(m => m.id !== methodId);
      setMethods(updated);
      localStorage.setItem(`payment_methods_${user.id}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Errore rimozione metodo:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        color: '#6b7280' 
      }}>
        Caricamento metodi di pagamento...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '12px'
      }}>
        💳 Metodi di pagamento salvati
      </label>

      {methods.length === 0 ? (
        <div style={{
          border: '2px dashed #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
            Nessun metodo di pagamento salvato
          </p>
          <p style={{ margin: 0, fontSize: '12px' }}>
            Il primo acquisto salverà automaticamente la tua carta
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {methods.map((method) => {
            const isSelected = selectedMethodId === method.id;
            return (
              <div
                key={method.id}
                onClick={() => onMethodSelect?.(method)}
                style={{
                  border: `2px solid ${isSelected ? '#8b5cf6' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f3f4f6' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: getCardColor(method.brand),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {method.brand?.toUpperCase() || 'CARD'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      •••• •••• •••• {method.last4}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Scade {method.exp_month?.toString().padStart(2, '0')}/{method.exp_year}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMethod(method.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          <div style={{
            border: '2px dashed #8b5cf6',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#8b5cf6',
            fontSize: '14px',
            fontWeight: '600',
            gap: '8px'
          }}>
            <Plus size={16} />
            Aggiungi nuovo metodo
          </div>
        </div>
      )}

      {methods.length > 0 && (
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px'
        }}>
          🔒 I tuoi dati di pagamento sono crittografati e sicuri. BIDLi non memorizza mai i dati completi della carta.
        </div>
      )}
    </div>
  );
};

const getCardColor = (brand) => {
  switch (brand?.toLowerCase()) {
    case 'visa': return '#1a1f71';
    case 'mastercard': return '#eb001b';
    case 'amex': return '#2e77bb';
    case 'discover': return '#ff6000';
    default: return '#6b7280';
  }
};

export default SavedPaymentMethods;
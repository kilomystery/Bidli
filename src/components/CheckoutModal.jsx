import React, { useState, useEffect } from 'react';
import { X, CreditCard, Truck, Shield, Loader2 } from 'lucide-react';
import { STRIPE_CONFIG, calculateFees, formatPrice } from '../config/stripe';
import SavedPaymentMethods from './SavedPaymentMethods';

const CheckoutModal = ({ 
  isOpen, 
  onClose, 
  product, 
  lot,
  amount,
  isWinner = false, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [savedMethod, setSavedMethod] = useState(null);
  const [useAutoCheckout, setUseAutoCheckout] = useState(false);

  // Calcola i dettagli del prezzo
  const finalAmount = amount || product?.price || lot?.final_price || 0;
  const fees = calculateFees(finalAmount, true); // Include spedizione
  
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleCheckout = async () => {
    if (!finalAmount || finalAmount < STRIPE_CONFIG.products.min_price) {
      setError('Importo non valido per il pagamento');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Checkout automatico se usa metodo salvato
      if (useAutoCheckout && savedMethod) {
        console.log('⚡ Checkout automatico con carta salvata:', savedMethod);
        alert(`⚡ CHECKOUT AUTOMATICO\n\nCarta: ${savedMethod.brand?.toUpperCase()} ••••${savedMethod.last4}\nImporto: €${fees.buyerPays}\n\n✅ Pagamento completato automaticamente!`);
        onSuccess?.();
        return;
      }

      // Simulazione checkout per demo (in produzione sarebbe un'API reale)
      console.log('🛒 Avvio checkout demo per:', { finalAmount, product, lot });
      
      // Simula redirect a Stripe (in demo mostriamo solo il messaggio)
      alert(`💳 DEMO CHECKOUT\n\nImporto: €${fees.buyerPays}\nProdotto: ${product?.title || 'N/A'}\nSpedizione: €${fees.shippingCost}\n\nIn produzione questo aprirebbe Stripe Checkout!`);
      
      onSuccess?.();
      return;
      
      /* 
      // Codice reale per produzione:
      const API_BASE = window.location.origin.replace(':5000', ':3001');
      const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          product_id: product?.id,
          lot_id: lot?.id,
          payment_method_types: [paymentMethod],
          success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/payment/cancel`,
        }),
      });

      if (!response.ok) {
        throw new Error('Errore nella creazione del checkout');
      }

      const { checkout_url } = await response.json();
      
      // Reindirizza a Stripe Checkout
      window.location.href = checkout_url;
      */
      
    } catch (err) {
      console.error('Errore checkout:', err);
      setError('Errore nel processare il pagamento. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 24px 16px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            {isWinner ? '🎉 Complimenti! Hai vinto!' : '💳 Procedi al pagamento'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Product Info */}
        <div style={{ padding: '16px 24px' }}>
          {product && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '6px',
                    objectFit: 'cover'
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  {product.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  {product.description?.slice(0, 60)}...
                </p>
              </div>
            </div>
          )}

          {/* Metodi di pagamento salvati */}
          <SavedPaymentMethods 
            onMethodSelect={(method) => {
              setSavedMethod(method);
              setUseAutoCheckout(true);
            }}
            selectedMethodId={savedMethod?.id}
          />

          {/* Checkbox checkout automatico */}
          {savedMethod && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <input
                type="checkbox"
                id="auto-checkout"
                checked={useAutoCheckout}
                onChange={(e) => setUseAutoCheckout(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <label 
                htmlFor="auto-checkout" 
                style={{ 
                  fontSize: '14px', 
                  color: '#0369a1',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ⚡ Checkout automatico con {savedMethod.brand?.toUpperCase()} ••••{savedMethod.last4}
              </label>
            </div>
          )}

          {/* Metodi di pagamento tradizionali */}
          {!useAutoCheckout && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Metodo di pagamento
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {['card', 'sepa_debit', 'ideal'].map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        padding: '8px 12px',
                        border: `2px solid ${isSelected ? '#8b5cf6' : '#e2e8f0'}`,
                        backgroundColor: isSelected ? '#f3f4f6' : 'white',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {method === 'card' && '💳 Carta'}
                      {method === 'sepa_debit' && '🏛️ SEPA'}
                      {method === 'ideal' && '🇳🇱 iDEAL'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Riepilogo costi */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h4 style={{
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1e293b'
            }}>
              Riepilogo costi
            </h4>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Prezzo articolo
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatPrice(fees.itemPrice)}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                Commissione pagamento ({STRIPE_CONFIG.products.success_fee * 100}%)
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatPrice(fees.stripeFee)}
              </span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                🚚 Spedizione
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {formatPrice(fees.shippingCost)}
              </span>
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              💡 Il venditore riceve {formatPrice(fees.sellerReceives)} (dopo 10% commissione BIDLi)
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                Totale
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#8b5cf6'
              }}>
                {formatPrice(fees.buyerPays)}
              </span>
            </div>
          </div>

          {/* Garanzie */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={16} />
              <span>Pagamento sicuro</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Truck size={16} />
              <span>Spedizione tracciata</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={16} />
              <span>Protezione acquirente</span>
            </div>
          </div>

          {/* Errore */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#dc2626'
              }}>
                ❌ {error}
              </p>
            </div>
          )}

          {/* Pulsante pagamento */}
          <button
            onClick={handleCheckout}
            disabled={loading || !finalAmount}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: loading ? '#9ca3af' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <CreditCard size={20} />
                Paga {formatPrice(fees.buyerPays)}
              </>
            )}
          </button>
          
          <p style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center'
          }}>
            Cliccando "Paga" accetti i nostri Termini di Servizio e confermi che hai letto la nostra Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
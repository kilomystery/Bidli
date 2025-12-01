import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function StartLiveModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [liveData, setLiveData] = useState({
    title: '',
    description: '',
    category: 'general',
    scheduled_for: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setStep(1);
      setSelectedProducts([]);
      setLiveData({
        title: '',
        description: '',
        category: 'general',
        scheduled_for: ''
      });
    }
  }, [isOpen]);

  async function loadProducts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  async function createLiveSession() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Crea sessione live
      const { data: session, error: sessionError } = await supabase
        .from('live_sessions')
        .insert({
          seller_id: user.id,
          title: liveData.title || 'Live Auction',
          description: liveData.description,
          category: liveData.category,
          status: 'scheduled',
          scheduled_for: liveData.scheduled_for || new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Associa prodotti selezionati alla sessione
      if (selectedProducts.length > 0) {
        const auctionProducts = selectedProducts.map(productId => ({
          live_session_id: session.id,
          product_id: productId,
          status: 'pending'
        }));

        await supabase
          .from('auction_products')
          .insert(auctionProducts);
      }

      onSuccess(session);
      onClose();

    } catch (error) {
      console.error('Error creating live session:', error);
      alert('Errore nella creazione del live: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(productId) {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  const categories = [
    { value: 'general', label: '🎭 Generale' },
    { value: 'fashion', label: '👗 Fashion' },
    { value: 'sneakers', label: '👟 Sneakers' },
    { value: 'electronics', label: '📱 Elettronica' },
    { value: 'collectibles', label: '🎯 Collezionismo' },
    { value: 'home', label: '🏠 Casa & Design' }
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            🎥 Avvia Live Session
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', marginBottom: '32px' }}>
          {[1, 2, 3].map(stepNum => (
            <div key={stepNum} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: step >= stepNum ? '#3b82f6' : '#e5e7eb',
                color: step >= stepNum ? 'white' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700
              }}>
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: step > stepNum ? '#3b82f6' : '#e5e7eb',
                  margin: '0 8px'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Live Info */}
        {step === 1 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
              📋 Informazioni Live
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                Titolo Live *
              </label>
              <input
                type="text"
                value={liveData.title}
                onChange={(e) => setLiveData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Es. Asta Vintage Sneakers Collection"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                Descrizione
              </label>
              <textarea
                value={liveData.description}
                onChange={(e) => setLiveData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrivi cosa venderai in questa live session..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                Categoria
              </label>
              <select
                value={liveData.category}
                onChange={(e) => setLiveData(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px'
                }}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                Programma per (opzionale)
              </label>
              <input
                type="datetime-local"
                value={liveData.scheduled_for ? new Date(liveData.scheduled_for).toISOString().slice(0, 16) : ''}
                onChange={(e) => setLiveData(prev => ({ 
                  ...prev, 
                  scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : ''
                }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px'
                }}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Lascia vuoto per iniziare immediatamente
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!liveData.title.trim()}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: liveData.title.trim() ? '#3b82f6' : '#e5e7eb',
                color: liveData.title.trim() ? 'white' : '#9ca3af',
                fontSize: '16px',
                fontWeight: 700,
                cursor: liveData.title.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Continua →
            </button>
          </div>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
              📦 Seleziona Prodotti per l'Asta
            </h3>
            
            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
              Scegli i prodotti che vuoi mettere all'asta durante il live. Potrai gestire l'ordine nel dashboard.
            </p>

            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px'
            }}>
              {products.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {products.map(product => (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        border: selectedProducts.includes(product.id) ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedProducts.includes(product.id) ? '#f0f9ff' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      
                      <img
                        src={product.images?.[0] || '/placeholder-product.jpg'}
                        alt={product.title}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '6px',
                          objectFit: 'cover'
                        }}
                      />
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
                          {product.title}
                        </h4>
                        <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '12px' }}>
                          €{product.price} • {product.condition}
                        </p>
                        <p style={{ margin: 0, color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                          {product.status === 'active' ? '✅ Disponibile' : '⏳ In attesa'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Nessun prodotto disponibile</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                    Aggiungi prodotti al tuo negozio per includerli nelle live aste
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← Indietro
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Continua → ({selectedProducts.length} prodotti)
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Start */}
        {step === 3 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
              🚀 Conferma e Avvia
            </h3>
            
            {/* Summary */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
                📋 Riepilogo Live Session
              </h4>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Titolo: </span>
                  <span style={{ color: '#64748b' }}>{liveData.title}</span>
                </div>
                
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Categoria: </span>
                  <span style={{ color: '#64748b' }}>
                    {categories.find(c => c.value === liveData.category)?.label}
                  </span>
                </div>
                
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Prodotti: </span>
                  <span style={{ color: '#64748b' }}>
                    {selectedProducts.length} prodotti selezionati
                  </span>
                </div>
                
                <div>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Avvio: </span>
                  <span style={{ color: '#64748b' }}>
                    {liveData.scheduled_for ? 
                      new Date(liveData.scheduled_for).toLocaleString('it-IT') : 
                      'Immediato'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '14px', fontWeight: 600 }}>
                ⚠️ Prima di iniziare
              </h5>
              <ul style={{ margin: 0, color: '#92400e', fontSize: '12px', paddingLeft: '16px' }}>
                <li>Assicurati di avere una connessione internet stabile</li>
                <li>Verifica che camera e microfono funzionino correttamente</li>
                <li>Prepara una buona illuminazione per mostrare i prodotti</li>
                <li>Una volta avviato, potrai gestire tutto dal dashboard live</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                ← Indietro
              </button>
              <button
                onClick={createLiveSession}
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Creazione...
                  </>
                ) : (
                  <>
                    🔴 Crea Live Session
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
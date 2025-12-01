// SellerShipping.jsx - Gestione spedizioni per venditori
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Package, Truck, Clock, CheckCircle, Info, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const SellerShipping = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    shipped: 0,
    delivered: 0
  });

  useEffect(() => {
    loadShippingData();
  }, []);

  const loadShippingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simula ordini da evadere (in produzione verrebbero dal database)
      const mockOrders = [
        {
          id: 'ORD-2025-001',
          buyer_name: 'Marco Rossi',
          item_title: 'Sneakers Nike Air Jordan 1',
          final_price: 89.90,
          shipping_address: {
            name: 'Marco Rossi',
            street: 'Via Roma 123',
            city: 'Milano',
            postal_code: '20121',
            country: 'IT'
          },
          status: 'pending_shipment',
          created_at: '2025-01-03T10:30:00Z',
          payment_status: 'completed'
        },
        {
          id: 'ORD-2025-002',
          buyer_name: 'Sara Bianchi',
          item_title: 'Borsa Vintage Gucci',
          final_price: 245.00,
          shipping_address: {
            name: 'Sara Bianchi',
            street: 'Corso Venezia 45',
            city: 'Milano',
            postal_code: '20122',
            country: 'IT'
          },
          status: 'shipped',
          tracking_number: 'INP123456789IT',
          shipped_at: '2025-01-02T14:20:00Z',
          created_at: '2025-01-01T16:45:00Z'
        }
      ];

      setOrders(mockOrders);
      
      // Calcola statistiche
      const pending = mockOrders.filter(o => o.status === 'pending_shipment').length;
      const shipped = mockOrders.filter(o => o.status === 'shipped').length;
      const delivered = mockOrders.filter(o => o.status === 'delivered').length;
      
      setStats({ pending, shipped, delivered });
      
    } catch (error) {
      console.error('Errore caricamento spedizioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateShippingLabel = async (orderId) => {
    try {
      // In produzione questo chiamerebbe l'API InPost per generare l'etichetta
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedOrders = orders.map(o => 
        o.id === orderId 
          ? { 
              ...o, 
              status: 'shipped', 
              tracking_number: `INP${Date.now()}IT`,
              shipped_at: new Date().toISOString()
            }
          : o
      );
      
      setOrders(updatedOrders);
      alert(`📦 Etichetta generata! Tracking: INP${Date.now()}IT`);
      
    } catch (error) {
      console.error('Errore generazione etichetta:', error);
      alert('Errore durante la generazione dell\'etichetta');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento spedizioni...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: '0 16px' }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <button 
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <ArrowLeft size={24} color="#64748b" />
            </button>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 24, 
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}>
                Gestione Spedizioni
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                color: '#64748b'
              }}>
                Sistema automatico BIDLi + InPost
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: '#fef3c7',
              padding: '12px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>Da spedire</div>
            </div>
            <div style={{
              backgroundColor: '#dbeafe',
              padding: '12px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                {stats.shipped}
              </div>
              <div style={{ fontSize: 12, color: '#1d4ed8' }}>Spediti</div>
            </div>
            <div style={{
              backgroundColor: '#d1fae5',
              padding: '12px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
                {stats.delivered}
              </div>
              <div style={{ fontSize: 12, color: '#047857' }}>Consegnati</div>
            </div>
          </div>
        </div>

        {/* Come Funziona */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Info size={24} color="#3b82f6" style={{ marginRight: 12 }} />
            <h2 style={{ 
              margin: 0, 
              fontSize: 20, 
              fontWeight: 700,
              color: '#1e293b'
            }}>
              Come Funzionano le Spedizioni
            </h2>
          </div>

          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px',
            borderRadius: 12,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  marginRight: 16,
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Vendita Conclusa
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    Quando un acquirente vince l'asta o compra subito, ricevi una notifica con i dettagli dell'ordine.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  marginRight: 16,
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Genera Etichetta Automatica
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    Clicca "Genera Etichetta" e il sistema crea automaticamente l'etichetta InPost con indirizzo acquirente.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  marginRight: 16,
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Consegna al Locker InPost
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    Porta il pacco al locker InPost più vicino. <strong>Costo spedizione €5,90 pagato dall'acquirente.</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  marginRight: 16,
                  flexShrink: 0
                }}>
                  4
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                    Tracking Automatico
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>
                    L'acquirente riceve il codice tracking e può seguire la spedizione. Tu ricevi il pagamento al delivery.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ordini da Evadere */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: 24
        }}>
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#f8fafc'
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 18, 
              fontWeight: 700,
              color: '#374151'
            }}>
              Ordini da Spedire
            </h3>
          </div>

          {orders.length === 0 ? (
            <div style={{
              padding: '40px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Package size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Nessun ordine da spedire
              </div>
              <div style={{ fontSize: 14 }}>
                Quando vendi un oggetto, apparirà qui per la gestione spedizione.
              </div>
            </div>
          ) : (
            <div>
              {orders.map((order) => (
                <div key={order.id} style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 16
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 8
                      }}>
                        <span style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#1e293b',
                          marginRight: 12
                        }}>
                          {order.id}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: order.status === 'pending_shipment' ? '#fef3c7' : '#dbeafe',
                          color: order.status === 'pending_shipment' ? '#92400e' : '#1d4ed8'
                        }}>
                          {order.status === 'pending_shipment' ? 'Da spedire' : 'Spedito'}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: '#64748b',
                        marginBottom: 4
                      }}>
                        <strong>{order.item_title}</strong> → {order.buyer_name}
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: '#64748b',
                        marginBottom: 8
                      }}>
                        {formatPrice(order.final_price)} • {formatDate(order.created_at)}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 13,
                        color: '#64748b'
                      }}>
                        <MapPin size={14} style={{ marginRight: 6 }} />
                        {order.shipping_address.street}, {order.shipping_address.city} {order.shipping_address.postal_code}
                      </div>
                    </div>
                    
                    <div style={{ marginLeft: 16 }}>
                      {order.status === 'pending_shipment' ? (
                        <button
                          onClick={() => generateShippingLabel(order.id)}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <Truck size={16} />
                          Genera Etichetta
                        </button>
                      ) : (
                        <div style={{
                          padding: '10px 16px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          textAlign: 'center'
                        }}>
                          <div style={{
                            fontSize: 12,
                            color: '#64748b',
                            marginBottom: 4
                          }}>
                            Tracking
                          </div>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#3b82f6'
                          }}>
                            {order.tracking_number}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {order.status === 'shipped' && (
                    <div style={{
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: 8,
                      border: '1px solid #bae6fd'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 13,
                        color: '#0369a1'
                      }}>
                        <CheckCircle size={16} style={{ marginRight: 8 }} />
                        Spedito il {formatDate(order.shipped_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerShipping;
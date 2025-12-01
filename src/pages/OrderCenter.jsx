import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Package, Truck, Clock, CheckCircle, Info, MapPin, Calendar, Eye } from 'lucide-react';

export default function OrderCenter() {
  const [lives, setLives] = useState([]);
  const [selectedLive, setSelectedLive] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEndedLives();
  }, []);

  async function loadEndedLives() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        navigate("/auth");
        return;
      }

      // Carica live terminate del venditore
      const { data: livesData } = await supabase
        .from("lives")
        .select(`
          id, title, status, created_at,
          analytics:live_analytics(total_revenue, total_orders, total_items_sold, total_customers)
        `)
        .eq("seller_id", session.session.user.id)
        .eq("status", "ended")
        .order("created_at", { ascending: false });

      setLives(livesData || []);
      
    } catch (e) {
      console.error("Errore caricamento live:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrdersForLive(liveId) {
    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, total_amount, status, created_at, shipping_status, tracking_number,
          buyer:buyer_id ( display_name, email, phone ),
          items:order_lots ( 
            lot:lot_id ( title, current_price, image_url )
          )
        `)
        .eq("live_id", liveId)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
      
    } catch (e) {
      console.error("Errore caricamento ordini:", e);
    }
  }

  async function updateShippingStatus(orderId, status, trackingNumber = null) {
    try {
      const updates = { shipping_status: status };
      if (trackingNumber) updates.tracking_number = trackingNumber;
      
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
      
      // Ricarica ordini
      await loadOrdersForLive(selectedLive.id);
      
      alert(`Stato spedizione aggiornato: ${status}`);
      
    } catch (e) {
      alert("Errore aggiornamento: " + e.message);
    }
  }

  async function generateShippingLabel(order) {
    try {
      // Simulazione generazione etichetta InPost
      const trackingNumber = `INP${Date.now()}IT`;
      
      await updateShippingStatus(order.id, "shipped", trackingNumber);
      
      // Simula generazione etichetta
      alert(`🏷️ Etichetta InPost generata!\n\n📦 Tracking: ${trackingNumber}\n\n✅ Porta il pacco al locker InPost più vicino.\n💰 Costo €5,90 già pagato dall'acquirente.`);
      
    } catch (e) {
      alert("Errore generazione etichetta: " + e.message);
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      label_generated: '#3b82f6', 
      shipped: '#10b981',
      delivered: '#059669'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Da spedire',
      label_generated: 'Etichetta pronta',
      shipped: 'Spedito',
      delivered: 'Consegnato'
    };
    return texts[status] || status;
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
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

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div>Caricamento centro ordini...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h1 style={{ 
              margin: '0 0 30px 0', 
              fontSize: '32px', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center'
            }}>
              🏢 Centro Gestionale Ordini & Spedizioni
            </h1>

            {/* Spiegazione Sistema Automatico */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <Info size={24} color="#3b82f6" style={{ marginRight: 12 }} />
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1e293b'
                }}>
                  Sistema Spedizioni Automatico BIDLi + InPost
                </h3>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    marginRight: 12,
                    flexShrink: 0
                  }}>
                    1
                  </div>
                  <div>
                    <strong>Vendita conclusa</strong><br/>
                    <span style={{ color: '#64748b' }}>Ricevi notifica ordine</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    marginRight: 12,
                    flexShrink: 0
                  }}>
                    2
                  </div>
                  <div>
                    <strong>Genera etichetta</strong><br/>
                    <span style={{ color: '#64748b' }}>Automatica con indirizzo</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    marginRight: 12,
                    flexShrink: 0
                  }}>
                    3
                  </div>
                  <div>
                    <strong>Locker InPost</strong><br/>
                    <span style={{ color: '#64748b' }}>€5,90 pagati da acquirente</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    marginRight: 12,
                    flexShrink: 0
                  }}>
                    4
                  </div>
                  <div>
                    <strong>Tracking & Pagamento</strong><br/>
                    <span style={{ color: '#64748b' }}>Automatico al delivery</span>
                  </div>
                </div>
              </div>
            </div>

            {!selectedLive ? (
              // Lista Live Terminate
              <div>
                <h2 style={{ marginBottom: '20px', color: '#374151' }}>📋 Live Terminate</h2>
                
                {lives.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    color: '#6b7280',
                    background: '#f9fafb',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>📺</div>
                    <div style={{ fontSize: '18px' }}>Nessuna live terminata trovata</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '20px'
                  }}>
                    {lives.map((live) => (
                      <div key={live.id} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-4px)';
                        e.target.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                      onClick={() => {
                        setSelectedLive(live);
                        loadOrdersForLive(live.id);
                      }}>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {live.title}
                          </h3>
                          <span style={{
                            background: '#10b981',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            TERMINATA
                          </span>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                          fontSize: '14px'
                        }}>
                          <div>
                            <div style={{ color: '#6b7280' }}>💰 Ricavo</div>
                            <div style={{ fontWeight: '600', color: '#059669' }}>
                              €{live.analytics?.[0]?.total_revenue?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280' }}>📦 Ordini</div>
                            <div style={{ fontWeight: '600' }}>
                              {live.analytics?.[0]?.total_orders || 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280' }}>🎯 Prodotti</div>
                            <div style={{ fontWeight: '600' }}>
                              {live.analytics?.[0]?.total_items_sold || 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#6b7280' }}>👥 Clienti</div>
                            <div style={{ fontWeight: '600' }}>
                              {live.analytics?.[0]?.total_customers || 0}
                            </div>
                          </div>
                        </div>

                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: '#f3f4f6',
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#374151',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          📅 {new Date(live.created_at).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Gestione Ordini della Live Selezionata
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '30px'
                }}>
                  <div>
                    <button
                      onClick={() => {
                        setSelectedLive(null);
                        setOrders([]);
                        setSelectedOrder(null);
                      }}
                      style={{
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        marginRight: '16px'
                      }}
                    >
                    </button>
                    <h2 style={{ margin: 0, color: '#374151' }}>
                      📦 Ordini: {selectedLive.title}
                    </h2>
                  </div>
                  
                  <div style={{
                    background: '#f0f9ff',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    color: '#0284c7',
                    fontWeight: '600'
                  }}>
                    {orders.length} ordini totali
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    color: '#6b7280',
                    background: '#f9fafb',
                    borderRadius: '12px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                    <div style={{ fontSize: '18px' }}>Nessun ordine trovato per questa live</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gap: '16px'
                  }}>
                    {orders.map((order) => (
                      <div key={order.id} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        background: 'white'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <div>
                            <h3 style={{ 
                              margin: '0 0 4px 0', 
                              fontSize: '16px',
                              fontWeight: '600'
                            }}>
                              🛍️ Ordine #{order.id.slice(-6)}
                            </h3>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              👤 {order.buyer?.display_name || order.buyer?.email || 'Cliente'}
                            </div>
                            {order.buyer?.email && (
                              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                                📧 {order.buyer.email}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              background: getStatusColor(order.shipping_status),
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '8px'
                            }}>
                              {getStatusText(order.shipping_status || 'pending')}
                            </div>
                            <div style={{
                              fontSize: '18px',
                              fontWeight: '700',
                              color: '#059669'
                            }}>
                              {formatPrice(order.total_amount || 0)}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              {formatDate(order.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Prodotti nell'ordine */}
                        <div style={{
                          background: '#f9fafb',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '16px'
                        }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#374151',
                            marginBottom: '8px'
                          }}>
                            📦 Prodotti ({order.items?.length || 0}):
                          </div>
                          {order.items?.map((item, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '4px 0',
                              fontSize: '13px'
                            }}>
                              <span>{item.lot?.title || 'Prodotto'}</span>
                              <span style={{ fontWeight: '600' }}>
                                €{item.lot?.current_price?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                          )) || (
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Nessun prodotto trovato
                            </div>
                          )}
                        </div>

                        {/* Tracking */}
                        {order.tracking_number && (
                          <div style={{
                            background: '#ecfdf5',
                            border: '1px solid #10b981',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '600', 
                              color: '#059669',
                              marginBottom: '4px'
                            }}>
                              🚛 Tracking: {order.tracking_number}
                            </div>
                          </div>
                        )}

                        {/* Azioni Spedizione */}
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {(!order.shipping_status || order.shipping_status === 'pending') && (
                            <button
                              onClick={() => generateShippingLabel(order)}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <Truck size={16} />
                              Genera Etichetta InPost
                            </button>
                          )}
                          
                          {order.shipping_status === 'shipped' && order.tracking_number && (
                            <div style={{
                              background: '#f0fdf4',
                              border: '1px solid #22c55e',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <CheckCircle size={16} />
                              Spedito - Tracking: {order.tracking_number}
                            </div>
                          )}
                          
                          <button
                            onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                            style={{
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <Eye size={16} />
                              Dettagli
                            </button>
                          
                          {order.shipping_status === 'label_generated' && (
                            <button
                              onClick={() => updateShippingStatus(order.id, 'shipped')}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              📦 Conferma Spedizione
                            </button>
                          )}
                          
                          {order.shipping_status === 'shipped' && (
                            <button
                              onClick={() => updateShippingStatus(order.id, 'delivered')}
                              style={{
                                background: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              ✅ Segna Consegnato
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
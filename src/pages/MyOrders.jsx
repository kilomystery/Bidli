import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMyOrders();
  }, []);

  async function loadMyOrders() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        navigate("/auth");
        return;
      }

      // Carica gli ordini dell'utente
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, total_amount, status, created_at, shipping_status, tracking_number,
          live:live_id ( id, title, seller:seller_id ( display_name ) ),
          items:order_lots ( 
            lot:lot_id ( title, current_price, image_url )
          )
        `)
        .eq("buyer_id", session.session.user.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
      
    } catch (e) {
      console.error("Errore caricamento ordini:", e);
    } finally {
      setLoading(false);
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
      pending: '📋 In preparazione',
      label_generated: '🏷️ Etichetta creata',
      shipped: '🚛 In viaggio',
      delivered: '✅ Consegnato'
    };
    return texts[status] || status;
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      pending: 'Il venditore sta preparando il tuo ordine per la spedizione',
      label_generated: 'Etichetta InPost creata - Il pacco sarà ritirato a breve',
      shipped: 'Il tuo pacco è in viaggio verso il locker InPost! Riceverai SMS con il codice.',
      delivered: 'Consegnato! Controlla il locker InPost con il codice ricevuto.'
    };
    return descriptions[status] || 'Stato sconosciuto';
  };

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div>Caricamento i tuoi ordini...</div>
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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          
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
              🛒 I Miei Ordini
            </h1>

            {orders.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                color: '#6b7280',
                background: '#f9fafb',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛍️</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>Nessun ordine ancora</div>
                <div style={{ fontSize: '14px' }}>Partecipa a una live e vinci qualche prodotto!</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '20px'
              }}>
                {orders.map((order) => (
                  <div key={order.id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    background: 'white',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Header Ordine */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <div>
                        <h3 style={{ 
                          margin: '0 0 4px 0', 
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1f2937'
                        }}>
                          Ordine #{order.id.slice(-6)}
                        </h3>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#6b7280',
                          marginBottom: '4px'
                        }}>
                          📺 Live: {order.live?.title || 'Live non trovata'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          👤 Venditore: {order.live?.seller?.display_name || 'N/A'}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: '700',
                          color: '#059669',
                          marginBottom: '8px'
                        }}>
                          €{order.total_amount?.toFixed(2) || '0.00'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          📅 {new Date(order.created_at).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    </div>

                    {/* Stato Spedizione */}
                    <div style={{
                      background: '#f8fafc',
                      border: `2px solid ${getStatusColor(order.shipping_status || 'pending')}`,
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          color: getStatusColor(order.shipping_status || 'pending'),
                          fontSize: '16px',
                          fontWeight: '700'
                        }}>
                          {getStatusText(order.shipping_status || 'pending')}
                        </div>
                        
                        {/* Tracking Number */}
                        {order.tracking_number && (
                          <div style={{
                            background: getStatusColor(order.shipping_status || 'pending'),
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            📦 {order.tracking_number}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        marginBottom: '12px'
                      }}>
                        {getStatusDescription(order.shipping_status || 'pending')}
                      </div>

                      {/* Progress Bar */}
                      <div style={{
                        background: '#e5e7eb',
                        height: '6px',
                        borderRadius: '3px',
                        position: 'relative'
                      }}>
                        <div style={{
                          background: getStatusColor(order.shipping_status || 'pending'),
                          height: '100%',
                          borderRadius: '3px',
                          width: (() => {
                            const status = order.shipping_status || 'pending';
                            if (status === 'pending') return '25%';
                            if (status === 'label_generated') return '50%';
                            if (status === 'shipped') return '75%';
                            if (status === 'delivered') return '100%';
                            return '0%';
                          })(),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      
                      {/* Progress Steps */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '8px',
                        fontSize: '10px',
                        color: '#9ca3af'
                      }}>
                        <span>📋 Preparazione</span>
                        <span>🏷️ Etichetta</span>
                        <span>🚛 Spedito</span>
                        <span>✅ Consegnato</span>
                      </div>
                    </div>

                    {/* Prodotti */}
                    <div>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        🎯 Prodotti Vinti ({order.items?.length || 0})
                      </h4>
                      
                      <div style={{
                        display: 'grid',
                        gap: '8px'
                      }}>
                        {order.items?.map((item, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: '#f9fafb',
                            borderRadius: '8px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}>
                              {item.lot?.image_url && (
                                <img 
                                  src={item.lot.image_url}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'cover',
                                    borderRadius: '6px'
                                  }}
                                  alt={item.lot?.title}
                                />
                              )}
                              <div>
                                <div style={{ 
                                  fontWeight: '600',
                                  fontSize: '14px',
                                  color: '#1f2937'
                                }}>
                                  {item.lot?.title || 'Prodotto'}
                                </div>
                              </div>
                            </div>
                            
                            <div style={{
                              fontSize: '16px',
                              fontWeight: '700',
                              color: '#059669'
                            }}>
                              €{item.lot?.current_price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        )) || (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#6b7280',
                            fontSize: '14px'
                          }}>
                            Nessun prodotto trovato
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Azioni */}
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '16px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      {order.tracking_number && (
                        <button
                          onClick={() => {
                            // Simula apertura tracking
                            window.open(`https://www.poste.it/cerca/index.shtml#/risultati-spedizione/${order.tracking_number}`, '_blank');
                          }}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          🔍 Traccia Spedizione
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          if (selectedOrder === order.id) {
                            setSelectedOrder(null);
                          } else {
                            setSelectedOrder(order.id);
                          }
                        }}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedOrder === order.id ? '👆 Nascondi Dettagli' : '👇 Mostra Dettagli'}
                      </button>
                    </div>

                    {/* Dettagli Estesi */}
                    {selectedOrder === order.id && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: '#f0f9ff',
                        borderRadius: '8px',
                        border: '1px solid #e0f2fe'
                      }}>
                        <h5 style={{
                          margin: '0 0 12px 0',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#0284c7'
                        }}>
                          📋 Dettagli Ordine
                        </h5>
                        
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          fontSize: '13px'
                        }}>
                          <div>
                            <span style={{ color: '#6b7280' }}>🆔 ID Completo:</span>
                            <div style={{ fontWeight: '600', wordBreak: 'break-all' }}>
                              {order.id}
                            </div>
                          </div>
                          
                          <div>
                            <span style={{ color: '#6b7280' }}>📅 Data Ordine:</span>
                            <div style={{ fontWeight: '600' }}>
                              {new Date(order.created_at).toLocaleString('it-IT')}
                            </div>
                          </div>
                          
                          <div>
                            <span style={{ color: '#6b7280' }}>💰 Importo Totale:</span>
                            <div style={{ fontWeight: '700', color: '#059669', fontSize: '16px' }}>
                              €{order.total_amount?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          
                          {order.tracking_number && (
                            <div>
                              <span style={{ color: '#6b7280' }}>📦 Tracking:</span>
                              <div style={{ fontWeight: '600' }}>
                                {order.tracking_number}
                              </div>
                            </div>
                          )}
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
      <Footer />
    </>
  );
}
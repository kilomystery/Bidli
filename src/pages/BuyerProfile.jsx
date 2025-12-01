import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BuyerProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, itemsWon: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  async function loadUserProfile() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        navigate("/auth");
        return;
      }

      const currentUser = session.session.user;
      setUser(currentUser);

      // Carica profilo acquirente
      const { data: profileData } = await supabase
        .from("buyer_profiles")
        .select(`
          id, display_name, phone, date_of_birth, preferences,
          shipping_address, billing_address, created_at
        `)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      setProfile(profileData);

      // Carica ordini dell'utente
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, total_amount, status, shipping_status, created_at,
          live:live_id ( title, seller:seller_id ( display_name ) ),
          items:order_lots ( lot:lot_id ( title, current_price ) )
        `)
        .eq("buyer_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setOrders(ordersData || []);

      // Calcola statistiche
      if (ordersData?.length) {
        const totalSpent = ordersData.reduce((acc, order) => acc + (order.total_amount || 0), 0);
        const itemsWon = ordersData.reduce((acc, order) => acc + (order.items?.length || 0), 0);
        
        setStats({
          totalOrders: ordersData.length,
          totalSpent,
          itemsWon
        });
      }

    } catch (e) {
      console.error("Errore caricamento profilo:", e);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      shipped: '#10b981',
      delivered: '#059669'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '📋 In preparazione',
      shipped: '🚛 In viaggio',
      delivered: '✅ Consegnato'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Caricamento profilo...</div>
      </div>
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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Header Profilo */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: 'white',
                fontWeight: '700'
              }}>
                {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              
              <div>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '28px', 
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {profile?.display_name || user?.email || 'Utente'}
                </h1>
                <div style={{ color: '#6b7280', marginBottom: '8px' }}>
                  👤 Acquirente BIDLi
                </div>
                <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                  📅 Membro dal {new Date(user?.created_at || Date.now()).toLocaleDateString('it-IT')}
                </div>
              </div>
            </div>

            {/* Statistiche */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.totalOrders}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>📦 Ordini Totali</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                  €{stats.totalSpent.toFixed(2)}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>💰 Totale Speso</div>
              </div>
              
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.itemsWon}
                </div>
                <div style={{ fontSize: '14px', opacity: '0.9' }}>🎯 Prodotti Vinti</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setActiveTab('profile')}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  background: activeTab === 'profile' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'profile' ? 'white' : '#6b7280',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                👤 Profilo
              </button>
              
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  background: activeTab === 'orders' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'orders' ? 'white' : '#6b7280',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📦 Ordini Recenti
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  background: activeTab === 'settings' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'settings' ? 'white' : '#6b7280',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ⚙️ Impostazioni
              </button>
            </div>

            <div style={{ padding: '30px' }}>
              
              {/* Tab Profilo */}
              {activeTab === 'profile' && (
                <div>
                  <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
                    📋 Informazioni Profilo
                  </h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                        📧 Contatti
                      </h3>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Email</div>
                        <div style={{ fontWeight: '600' }}>{user?.email}</div>
                      </div>
                      {profile?.phone && (
                        <div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>Telefono</div>
                          <div style={{ fontWeight: '600' }}>{profile.phone}</div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{
                      background: '#f9fafb',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                        🎯 Attività
                      </h3>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Ultimo ordine</div>
                        <div style={{ fontWeight: '600' }}>
                          {orders.length > 0 ? new Date(orders[0].created_at).toLocaleDateString('it-IT') : 'Nessun ordine'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>Live partecipate</div>
                        <div style={{ fontWeight: '600' }}>
                          {[...new Set(orders.map(o => o.live?.title).filter(Boolean))].length} diverse
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Azioni Rapide */}
                  <div style={{
                    marginTop: '30px',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => navigate('/orders/my')}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      📦 Vedi Tutti gli Ordini
                    </button>
                    
                    <button
                      onClick={() => navigate('/account/settings')}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ⚙️ Centro Gestione Account
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Ordini */}
              {activeTab === 'orders' && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h2 style={{ margin: 0, color: '#1f2937' }}>
                      📦 Ordini Recenti
                    </h2>
                    <button
                      onClick={() => navigate('/orders/my')}
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
                      Vedi Tutti
                    </button>
                  </div>
                  
                  {orders.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛍️</div>
                      <div style={{ fontSize: '18px' }}>Nessun ordine ancora</div>
                      <div style={{ fontSize: '14px', marginTop: '8px' }}>
                        Partecipa a una live per iniziare!
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '16px' }}>
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
                            marginBottom: '12px'
                          }}>
                            <div>
                              <h4 style={{ 
                                margin: '0 0 4px 0', 
                                fontSize: '16px',
                                fontWeight: '600'
                              }}>
                                Ordine #{order.id.slice(-6)}
                              </h4>
                              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                📺 {order.live?.title || 'Live'}
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                background: getStatusColor(order.shipping_status),
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                marginBottom: '4px'
                              }}>
                                {getStatusText(order.shipping_status || 'pending')}
                              </div>
                              <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#059669'
                              }}>
                                €{order.total_amount?.toFixed(2) || '0.00'}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginBottom: '8px'
                          }}>
                            📅 {new Date(order.created_at).toLocaleDateString('it-IT')} • 
                            {order.items?.length || 0} prodotti
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Impostazioni */}
              {activeTab === 'settings' && (
                <div>
                  <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
                    ⚙️ Gestione Account
                  </h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {/* Indirizzi */}
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                        🏠 Indirizzi di Spedizione
                      </h3>
                      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                        Gestisci i tuoi indirizzi di consegna per ricevere gli ordini.
                      </p>
                      <button
                        onClick={() => navigate('/account/addresses')}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        Gestisci Indirizzi
                      </button>
                    </div>
                    
                    {/* Informazioni Personali */}
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                        👤 Informazioni Personali
                      </h3>
                      <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
                        Aggiorna nome, telefono e altre informazioni del profilo.
                      </p>
                      <button
                        onClick={() => navigate('/account/settings')}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          width: '100%'
                        }}
                      >
                        Modifica Profilo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
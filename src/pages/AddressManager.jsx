import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AddressManager() {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    type: 'shipping',
    label: '',
    full_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    postal_code: '',
    province: '',
    country: 'IT',
    phone: '',
    is_default: false,
    notes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserAndAddresses();
  }, []);

  async function loadUserAndAddresses() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        navigate("/auth");
        return;
      }

      const currentUser = session.session.user;
      setUser(currentUser);

      // Verifica se è un venditore
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("id, display_name")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      setSeller(sellerData);

      // Carica indirizzi dell'utente
      const { data: addressesData } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      setAddresses(addressesData || []);

    } catch (e) {
      console.error("Errore caricamento indirizzi:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress() {
    try {
      if (!formData.full_name || !formData.address_line_1 || !formData.city || !formData.postal_code) {
        alert('Compila tutti i campi obbligatori');
        return;
      }

      const addressData = {
        ...formData,
        user_id: user.id
      };

      if (editingAddress) {
        // Aggiorna indirizzo esistente
        const { error } = await supabase
          .from("user_addresses")
          .update(addressData)
          .eq("id", editingAddress.id);
          
        if (error) throw error;
      } else {
        // Crea nuovo indirizzo
        const { error } = await supabase
          .from("user_addresses")
          .insert(addressData);
          
        if (error) throw error;
      }

      // Se è impostato come predefinito, aggiorna gli altri
      if (formData.is_default) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", editingAddress?.id);
      }

      await loadUserAndAddresses();
      setShowForm(false);
      setEditingAddress(null);
      resetForm();

    } catch (e) {
      alert("Errore nel salvare l'indirizzo: " + e.message);
    }
  }

  async function deleteAddress(addressId) {
    if (!confirm('Sei sicuro di voler eliminare questo indirizzo?')) return;

    try {
      const { error } = await supabase
        .from("user_addresses")
        .delete()
        .eq("id", addressId);

      if (error) throw error;

      await loadUserAndAddresses();
    } catch (e) {
      alert("Errore nell'eliminare l'indirizzo: " + e.message);
    }
  }

  async function setAsDefault(addressId) {
    try {
      // Reset tutti a false
      await supabase
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Imposta questo come default
      await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", addressId);

      await loadUserAndAddresses();
    } catch (e) {
      alert("Errore nell'impostare l'indirizzo predefinito: " + e.message);
    }
  }

  function resetForm() {
    setFormData({
      type: 'shipping',
      label: '',
      full_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      postal_code: '',
      province: '',
      country: 'IT',
      phone: '',
      is_default: false,
      notes: ''
    });
  }

  function editAddress(address) {
    setEditingAddress(address);
    setFormData(address);
    setShowForm(true);
  }

  function addNewAddress() {
    setEditingAddress(null);
    resetForm();
    setShowForm(true);
  }

  const getAddressTypeLabel = (type) => {
    const labels = {
      shipping: '📦 Spedizione',
      fulfillment: '🏢 Evasione (Venditore)',
      billing: '💳 Fatturazione'
    };
    return labels[type] || type;
  };

  const getAddressTypeColor = (type) => {
    const colors = {
      shipping: '#3b82f6',
      fulfillment: '#10b981', 
      billing: '#f59e0b'
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Caricamento indirizzi...</div>
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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 20px' }}>
          
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px'
            }}>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                🏠 Gestione Indirizzi
              </h1>
              
              <button
                onClick={addNewAddress}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ➕ Nuovo Indirizzo
              </button>
            </div>

            {/* Info sui tipi di indirizzo */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '16px' }}>
                📋 Tipi di Indirizzo
              </h3>
              <div style={{ fontSize: '14px', color: '#374151' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>📦 Spedizione:</strong> Dove ricevi i tuoi acquisti
                </div>
                {seller && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>🏢 Evasione:</strong> Da dove spedisci i prodotti (solo venditori)
                  </div>
                )}
                <div>
                  <strong>💳 Fatturazione:</strong> Per le fatture e pagamenti
                </div>
              </div>
            </div>

            {/* Lista Indirizzi */}
            {addresses.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                color: '#6b7280',
                background: '#f9fafb',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏠</div>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>Nessun indirizzo salvato</div>
                <div style={{ fontSize: '14px' }}>Aggiungi il tuo primo indirizzo per iniziare</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '16px'
              }}>
                {addresses.map((address) => (
                  <div key={address.id} style={{
                    border: address.is_default ? `2px solid #3b82f6` : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                    background: address.is_default ? '#f0f9ff' : 'white',
                    position: 'relative'
                  }}>
                    {address.is_default && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#3b82f6',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ⭐ Predefinito
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        background: getAddressTypeColor(address.type),
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {getAddressTypeLabel(address.type)}
                      </div>
                      
                      {address.label && (
                        <div style={{
                          background: '#f3f4f6',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          {address.label}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
                        {address.full_name}
                      </div>
                      {address.company && (
                        <div style={{ color: '#6b7280', marginBottom: '4px' }}>
                          {address.company}
                        </div>
                      )}
                      <div style={{ color: '#374151', lineHeight: '1.4' }}>
                        {address.address_line_1}
                        {address.address_line_2 && <><br />{address.address_line_2}</>}
                        <br />
                        {address.postal_code} {address.city} {address.province && `(${address.province})`}
                        <br />
                        {address.country === 'IT' ? 'Italia' : address.country}
                      </div>
                      {address.phone && (
                        <div style={{ color: '#6b7280', marginTop: '8px' }}>
                          📞 {address.phone}
                        </div>
                      )}
                      {address.notes && (
                        <div style={{ 
                          color: '#6b7280', 
                          marginTop: '8px', 
                          fontSize: '14px',
                          fontStyle: 'italic'
                        }}>
                          💬 {address.notes}
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => editAddress(address)}
                        style={{
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Modifica
                      </button>
                      
                      {!address.is_default && (
                        <button
                          onClick={() => setAsDefault(address.id)}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          ⭐ Imposta Predefinito
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteAddress(address.id)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>
                {editingAddress ? '✏️ Modifica Indirizzo' : '➕ Nuovo Indirizzo'}
              </h2>
              <button 
                onClick={() => setShowForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gap: '16px'
            }}>
              {/* Tipo e Etichetta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Tipo Indirizzo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="shipping">📦 Spedizione</option>
                    {seller && <option value="fulfillment">🏢 Evasione</option>}
                    <option value="billing">💳 Fatturazione</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Etichetta (opzionale)
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="es: Casa, Ufficio..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Nome e Azienda */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Azienda
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Indirizzi */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Indirizzo *
                </label>
                <input
                  type="text"
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  placeholder="Via, numero civico"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                />
                <input
                  type="text"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  placeholder="Appartamento, scala, interno (opzionale)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Città, CAP, Provincia */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Città *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    CAP *
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    placeholder="es: MI"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Telefono */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Telefono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 123 456 7890"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Note */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Note (opzionali)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Istruzioni per la consegna, citofono, ecc..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Predefinito */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                />
                <label htmlFor="is_default" style={{ fontWeight: '600' }}>
                  ⭐ Imposta come indirizzo predefinito
                </label>
              </div>
            </div>

            {/* Pulsanti */}
            <div style={{
              marginTop: '24px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              
              <button
                onClick={saveAddress}
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
                {editingAddress ? 'Aggiorna' : 'Salva'} Indirizzo
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
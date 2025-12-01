// src/pages/AccountCompleteProfile.jsx - Completamento profilo dalla sezione Account
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import BackButton from '../components/BackButton';
import { User, MapPin, Phone, Store, Building, CreditCard, Upload, CheckCircle } from 'lucide-react';

export default function AccountCompleteProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state UNIFICATO (stesso di CompleteBuyerProfile)
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    profile_picture: '',
    // Shipping address  
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'Italia',
    // Contact info
    phone: '',
    // Campi venditore (opzionali)
    store_name: '',
    store_description: '',
    iban: '',
    category: '',
    business_email: ''
  });
  
  const [profileFile, setProfileFile] = useState(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [wantToBeSeller, setWantToBeSeller] = useState(false);
  
  const categories = [
    { value: 'fashion', label: '👗 Fashion & Abbigliamento' },
    { value: 'sneakers', label: '👟 Sneakers & Scarpe' },
    { value: 'electronics', label: '📱 Elettronica & Tech' },
    { value: 'collectibles', label: '🎯 Collezionismo' },
    { value: 'home', label: '🏠 Casa & Design' },
    { value: 'other', label: '🎭 Altro' }
  ];

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  async function checkAuthAndLoadProfile() {
    try {
      setLoading(true);
      
      // Verifica autenticazione
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth error:', error);
        navigate('/auth');
        return;
      }
      
      if (!user) {
        navigate('/auth');
        return;
      }
      
      setUser(user);
      
      // Carica profilo esistente se presente
      const profileResponse = await fetch(`/api/profiles/${user.id}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setExistingProfile(profile);
        
        // Pre-popola i campi con i dati esistenti
        setFormData({
          username: profile.username || '',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          profile_picture: profile.profile_picture || '',
          shipping_address: profile.shipping_address || '',
          shipping_city: profile.shipping_city || '',
          shipping_postal_code: profile.shipping_postal_code || '',
          shipping_country: profile.shipping_country || 'Italia',
          phone: profile.phone || '',
          store_name: profile.store_name || '',
          store_description: profile.store_description || '',
          iban: profile.iban || '',
          category: profile.category || '',
          business_email: profile.business_email || ''
        });
        
        // Se è già venditore, mostra i campi venditore
        if (profile.role === 'seller') {
          setWantToBeSeller(true);
        }
      }
      
    } catch (err) {
      console.error('Errore caricamento profilo:', err);
      setError('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function uploadProfilePicture(file) {
    if (!file) return null;
    
    setUploadingProfile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-profile-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      throw new Error('Errore upload foto profilo');
    } finally {
      setUploadingProfile(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validazioni essenziali
      if (!formData.phone.trim()) {
        throw new Error('Il numero di telefono è obbligatorio.');
      }
      
      if (!formData.shipping_address.trim()) {
        throw new Error('L\'indirizzo di spedizione è obbligatorio.');
      }
      
      // Validazioni extra per venditori
      if (wantToBeSeller) {
        if (!formData.store_name.trim()) {
          throw new Error('Il nome del negozio è obbligatorio per i venditori.');
        }
        
        if (!formData.category) {
          throw new Error('Seleziona una categoria per il tuo negozio.');
        }
        
        if (!formData.iban || formData.iban.length < 15) {
          throw new Error('IBAN non valido. Inserisci un IBAN completo.');
        }
      }
      
      // Upload profile picture se presente
      let profilePictureUrl = formData.profile_picture;
      if (profileFile) {
        profilePictureUrl = await uploadProfilePicture(profileFile);
      }
      
      // Username automatico se non presente
      const API_BASE = window.location.origin.replace(':5000', ':3001');
      const finalUsername = formData.username || `user_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(-4)}`;

      // Aggiorna profilo
      const profileData = {
        email: user.email,
        username: finalUsername,
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city || '',
        shipping_postal_code: formData.shipping_postal_code || '',
        shipping_country: formData.shipping_country || 'Italy',
        phone: formData.phone,
        store_name: wantToBeSeller ? formData.store_name : '',
        category: wantToBeSeller ? formData.category : '',
        iban: wantToBeSeller ? formData.iban : '',
        profile_picture: profilePictureUrl,
        is_seller: wantToBeSeller
      };
      
      const updateResponse = await fetch(`${API_BASE}/api/profiles/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Errore durante l\'aggiornamento');
      }

      // Se vuole essere venditore, crea record venditore
      if (wantToBeSeller) {
        const sellerData = {
          handle: `${formData.store_name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-6)}`,
          display_name: formData.store_name,
          bio: formData.store_description || 'Venditore su BIDLi',
          avatar_url: profilePictureUrl,
          category: formData.category,
          iban: formData.iban
        };
        
        const sellerResponse = await fetch(`${API_BASE}/api/sellers/user/${user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sellerData)
        });
        
        if (!sellerResponse.ok) {
          console.warn('Errore creazione venditore, ma profilo aggiornato');
        }
      }
      
      setSuccess('✅ Profilo aggiornato con successo!');
      
      // Reindirizza dopo un paio di secondi
      setTimeout(() => {
        navigate('/account');
      }, 2000);
      
    } catch (err) {
      console.error('Errore aggiornamento profilo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !user) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      paddingTop: '20px',
      paddingBottom: '40px'
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: '0 16px' }}>
        <BackButton />
        
        {/* HEADER */}
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
            alignItems: 'center'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <User size={28} color="white" />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 24, 
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}>
                Completa il tuo Profilo
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                color: '#64748b'
              }}>
                {existingProfile ? 'Aggiorna le tue informazioni' : 'Compila i tuoi dati per iniziare'}
              </p>
            </div>
          </div>
        </div>

        {/* SUCCESS/ERROR MESSAGES */}
        {success && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle size={20} color="#059669" />
            <span style={{ color: '#059669', fontSize: 14, fontWeight: 500 }}>
              {success}
            </span>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#dc2626',
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* INFORMAZIONI PERSONALI */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 20,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              fontSize: 18,
              fontWeight: 600,
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <User size={20} />
              Informazioni Personali
            </h3>

            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Nome"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                
                <input
                  type="text"
                  placeholder="Cognome"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={18} color="#6b7280" />
                <input
                  type="tel"
                  placeholder="Telefono *"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>
          </div>

          {/* INDIRIZZO SPEDIZIONE */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 20,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              fontSize: 18,
              fontWeight: 600,
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <MapPin size={20} />
              Indirizzo di Spedizione
            </h3>

            <div style={{ display: 'grid', gap: 16 }}>
              <input
                type="text"
                placeholder="Indirizzo completo *"
                value={formData.shipping_address}
                onChange={(e) => handleInputChange('shipping_address', e.target.value)}
                required
                style={{
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Città"
                  value={formData.shipping_city}
                  onChange={(e) => handleInputChange('shipping_city', e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
                
                <input
                  type="text"
                  placeholder="CAP"
                  value={formData.shipping_postal_code}
                  onChange={(e) => handleInputChange('shipping_postal_code', e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>

              <select
                value={formData.shipping_country}
                onChange={(e) => handleInputChange('shipping_country', e.target.value)}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  backgroundColor: 'white'
                }}
              >
                <option value="Italia">Italia</option>
                <option value="Francia">Francia</option>
                <option value="Germania">Germania</option>
                <option value="Spagna">Spagna</option>
              </select>
            </div>
          </div>

          {/* DIVENTA VENDITORE */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 20,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              marginBottom: wantToBeSeller ? 20 : 0
            }}>
              <input
                type="checkbox"
                checked={wantToBeSeller}
                onChange={(e) => setWantToBeSeller(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: '#10b981'
                }}
              />
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
                  🚀 Diventa Venditore
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Inizia a vendere su BIDLi e raggiungere migliaia di acquirenti
                </div>
              </div>
            </label>

            {wantToBeSeller && (
              <div style={{ 
                paddingTop: 20,
                borderTop: '1px solid #f3f4f6',
                display: 'grid',
                gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Store size={18} color="#6b7280" />
                  <input
                    type="text"
                    placeholder="Nome del tuo negozio *"
                    value={formData.store_name}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Seleziona categoria *</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building size={18} color="#6b7280" />
                  <input
                    type="text"
                    placeholder="IBAN per ricevere i pagamenti *"
                    value={formData.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? 'Aggiornamento...' : existingProfile ? 'Aggiorna Profilo' : 'Completa Profilo'}
          </button>
        </form>
      </div>
    </div>
  );
}
// src/pages/CompleteBuyerProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function CompleteBuyerProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const [user, setUser] = useState(null);
  const [profileFile, setProfileFile] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);

  // Modalità venditore
  const [wantToBeSeller, setWantToBeSeller] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    profile_picture: '',

    // Shipping
    shipping_address: '',
    shipping_city: '',
    shipping_postal_code: '',
    shipping_country: 'Italia',

    // Contacts
    phone: '',

    // Seller
    store_name: '',
    store_description: '',
    iban: '',
    category: '',
    business_email: ''
  });

  const categories = [
    { value: 'fashion', label: 'Fashion & Abbigliamento' },
    { value: 'sneakers', label: 'Sneakers & Scarpe' },
    { value: 'electronics', label: 'Elettronica & Tech' },
    { value: 'collectibles', label: 'Collezionismo' },
    { value: 'home', label: 'Casa & Design' },
    { value: 'other', label: 'Altro' }
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('verified') === 'true') {
      setShowVerificationSuccess(true);
    }
    bootstrap(urlParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap(urlParams) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/auth');
        return;
      }
      setUser(user);

      // Forza modalità venditore da query
      const forceSeller =
        urlParams.get('mode') === 'seller' || urlParams.get('becomeSeller') === '1';
      if (forceSeller) setWantToBeSeller(true);

      // Profili
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, phone, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (prof?.role === 'seller') setWantToBeSeller(true);

      // Se esiste un seller record → venditore
      const { data: sellerRow } = await supabase
        .from('sellers')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sellerRow?.user_id) setWantToBeSeller(true);

      // Prefill dati base
      setFormData(prev => ({
        ...prev,
        first_name: prof?.first_name || '',
        last_name: prof?.last_name || '',
        phone: prof?.phone || '',
        username: prof?.username || '',
        profile_picture: prof?.avatar_url || ''
      }));

      // Prefill indirizzi (se hai una tabella buyer_profiles)
      const { data: buyer } = await supabase
        .from('buyer_profiles')
        .select('shipping_address, shipping_city, shipping_postal_code, shipping_country')
        .eq('user_id', user.id)
        .maybeSingle();

      if (buyer) {
        setFormData(prev => ({
          ...prev,
          shipping_address: buyer.shipping_address || '',
          shipping_city: buyer.shipping_city || '',
          shipping_postal_code: buyer.shipping_postal_code || '',
          shipping_country: buyer.shipping_country || 'Italia'
        }));
      }

      // Prefill seller (se già esiste)
      const { data: seller } = await supabase
        .from('sellers')
        .select('store_name, store_description, iban, category, phone, business_email, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (seller) {
        setFormData(prev => ({
          ...prev,
          store_name: seller.store_name || '',
          store_description: seller.store_description || '',
          iban: seller.iban || '',
          category: seller.category || '',
          business_email: seller.business_email || user.email,
          profile_picture: seller.avatar_url || prev.profile_picture
        }));
      }
    } catch (e) {
      console.error('Bootstrap error:', e);
      navigate('/auth');
    }
  }

  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function uploadProfilePicture(file) {
    if (!file) return null;
    setUploadingProfile(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}-profile-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase
        .from('profile-pictures')
        .getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      throw new Error('Errore upload foto profilo');
    } finally {
      setUploadingProfile(false);
    }
  }

  async function handleSkip() {
    // Salta e porta in dashboard
    navigate('/dashboard');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validazioni minime
      if (!formData.phone.trim()) throw new Error('Il numero di telefono è obbligatorio.');
      if (!formData.shipping_address.trim()) throw new Error("L'indirizzo di spedizione è obbligatorio.");

      if (wantToBeSeller) {
        if (!formData.store_name.trim()) throw new Error('Il nome del negozio è obbligatorio per i venditori.');
        if (!formData.category) throw new Error('Seleziona una categoria per il tuo negozio.');
        if (!formData.iban || formData.iban.length < 15) throw new Error('IBAN non valido. Inserisci un IBAN completo.');
      }

      // Upload immagine se presente
      let profilePictureUrl = formData.profile_picture || '';
      if (profileFile) profilePictureUrl = await uploadProfilePicture(profileFile);

      // Username auto se mancante
      const finalUsername =
        formData.username?.trim() ||
        `user_${Date.now().toString().slice(-8)}_${Math.random().toString(36).slice(-4)}`;

      // 1) Aggiorna/crea PROFILES
      const roleToSet = wantToBeSeller ? 'seller' : 'customer';
      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          username: finalUsername,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          phone: formData.phone,
          avatar_url: profilePictureUrl,
          role: roleToSet,
          updated_at: new Date().toISOString()
        });
      if (profErr) throw profErr;

      // 2) Aggiorna/crea BUYER_PROFILES (sempre, così i buyer hanno dati)
      const { error: buyerErr } = await supabase
        .from('buyer_profiles')
        .upsert({
          user_id: user.id,
          shipping_address: formData.shipping_address,
          shipping_city: formData.shipping_city || '',
          shipping_postal_code: formData.shipping_postal_code || '',
          shipping_country: formData.shipping_country || 'Italia',
          updated_at: new Date().toISOString()
        });
      if (buyerErr) throw buyerErr;

      // 3) Se venditore: Aggiorna/crea SELLERS
      if (wantToBeSeller) {
        const { error: sellerErr } = await supabase
          .from('sellers')
          .upsert({
            user_id: user.id,
            store_name: formData.store_name,
            store_description: formData.store_description || '',
            iban: formData.iban,
            avatar_url: profilePictureUrl,
            category: formData.category,
            shipping_address: formData.shipping_address,
            shipping_city: formData.shipping_city || '',
            shipping_postal_code: formData.shipping_postal_code || '',
            shipping_country: formData.shipping_country || 'Italia',
            phone: formData.phone,
            business_email: formData.business_email || user.email,
            updated_at: new Date().toISOString()
          });
        if (sellerErr) throw sellerErr;
      }

      setSuccess(
        wantToBeSeller
          ? '🎉 Negozio venditore creato con successo! Benvenuto su BIDLi!'
          : '✅ Profilo acquirente completato con successo!'
      );

      setTimeout(() => {
        navigate(wantToBeSeller ? '/seller-dashboard' : '/buyer-dashboard');
      }, 900);
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', marginTop: '80px' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          {showVerificationSuccess && (
            <div
              style={{
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>🎉</div>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Email verificata con successo!</div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                Benvenuto su BIDLi! Completa il tuo profilo per iniziare.
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#1a202c',
                marginBottom: '8px'
              }}
            >
              {wantToBeSeller ? '🏪 Diventa un venditore BIDLi' : '👤 Completa il tuo profilo'}
            </h1>
            <p
              style={{
                color: '#64748b',
                fontSize: '16px',
                lineHeight: '1.5',
                marginBottom: '16px'
              }}
            >
              {wantToBeSeller
                ? 'Configura il tuo negozio e inizia a vendere i tuoi vintage! Potrai personalizzare tutto in seguito.'
                : 'Aggiungi le tue informazioni per iniziare a fare acquisti su BIDLi. Potrai personalizzare tutto in seguito.'}
            </p>

            {/* Toggle venditore */}
            <div
              style={{
                background: wantToBeSeller ? '#f0f9ff' : '#fef3c7',
                border: `2px solid ${wantToBeSeller ? '#0ea5e9' : '#f59e0b'}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: wantToBeSeller ? '#0f172a' : '#92400e'
                }}
              >
                {wantToBeSeller ? '🏪 Modalità Venditore Attiva' : '💡 Vuoi vendere su BIDLi?'}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: wantToBeSeller ? '#475569' : '#a16207',
                  marginBottom: '12px'
                }}
              >
                {wantToBeSeller
                  ? 'Perfetto! Completa i dati del tuo negozio per iniziare a vendere vintage'
                  : 'Puoi diventare un venditore e aprire il tuo negozio vintage su BIDLi!'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setWantToBeSeller(!wantToBeSeller);
                  if (!wantToBeSeller) {
                    setFormData(prev => ({
                      ...prev,
                      business_email: user?.email || 'verified@bidli.live'
                    }));
                  }
                }}
                style={{
                  background: wantToBeSeller ? '#ef4444' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {wantToBeSeller ? '← Torna ad Acquirente' : '🚀 Diventa Venditore!'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                color: '#6b7280',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f9fafb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              {loading ? 'Salvataggio...' : 'Completa dopo →'}
            </button>
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Info personali */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#000000' }}>
                👤 Informazioni Personali
              </h3>

              {/* Username auto nascosto */}
              <input type="hidden" value={`auto_${Date.now()}`} readOnly />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label
                    style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                  >
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    placeholder="Mario"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                  >
                    Cognome
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    placeholder="Rossi"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              {/* Foto profilo */}
              <div style={{ marginTop: '16px' }}>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                >
                  Foto profilo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                />
                {uploadingProfile && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Caricamento immagine…</div>
                )}
              </div>
            </div>

            {/* Indirizzo spedizione */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#000000' }}>
                📦 Indirizzo Spedizioni
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label
                    style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                  >
                    Indirizzo *
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_address}
                    onChange={(e) => handleInputChange('shipping_address', e.target.value)}
                    placeholder="Via Roma 123"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      Città *
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_city}
                      onChange={(e) => handleInputChange('shipping_city', e.target.value)}
                      placeholder="Milano"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      CAP
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_postal_code}
                      onChange={(e) => handleInputChange('shipping_postal_code', e.target.value)}
                      placeholder="20100"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                  >
                    Paese
                  </label>
                  <input
                    type="text"
                    value={formData.shipping_country}
                    onChange={(e) => handleInputChange('shipping_country', e.target.value)}
                    placeholder="Italia"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Contatti */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#000000' }}>📞 Contatti</h3>
              <div>
                <label
                  style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#000000' }}
                >
                  Telefono *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+39 333 1234567"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>

            {/* Sezione venditore */}
            {wantToBeSeller && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#000000' }}>
                  🏪 Dati Venditore
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      Nome negozio *
                    </label>
                    <input
                      type="text"
                      value={formData.store_name}
                      onChange={(e) => handleInputChange('store_name', e.target.value)}
                      placeholder="Il mio negozio vintage"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      Descrizione negozio
                    </label>
                    <textarea
                      value={formData.store_description}
                      onChange={(e) => handleInputChange('store_description', e.target.value)}
                      placeholder="Racconta cosa vendi…"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      Categoria *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px',
                        background: 'white'
                      }}
                    >
                      <option value="" disabled>
                        Seleziona categoria
                      </option>
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      IBAN *
                    </label>
                    <input
                      type="text"
                      value={formData.iban}
                      onChange={(e) => handleInputChange('iban', e.target.value)}
                      placeholder="IT60X0542811101000000123456"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: '6px',
                        color: '#000000'
                      }}
                    >
                      Email business
                    </label>
                    <input
                      type="email"
                      value={formData.business_email}
                      onChange={(e) => handleInputChange('business_email', e.target.value)}
                      placeholder="negozio@esempio.it"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={loading || uploadingProfile}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Salvataggio…' : wantToBeSeller ? 'Crea negozio' : 'Salva profilo'}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                style={{
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  color: '#6b7280',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Completa dopo
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
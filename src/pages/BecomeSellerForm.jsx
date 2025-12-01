import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BecomeSellerForm() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    storeName: '',
    handle: '',
    description: '',
    phone: '',
    category: '',
    experience: ''
  });

  const categories = [
    { value: 'fashion', label: '👗 Fashion & Abbigliamento' },
    { value: 'sneakers', label: '👟 Sneakers & Scarpe' },
    { value: 'electronics', label: '📱 Elettronica & Tech' },
    { value: 'collectibles', label: '🎯 Collezionismo' },
    { value: 'home', label: '🏠 Casa & Design' },
    { value: 'other', label: '🎭 Altro' }
  ];

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session) {
        // Redirect to login
        window.dispatchEvent(new Event('auth:open'));
        return;
      }

      // Check if already a seller
      const { data: seller } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (seller) {
        // Already a seller, redirect to dashboard
        navigate('/dashboard');
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error('Error checking session:', err);
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate form
      if (!formData.storeName || !formData.handle || !formData.category) {
        throw new Error('Compila tutti i campi obbligatori');
      }

      // Check if handle is available
      const { data: existingHandle } = await supabase
        .from('sellers')
        .select('handle')
        .eq('handle', formData.handle.toLowerCase())
        .single();

      if (existingHandle) {
        throw new Error('Questo nome utente è già in uso');
      }

      // Create seller profile
      const { error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: session.user.id,
          handle: formData.handle.toLowerCase(),
          display_name: formData.storeName,
          store_name: formData.storeName,
          description: formData.description,
          phone: formData.phone,
          category: formData.category,
          experience_level: formData.experience,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (sellerError) throw sellerError;

      // Update user profile role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'seller' })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div>Caricamento...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ 
            textAlign: 'center', 
            background: 'white', 
            padding: '40px', 
            borderRadius: '20px',
            maxWidth: '500px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', color: '#111827' }}>
              Benvenuto su BIDLi!
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
              La tua richiesta è stata inviata. Ti reindirizziamo alla dashboard...
            </p>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ 
        flex: 1, 
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '28px', fontWeight: 700 }}>
              Diventa Venditore
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
              Inizia a vendere i tuoi prodotti vintage in live streaming
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
            
            {/* Store Name */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Nome Negozio *
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="es: Vintage Milano"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Handle */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Nome Utente *
              </label>
              <input
                type="text"
                value={formData.handle}
                onChange={(e) => handleChange('handle', e.target.value.toLowerCase())}
                placeholder="es: vintagemilano"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <small style={{ color: '#6b7280', fontSize: '14px' }}>
                Il tuo URL sarà: bidli.live/seller/{formData.handle}
              </small>
            </div>

            {/* Category */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Categoria Principale *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">Seleziona categoria...</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Descrizione Negozio
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Racconta di te e dei tuoi prodotti..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+39 123 456 7890"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Experience */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151' }}>
                Esperienza di Vendita
              </label>
              <select
                value={formData.experience}
                onChange={(e) => handleChange('experience', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">Seleziona...</option>
                <option value="beginner">Principiante</option>
                <option value="intermediate">Intermedio</option>
                <option value="expert">Esperto</option>
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '16px',
                background: saving ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Invio in corso...
                </>
              ) : (
                '🚀 Diventa Venditore'
              )}
            </button>
          </form>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
// Import dinamici per compatibilità browser
const generateQRCode = async (text) => {
  const QRCode = await import('qrcode');
  return QRCode.default.toDataURL(text);
};

const generateTOTPSecret = () => {
  // Genera secret compatibile con Google Authenticator
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

const verifyTOTP = (secret, token) => {
  // Implementazione TOTP base per browser
  const crypto = window.crypto;
  if (!crypto || !token || token.length !== 6) return false;
  
  // Simulazione verifica (in produzione usare libreria più robusta)
  // Per demo, accettiamo qualsiasi codice di 6 cifre
  return /^\d{6}$/.test(token);
};

export default function BuyerAccount() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState(0); // 0: form, 1: verification
  const [twoFactorStep, setTwoFactorStep] = useState(0); // 0: disabled, 1: setup, 2: enabled
  const [selectedMethod, setSelectedMethod] = useState('sms'); // sms, totp, oauth
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Form states
  const [personalData, setPersonalData] = useState({
    display_name: '',
    phone: '',
    date_of_birth: ''
  });
  
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    new_email: '',
    verification_code: '',
    phone_for_2fa: '',
    is_2fa_enabled: false
  });
  
  const [preferencesData, setPreferencesData] = useState({
    email_notifications: true,
    auction_reminders: true,
    marketing_emails: false,
    sms_notifications: false,
    favorite_categories: [],
    max_bid_amount: '',
    auto_bid_enabled: false
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadAccountData();
  }, []);

  async function loadAccountData() {
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
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setPersonalData({
          display_name: profileData.display_name || '',
          phone: profileData.phone || '',
          date_of_birth: profileData.date_of_birth || ''
        });
        
        // Carica preferenze se esistono
        if (profileData.preferences) {
          setPreferencesData({
            ...preferencesData,
            ...profileData.preferences
          });
          
          // Carica stato 2FA
          const twoFactorEnabled = profileData.preferences.two_factor_enabled || false;
          const currentMethod = profileData.preferences.two_factor_method || 'sms';
          
          setSecurityData(prev => ({
            ...prev,
            is_2fa_enabled: twoFactorEnabled,
            phone_for_2fa: profileData.preferences.two_factor_phone || ''
          }));
          
          setSelectedMethod(currentMethod);
          
          if (twoFactorEnabled) {
            setTwoFactorStep(2); // Già abilitato
            if (currentMethod === 'totp') {
              // Carica secret TOTP esistente per mostrare nuovo QR se necessario
              setTotpSecret(profileData.preferences.totp_secret || '');
            }
          }
        }
      } else {
        // Crea profilo se non esiste
        const { data: newProfile } = await supabase
          .from("buyer_profiles")
          .insert({
            user_id: currentUser.id,
            display_name: currentUser.email?.split('@')[0] || ''
          })
          .select()
          .single();
          
        setProfile(newProfile);
        setPersonalData({
          display_name: newProfile.display_name || '',
          phone: '',
          date_of_birth: ''
        });
      }

    } catch (e) {
      console.error("Errore caricamento account:", e);
    } finally {
      setLoading(false);
    }
  }

  async function savePersonalInfo() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buyer_profiles")
        .update({
          display_name: personalData.display_name,
          phone: personalData.phone,
          date_of_birth: personalData.date_of_birth || null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      alert('Informazioni personali aggiornate con successo!');
      await loadAccountData(); // Ricarica i dati
      
    } catch (e) {
      alert('Errore nel salvare le informazioni: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (securityData.new_password !== securityData.confirm_password) {
      alert('Le nuove password non corrispondono');
      return;
    }
    
    if (securityData.new_password.length < 6) {
      alert('La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: securityData.new_password
      });

      if (error) throw error;
      
      alert('Password cambiata con successo!');
      setSecurityData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (e) {
      alert('Errore nel cambiare la password: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    if (emailChangeStep === 0) {
      // Invia codice di verifica alla nuova email
      if (!securityData.new_email) {
        alert('Inserisci la nuova email');
        return;
      }

      setSaving(true);
      try {
        const { error } = await supabase.auth.updateUser({
          email: securityData.new_email
        });

        if (error) throw error;
        
        alert('Codice di verifica inviato alla nuova email. Controlla la tua casella di posta.');
        setEmailChangeStep(1);
        
      } catch (e) {
        alert('Errore nell\'inviare il codice: ' + e.message);
      } finally {
        setSaving(false);
      }
    } else {
      // Verifica il codice (Supabase gestisce automaticamente la verifica via email)
      alert('Clicca sul link di verifica ricevuto via email per completare il cambio.');
      setEmailChangeStep(0);
      setSecurityData({...securityData, new_email: '', verification_code: ''});
    }
  }

  async function setup2FA() {
    if (twoFactorStep === 0) {
      // Inizia setup basato su metodo selezionato
      setSaving(true);
      
      try {
        if (selectedMethod === 'sms') {
          if (!securityData.phone_for_2fa) {
            alert('Inserisci il numero di telefono per il 2FA');
            setSaving(false);
            return;
          }
          
          // Simula invio SMS (in produzione si userebbe Twilio)
          const code = Math.floor(100000 + Math.random() * 900000);
          alert(`Codice SMS inviato al ${securityData.phone_for_2fa}: ${code}\n(Demo: usa questo codice per testare)`);
          
          window.demoTwoFactorCode = code;
          setTwoFactorStep(1);
          
        } else if (selectedMethod === 'totp') {
          // Genera secret TOTP e QR code
          const secret = generateTOTPSecret();
          setTotpSecret(secret);
          
          // Crea URL compatibile con Google Authenticator
          const otpauthUrl = `otpauth://totp/BIDLi%20(${encodeURIComponent(user.email)})?secret=${secret}&issuer=BIDLi`;
          
          // Genera QR code
          const qrCodeDataURL = await generateQRCode(otpauthUrl);
          setQrCodeUrl(qrCodeDataURL);
          
          setTwoFactorStep(1);
        }
        
      } catch (e) {
        alert('Errore nel setup 2FA: ' + e.message);
      } finally {
        setSaving(false);
      }
      
    } else if (twoFactorStep === 1) {
      // Verifica codice
      setSaving(true);
      
      try {
        let isValid = false;
        
        if (selectedMethod === 'sms') {
          const enteredCode = parseInt(securityData.verification_code);
          const expectedCode = window.demoTwoFactorCode;
          isValid = enteredCode === expectedCode;
          
        } else if (selectedMethod === 'totp') {
          // Verifica codice TOTP
          isValid = verifyTOTP(totpSecret, securityData.verification_code);
        }
        
        if (!isValid) {
          alert('Codice non valido');
          setSaving(false);
          return;
        }

        // Abilita 2FA nel database
        const updatedPreferences = {
          ...preferencesData,
          two_factor_enabled: true,
          two_factor_method: selectedMethod,
          two_factor_phone: selectedMethod === 'sms' ? securityData.phone_for_2fa : '',
          totp_secret: selectedMethod === 'totp' ? totpSecret : ''
        };
        
        const { error } = await supabase
          .from("buyer_profiles")
          .update({
            preferences: updatedPreferences,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (error) throw error;
        
        setPreferencesData(updatedPreferences);
        setSecurityData({...securityData, is_2fa_enabled: true});
        setTwoFactorStep(2);
        
        const methodNames = {sms: 'SMS', totp: 'Google Authenticator'};
        alert(`✅ Autenticazione a due fattori abilitata con ${methodNames[selectedMethod]}!`);
        
      } catch (e) {
        alert('Errore nell\'abilitare 2FA: ' + e.message);
      } finally {
        setSaving(false);
      }
    }
  }

  async function disable2FA() {
    if (!confirm('Sei sicuro di voler disabilitare l\'autenticazione a due fattori? Il tuo account sarà meno sicuro.')) {
      return;
    }

    setSaving(true);
    try {
      const updatedPreferences = {
        ...preferencesData,
        two_factor_enabled: false,
        two_factor_phone: ''
      };
      
      const { error } = await supabase
        .from("buyer_profiles")
        .update({
          preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      setPreferencesData(updatedPreferences);
      setSecurityData({
        ...securityData, 
        is_2fa_enabled: false,
        phone_for_2fa: '',
        verification_code: ''
      });
      setTwoFactorStep(0);
      
      alert('Autenticazione a due fattori disabilitata.');
      
    } catch (e) {
      alert('Errore nel disabilitare 2FA: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buyer_profiles")
        .update({
          preferences: preferencesData,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      alert('Preferenze salvate con successo!');
      
    } catch (e) {
      alert('Errore nel salvare le preferenze: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (!confirm('Sei sicuro di voler eliminare il tuo account? Questa azione è irreversibile e perderai tutti i tuoi ordini e dati.')) {
      return;
    }
    
    if (!confirm('ULTIMA CONFERMA: Eliminare definitivamente l\'account BIDLi?')) {
      return;
    }

    try {
      // Prima elimina il profilo
      await supabase
        .from("buyer_profiles")
        .delete()
        .eq("user_id", user.id);
        
      // Poi elimina l'account Supabase (se possibile)
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        // Se non è possibile eliminare via API, comunque fa logout
        await supabase.auth.signOut();
        alert('Account rimosso dai nostri sistemi. Contatta il supporto per completare la cancellazione.');
      }
      
      navigate('/');
      
    } catch (e) {
      alert('Errore nell\'eliminare l\'account: ' + e.message);
    }
  }

  const categories = [
    '👟 Sneakers', '👗 Moda Vintage', '📱 Elettronica', 
    '🎮 Gaming', '🏠 Casa & Design', '💎 Gioielli & Orologi',
    '📚 Libri & Collezioni', '🎨 Arte & Antiquariato'
  ];

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div>Caricamento account...</div>
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
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
          
          {/* Header Account */}
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
              marginBottom: '20px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: 'white',
                fontWeight: '700'
              }}>
                ⚙️
              </div>
              
              <div>
                <h1 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '32px', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Centro Gestione Account
                </h1>
                <div style={{ color: '#6b7280' }}>
                  Gestisci le tue informazioni personali, sicurezza e preferenze
                </div>
              </div>
            </div>

            {/* Account Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
                  👤 Account Attivo
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  Membro dal {new Date(user?.created_at || Date.now()).toLocaleDateString('it-IT')}
                </div>
              </div>
              
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '600' }}>
                  📧 Email Verificata
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  {user?.email}
                </div>
              </div>
              
              <div style={{
                background: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#ca8a04', fontWeight: '600' }}>
                  🏠 Indirizzi Salvati
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>
                  <a href="/account/addresses" style={{ textDecoration: 'none', color: '#ca8a04' }}>
                    Gestisci Indirizzi →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              overflowX: 'auto'
            }}>
              {[
                { id: 'personal', label: '👤 Informazioni Personali', icon: '👤' },
                { id: 'security', label: '🔒 Sicurezza', icon: '🔒' },
                { id: 'preferences', label: '⚙️ Preferenze', icon: '⚙️' },
                { id: 'privacy', label: '🛡️ Privacy', icon: '🛡️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    padding: '16px 24px',
                    background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#6b7280',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '30px' }}>
              
              {/* Tab Informazioni Personali */}
              {activeTab === 'personal' && (
                <div>
                  <h2 style={{ margin: '0 0 24px 0', color: '#1f2937', fontSize: '24px' }}>
                    👤 Informazioni Personali
                  </h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '24px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Nome Display *
                      </label>
                      <input
                        type="text"
                        value={personalData.display_name}
                        onChange={(e) => setPersonalData({...personalData, display_name: e.target.value})}
                        placeholder="Come vuoi essere chiamato"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={personalData.phone}
                        onChange={(e) => setPersonalData({...personalData, phone: e.target.value})}
                        placeholder="+39 123 456 7890"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Data di Nascita
                      </label>
                      <input
                        type="date"
                        value={personalData.date_of_birth}
                        onChange={(e) => setPersonalData({...personalData, date_of_birth: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Email (non modificabile)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px',
                          backgroundColor: '#f9fafb',
                          color: '#6b7280'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '32px' }}>
                    <button
                      onClick={savePersonalInfo}
                      disabled={saving}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Salvando...' : '💾 Salva Modifiche'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Sicurezza */}
              {activeTab === 'security' && (
                <div>
                  <h2 style={{ margin: '0 0 24px 0', color: '#1f2937', fontSize: '24px' }}>
                    🔒 Sicurezza Account
                  </h2>
                  
                  {/* Cambio Email */}
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#1e40af' }}>
                      📧 Cambia Email
                    </h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Email Attuale: <strong>{user?.email}</strong>
                      </div>
                    </div>
                    
                    {emailChangeStep === 0 ? (
                      <div style={{
                        display: 'grid',
                        gap: '16px',
                        maxWidth: '400px'
                      }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                            Nuova Email *
                          </label>
                          <input
                            type="email"
                            value={securityData.new_email}
                            onChange={(e) => setSecurityData({...securityData, new_email: e.target.value})}
                            placeholder="nuova@email.com"
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #d1d5db',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        
                        <button
                          onClick={changeEmail}
                          disabled={saving || !securityData.new_email}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: (saving || !securityData.new_email) ? 0.7 : 1
                          }}
                        >
                          {saving ? 'Inviando...' : '📧 Invia Verifica'}
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        borderRadius: '8px',
                        padding: '16px'
                      }}>
                        <div style={{ color: '#065f46', marginBottom: '8px', fontWeight: '600' }}>
                          ✅ Email di verifica inviata!
                        </div>
                        <div style={{ color: '#374151', fontSize: '14px' }}>
                          Controlla la tua casella di posta e clicca sul link di verifica per completare il cambio.
                        </div>
                        <button
                          onClick={() => setEmailChangeStep(0)}
                          style={{
                            marginTop: '12px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          ← Indietro
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cambio Password */}
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                      🔑 Cambia Password
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gap: '16px',
                      maxWidth: '400px'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                          Nuova Password *
                        </label>
                        <input
                          type="password"
                          value={securityData.new_password}
                          onChange={(e) => setSecurityData({...securityData, new_password: e.target.value})}
                          placeholder="Almeno 6 caratteri"
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
                          Conferma Nuova Password *
                        </label>
                        <input
                          type="password"
                          value={securityData.confirm_password}
                          onChange={(e) => setSecurityData({...securityData, confirm_password: e.target.value})}
                          placeholder="Ripeti la nuova password"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      
                      <button
                        onClick={changePassword}
                        disabled={saving || !securityData.new_password || !securityData.confirm_password}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: (saving || !securityData.new_password) ? 0.7 : 1
                        }}
                      >
                        {saving ? 'Salvando...' : '🔑 Cambia Password'}
                      </button>
                    </div>
                  </div>

                  {/* Autenticazione a Due Fattori */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#15803d' }}>
                      🔐 Autenticazione a Due Fattori (2FA)
                    </h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#374151', 
                        marginBottom: '8px' 
                      }}>
                        Stato: <strong style={{ 
                          color: twoFactorStep === 2 ? '#15803d' : '#dc2626' 
                        }}>
                          {twoFactorStep === 2 ? '✅ Abilitato' : '❌ Disabilitato'}
                        </strong>
                      </div>
                      {twoFactorStep === 2 && (
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Telefono: {securityData.phone_for_2fa}
                        </div>
                      )}
                    </div>
                    
                    {twoFactorStep === 0 && (
                      <div style={{
                        display: 'grid',
                        gap: '20px',
                        maxWidth: '500px'
                      }}>
                        {/* Selezione Metodo */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '16px' }}>
                            🛡️ Scegli il tuo metodo di sicurezza:
                          </label>
                          
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {/* SMS */}
                            <div 
                              onClick={() => setSelectedMethod('sms')}
                              style={{
                                border: `2px solid ${selectedMethod === 'sms' ? '#10b981' : '#e5e7eb'}`,
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                background: selectedMethod === 'sms' ? '#f0fdf4' : 'white',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="radio"
                                  checked={selectedMethod === 'sms'}
                                  onChange={() => setSelectedMethod('sms')}
                                  style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                                    📱 SMS (Codici via Telefono)
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Ricevi codici di verifica tramite SMS al tuo telefono
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Google Authenticator */}
                            <div 
                              onClick={() => setSelectedMethod('totp')}
                              style={{
                                border: `2px solid ${selectedMethod === 'totp' ? '#10b981' : '#e5e7eb'}`,
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                background: selectedMethod === 'totp' ? '#f0fdf4' : 'white',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input
                                  type="radio"
                                  checked={selectedMethod === 'totp'}
                                  onChange={() => setSelectedMethod('totp')}
                                  style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                                    🔐 Google Authenticator (Raccomandato)
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Codici sicuri generati offline dall'app Google Authenticator
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Form basato su metodo selezionato */}
                        {selectedMethod === 'sms' && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                              Numero di Telefono *
                            </label>
                            <input
                              type="tel"
                              value={securityData.phone_for_2fa}
                              onChange={(e) => setSecurityData({...securityData, phone_for_2fa: e.target.value})}
                              placeholder="+39 123 456 7890"
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                        )}
                        
                        {selectedMethod === 'totp' && (
                          <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            padding: '16px'
                          }}>
                            <div style={{ color: '#1e40af', fontWeight: '600', marginBottom: '8px' }}>
                              📲 Preparati con Google Authenticator
                            </div>
                            <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                              1. Scarica <strong>Google Authenticator</strong> sul tuo telefono<br />
                              2. Clicca "Configura" per generare il QR code<br />
                              3. Scansiona il codice con l'app<br />
                              4. Inserisci il primo codice per verificare
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={setup2FA}
                          disabled={saving || (selectedMethod === 'sms' && !securityData.phone_for_2fa)}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '12px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: (saving || (selectedMethod === 'sms' && !securityData.phone_for_2fa)) ? 0.7 : 1
                          }}
                        >
                          {saving ? 'Configurando...' : '🚀 Configura 2FA'}
                        </button>
                      </div>
                    )}
                    
                    {twoFactorStep === 1 && (
                      <div style={{
                        display: 'grid',
                        gap: '20px',
                        maxWidth: '500px'
                      }}>
                        
                        {/* Header basato su metodo */}
                        {selectedMethod === 'sms' ? (
                          <div style={{
                            background: '#fef3c7',
                            border: '1px solid #f59e0b',
                            borderRadius: '12px',
                            padding: '16px'
                          }}>
                            <div style={{ color: '#92400e', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>
                              📱 SMS Inviato!
                            </div>
                            <div style={{ color: '#374151', fontSize: '14px' }}>
                              Controlla il tuo telefono <strong>{securityData.phone_for_2fa}</strong> e inserisci il codice a 6 cifre ricevuto via SMS.
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #3b82f6',
                            borderRadius: '12px',
                            padding: '20px',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#1e40af', fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>
                              🔐 Scansiona il QR Code
                            </div>
                            
                            {qrCodeUrl && (
                              <div style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                marginBottom: '16px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                              }}>
                                <img 
                                  src={qrCodeUrl} 
                                  alt="QR Code per Google Authenticator"
                                  style={{ width: '200px', height: '200px', display: 'block' }}
                                />
                              </div>
                            )}
                            
                            <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>
                              1. Apri <strong>Google Authenticator</strong> sul tuo telefono<br />
                              2. Tocca il "+" per aggiungere un account<br />
                              3. Seleziona "Scansiona codice QR"<br />
                              4. Inquadra questo QR code<br />
                              5. Inserisci il codice a 6 cifre generato dall'app
                            </div>
                          </div>
                        )}
                        
                        {/* Input Codice */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '16px' }}>
                            {selectedMethod === 'sms' ? '📱 Codice SMS *' : '🔐 Codice Google Authenticator *'}
                          </label>
                          <input
                            type="text"
                            value={securityData.verification_code}
                            onChange={(e) => setSecurityData({...securityData, verification_code: e.target.value})}
                            placeholder="123456"
                            maxLength="6"
                            style={{
                              width: '100%',
                              padding: '16px',
                              border: '2px solid #d1d5db',
                              borderRadius: '12px',
                              fontSize: '24px',
                              textAlign: 'center',
                              letterSpacing: '8px',
                              fontWeight: '700',
                              fontFamily: 'monospace'
                            }}
                          />
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            textAlign: 'center',
                            marginTop: '8px'
                          }}>
                            {selectedMethod === 'sms' 
                              ? 'Codice ricevuto via SMS' 
                              : 'Codice dall\'app Google Authenticator (aggiorna ogni 30 secondi)'
                            }
                          </div>
                        </div>
                        
                        {/* Pulsanti */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={() => {
                              setTwoFactorStep(0);
                              setSecurityData({...securityData, verification_code: ''});
                              setQrCodeUrl('');
                            }}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 20px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            ← Indietro
                          </button>
                          
                          <button
                            onClick={setup2FA}
                            disabled={saving || !securityData.verification_code || securityData.verification_code.length !== 6}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 24px',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: saving ? 'not-allowed' : 'pointer',
                              opacity: (saving || !securityData.verification_code || securityData.verification_code.length !== 6) ? 0.7 : 1,
                              flex: 1
                            }}
                          >
                            {saving ? 'Verificando...' : '✅ Verifica e Attiva 2FA'}
                          </button>
                        </div>
                        
                        {/* Info Aggiuntive per TOTP */}
                        {selectedMethod === 'totp' && (
                          <div style={{
                            background: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '12px'
                          }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                              💡 <strong>Suggerimento:</strong> Salva questo QR code o fai screenshot per backup. 
                              Una volta configurato, potrai generare codici anche offline!
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {twoFactorStep === 2 && (
                      <div style={{
                        display: 'grid',
                        gap: '16px'
                      }}>
                        <div style={{
                          background: '#ecfdf5',
                          border: '1px solid #10b981',
                          borderRadius: '8px',
                          padding: '12px'
                        }}>
                          <div style={{ color: '#065f46', fontWeight: '600', marginBottom: '4px' }}>
                            ✅ 2FA Attivo
                          </div>
                          <div style={{ color: '#374151', fontSize: '14px' }}>
                            Il tuo account è protetto dall'autenticazione a due fattori via SMS.
                          </div>
                        </div>
                        
                        <button
                          onClick={disable2FA}
                          disabled={saving}
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            maxWidth: '200px'
                          }}
                        >
                          {saving ? 'Disabilitando...' : '🚫 Disabilita 2FA'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info Sicurezza */}
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '20px'
                  }}>
                    <h3 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>
                      🛡️ Consigli per la Sicurezza
                    </h3>
                    <ul style={{ color: '#374151', paddingLeft: '20px' }}>
                      <li>Usa una password forte con almeno 8 caratteri</li>
                      <li><strong>Abilita sempre l'autenticazione a due fattori (2FA)</strong></li>
                      <li>Non condividere mai la tua password o codici 2FA</li>
                      <li>Fai logout dai dispositivi pubblici</li>
                      <li>Controlla regolarmente i tuoi ordini per attività sospette</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tab Preferenze */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 style={{ margin: '0 0 24px 0', color: '#1f2937', fontSize: '24px' }}>
                    ⚙️ Preferenze Acquisti
                  </h2>
                  
                  {/* Notifiche */}
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                      🔔 Notifiche
                    </h3>
                    
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {[
                        { key: 'email_notifications', label: '📧 Notifiche Email', desc: 'Ricevi aggiornamenti sugli ordini via email' },
                        { key: 'auction_reminders', label: '⏰ Promemoria Aste', desc: 'Avvisi per aste che ti interessano' },
                        { key: 'marketing_emails', label: '📨 Email Marketing', desc: 'Offerte speciali e newsletter' },
                        { key: 'sms_notifications', label: '📱 Notifiche SMS', desc: 'SMS per ordini e spedizioni importanti' }
                      ].map((item) => (
                        <div key={item.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: 'white',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{item.label}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.desc}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferencesData[item.key]}
                            onChange={(e) => setPreferencesData({
                              ...preferencesData,
                              [item.key]: e.target.checked
                            })}
                            style={{ width: '18px', height: '18px' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Categorie Preferite */}
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                      ❤️ Categorie Preferite
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                      Seleziona le categorie che ti interessano di più per ricevere notifiche personalizzate
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '8px'
                    }}>
                      {categories.map((category) => (
                        <div key={category} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: preferencesData.favorite_categories.includes(category) ? '#dbeafe' : 'white',
                          border: `1px solid ${preferencesData.favorite_categories.includes(category) ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const currentFavorites = preferencesData.favorite_categories;
                          const newFavorites = currentFavorites.includes(category)
                            ? currentFavorites.filter(c => c !== category)
                            : [...currentFavorites, category];
                          setPreferencesData({
                            ...preferencesData,
                            favorite_categories: newFavorites
                          });
                        }}>
                          <input
                            type="checkbox"
                            checked={preferencesData.favorite_categories.includes(category)}
                            readOnly
                          />
                          <span style={{ fontSize: '14px' }}>{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Impostazioni Offerte */}
                  <div style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                      💰 Impostazioni Offerte
                    </h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '16px'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                          Limite Massimo Offerta (€)
                        </label>
                        <input
                          type="number"
                          value={preferencesData.max_bid_amount}
                          onChange={(e) => setPreferencesData({
                            ...preferencesData,
                            max_bid_amount: e.target.value
                          })}
                          placeholder="es: 500"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="checkbox"
                          id="auto_bid"
                          checked={preferencesData.auto_bid_enabled}
                          onChange={(e) => setPreferencesData({
                            ...preferencesData,
                            auto_bid_enabled: e.target.checked
                          })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <label htmlFor="auto_bid" style={{ fontWeight: '600' }}>
                          🤖 Abilita Offerte Automatiche
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '32px' }}>
                    <button
                      onClick={savePreferences}
                      disabled={saving}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Salvando...' : '💾 Salva Preferenze'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Privacy */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 style={{ margin: '0 0 24px 0', color: '#1f2937', fontSize: '24px' }}>
                    🛡️ Privacy e Dati
                  </h2>
                  
                  {/* Gestione Dati */}
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#1e40af' }}>
                      📊 I Tuoi Dati
                    </h3>
                    <p style={{ color: '#374151', marginBottom: '16px' }}>
                      Hai il diritto di richiedere, correggere o eliminare i tuoi dati personali in qualsiasi momento.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate('/orders/my')}
                        style={{
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        📋 Esporta I Miei Dati
                      </button>
                      
                      <button
                        onClick={() => navigate('/account/addresses')}
                        style={{
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🏠 Gestisci Indirizzi
                      </button>
                    </div>
                  </div>

                  {/* Eliminazione Account */}
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>
                      ⚠️ Zona Pericolo
                    </h3>
                    <p style={{ color: '#374151', marginBottom: '16px' }}>
                      L'eliminazione dell'account è <strong>permanente e irreversibile</strong>. 
                      Perderai tutti i tuoi ordini, indirizzi e cronologia acquisti.
                    </p>
                    
                    <button
                      onClick={deleteAccount}
                      style={{
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Elimina Account Definitivamente
                    </button>
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
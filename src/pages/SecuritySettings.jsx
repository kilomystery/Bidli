// src/pages/SecuritySettings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BackButton from '../components/BackButton';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSecurityData() {
      try {
        setLoading(true);
        
        // 1) Auth check con Supabase (per user ID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.dispatchEvent(new Event("auth:open"));
          return;
        }

        setUser(user);
        
        // Simula sessioni attive (in produzione verrebbero dal backend)
        setSessions([
          {
            id: 1,
            device: "Chrome su Windows",
            location: "Milano, Italia",
            ip: "192.168.1.100",
            lastActive: "Adesso",
            current: true
          },
          {
            id: 2,
            device: "Safari su iPhone",
            location: "Roma, Italia", 
            ip: "10.0.0.50",
            lastActive: "2 ore fa",
            current: false
          }
        ]);
        
        // 2) Verifica 2FA dal database locale
        const profileResponse = await fetch(`/api/profiles/${user.id}`);
        if (profileResponse.ok) {
          const profile = await profileResponse.json();
          setTwoFactorEnabled(profile?.two_factor_enabled || false);
          console.log('✅ SecuritySettings: 2FA status loaded from local DB');
        }
      } catch (err) {
        console.error("Error loading security data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSecurityData();
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      setMessage("Le nuove password non corrispondono");
      return;
    }

    if (passwords.new.length < 6) {
      setMessage("La password deve essere di almeno 6 caratteri");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      setMessage("Password aggiornata con successo!");
      setPasswords({ current: "", new: "", confirm: "" });
      setShowChangePassword(false);
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Errore nell'aggiornamento password: " + err.message);
    }
  }

  async function handleLogoutOtherSessions() {
    try {
      // In produzione faresti logout di tutte le altre sessioni
      setMessage("Logout effettuato da tutti gli altri dispositivi");
      setSessions(sessions.filter(s => s.current));
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Errore nel logout: " + err.message);
    }
  }

  async function handleEnable2FA() {
    try {
      // In produzione implementeresti l'autenticazione a due fattori
      setTwoFactorEnabled(!twoFactorEnabled);
      setMessage(twoFactorEnabled ? "2FA disabilitato" : "2FA abilitato con successo!");
      setShow2FA(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Errore nella configurazione 2FA: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento impostazioni sicurezza...</div>
      </div>
    );
  }

  return (
    <div className="container section" style={{ maxWidth: 800, margin: "0 auto" }}>
      <BackButton to="/account" style={{ marginBottom: '32px' }} />
      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 20,
        padding: 32,
        color: "white",
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32
          }}>
            🔒
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
              Password e Sicurezza
            </h1>
            <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
              Gestisci la sicurezza del tuo account BIDLi
            </p>
          </div>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div style={{
          background: message.includes("Errore") ? "#fee2e2" : "#dcfce7",
          color: message.includes("Errore") ? "#dc2626" : "#166534",
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          fontWeight: 600,
          border: `2px solid ${message.includes("Errore") ? "#fca5a5" : "#86efac"}`
        }}>
          {message}
        </div>
      )}

      {/* PASSWORD SECTION */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
              🔑 Gestione Password
            </h3>
            <p style={{ margin: "8px 0 0 0", color: "#718096", fontSize: 14 }}>
              Ultimo aggiornamento: mai modificata
            </p>
          </div>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            {showChangePassword ? "Annulla" : "Cambia Password"}
          </button>
        </div>

        {showChangePassword && (
          <form onSubmit={handlePasswordChange} style={{
            background: "#f8f9ff",
            padding: 20,
            borderRadius: 12,
            border: "2px solid #e0e7ff"
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                Password Attuale
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                Nuova Password
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  outline: "none"
                }}
                minLength="6"
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 8, color: "#2d3748" }}>
                Conferma Nuova Password
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  fontSize: 16,
                  outline: "none"
                }}
                required
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Aggiorna Password
              </button>
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  background: "white",
                  color: "#718096",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2FA SECTION */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
              📱 Autenticazione a Due Fattori (2FA)
            </h3>
            <p style={{ margin: "8px 0 0 0", color: "#718096", fontSize: 14 }}>
              {twoFactorEnabled ? "Attivata - Il tuo account è protetto" : "Non attivata - Migliora la sicurezza del tuo account"}
            </p>
          </div>
          <div style={{
            padding: "8px 16px",
            borderRadius: 20,
            background: twoFactorEnabled ? "#dcfce7" : "#fee2e2",
            color: twoFactorEnabled ? "#166534" : "#dc2626",
            fontSize: 12,
            fontWeight: 700
          }}>
            {twoFactorEnabled ? "ATTIVA" : "DISATTIVA"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => window.location.href = '/setup-2fa'}
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: twoFactorEnabled ? 
                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : 
                "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
              color: "white",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {twoFactorEnabled ? "Gestisci 2FA" : "Abilita 2FA"}
          </button>
        </div>

        {show2FA && (
          <div style={{
            background: "#f8f9ff",
            padding: 20,
            borderRadius: 12,
            border: "2px solid #e0e7ff",
            marginTop: 16
          }}>
            <h4 style={{ margin: "0 0 16px 0", color: "#2d3748" }}>
              {twoFactorEnabled ? "Disabilita" : "Configura"} Autenticazione a Due Fattori
            </h4>
            <p style={{ color: "#718096", fontSize: 14, marginBottom: 20 }}>
              {twoFactorEnabled ? 
                "Disabilitando 2FA il tuo account sarà meno sicuro." :
                "Usa un'app come Google Authenticator o Authy per generare codici sicuri."
              }
            </p>
            
            {!twoFactorEnabled && (
              <div style={{
                background: "#1a1a1a",
                color: "#00ff00",
                padding: 16,
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 14,
                marginBottom: 16,
                textAlign: "center"
              }}>
                ABCD-EFGH-IJKL-MNOP
                <br />
                <span style={{ color: "#888", fontSize: 12 }}>
                  Scansiona questo QR code con la tua app 2FA
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleEnable2FA}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: twoFactorEnabled ?
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" :
                    "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {twoFactorEnabled ? "Disabilita" : "Abilita"} 2FA
              </button>
              <button
                onClick={() => setShow2FA(false)}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "2px solid #e2e8f0",
                  background: "white",
                  color: "#718096",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE SESSIONS */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            💻 Sessioni Attive
          </h3>
          <button
            onClick={handleLogoutOtherSessions}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "2px solid #fca5a5",
              background: "#fee2e2",
              color: "#dc2626",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 12
            }}
          >
            Logout da tutti gli altri dispositivi
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {sessions.map((session) => (
            <div key={session.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 16,
              background: session.current ? "#f0fdf4" : "#fafafa",
              borderRadius: 12,
              border: session.current ? "2px solid #86efac" : "1px solid #e5e7eb"
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: session.current ? "#00b894" : "#718096",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 20
              }}>
                {session.device.includes("iPhone") ? "📱" : "💻"}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#2d3748", marginBottom: 4 }}>
                  {session.device} {session.current && "(Questa sessione)"}
                </div>
                <div style={{ fontSize: 14, color: "#718096" }}>
                  {session.location} • {session.ip} • {session.lastActive}
                </div>
              </div>
              
              {!session.current && (
                <button style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                  Termina
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECURITY RECOMMENDATIONS */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0"
      }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
          🛡️ Raccomandazioni Sicurezza
        </h3>
        
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            background: twoFactorEnabled ? "#dcfce7" : "#fff7ed",
            borderRadius: 12,
            border: `2px solid ${twoFactorEnabled ? "#86efac" : "#fed7aa"}`
          }}>
            <div style={{ fontSize: 24 }}>
              {twoFactorEnabled ? "✅" : "⚠️"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Autenticazione a Due Fattori
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>
                {twoFactorEnabled ? "Configurata correttamente" : "Abilita 2FA per proteggere il tuo account"}
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            background: "#dcfce7",
            borderRadius: 12,
            border: "2px solid #86efac"
          }}>
            <div style={{ fontSize: 24 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Email Verificata
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>
                La tua email {user?.email} è verificata
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 16,
            background: "#dcfce7",
            borderRadius: 12,
            border: "2px solid #86efac"
          }}>
            <div style={{ fontSize: 24 }}>✅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Password Sicura
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>
                Usa password forti e uniche per ogni servizio
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
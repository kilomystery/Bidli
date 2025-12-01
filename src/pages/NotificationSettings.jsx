// src/pages/NotificationSettings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    email: {
      marketing: true,
      orders: true,
      live_alerts: true,
      security: true,
      system: true
    },
    push: {
      marketing: false,
      orders: true,
      live_alerts: true,
      security: true,
      system: true
    },
    sms: {
      orders: false,
      live_alerts: false,
      security: true,
      system: false
    }
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        
        if (!uid) {
          setLoading(false);
          return;
        }

        setUser(auth.user);

        // Load user notification settings
        const { data: notifications, error: notificationsError } = await supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", uid);

        if (notificationsError) {
          console.error("Error loading notifications:", notificationsError);
        } else {
          // Convert database format to UI format
          const newSettings = { email: {}, push: {}, sms: {} };
          
          notifications.forEach(notification => {
            newSettings[notification.type] = newSettings[notification.type] || {};
            newSettings[notification.type][notification.category] = notification.enabled;
          });

          // Merge with defaults
          setSettings(prev => ({
            email: { ...prev.email, ...newSettings.email },
            push: { ...prev.push, ...newSettings.push },
            sms: { ...prev.sms, ...newSettings.sms }
          }));
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        setError("Errore nel caricamento delle impostazioni");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;

      if (!uid) {
        setError("Sessione scaduta. Ricarica la pagina.");
        return;
      }

      // Convert UI format to database format
      const notificationRows = [];
      
      Object.keys(settings).forEach(type => {
        Object.keys(settings[type]).forEach(category => {
          notificationRows.push({
            user_id: uid,
            type: type,
            category: category,
            enabled: settings[type][category]
          });
        });
      });

      // Delete existing settings
      await supabase
        .from("user_notifications")
        .delete()
        .eq("user_id", uid);

      // Insert new settings
      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(notificationRows);

      if (insertError) {
        throw insertError;
      }

      setSuccess("Impostazioni notifiche salvate con successo!");
      
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Errore nel salvataggio: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateSetting(type, category, enabled) {
    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [category]: enabled
      }
    }));
  }

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container section" style={{ textAlign: "center", padding: 40 }}>
        <h2>Accesso richiesto</h2>
        <p>Devi effettuare l'accesso per gestire le notifiche.</p>
      </div>
    );
  }

  const notificationTypes = [
    { key: 'email', icon: '📧', name: 'Email' },
    { key: 'push', icon: '📱', name: 'Push' },
    { key: 'sms', icon: '💬', name: 'SMS' }
  ];

  const categories = [
    { key: 'marketing', icon: '📢', name: 'Marketing e promozioni', description: 'Offerte speciali e novità' },
    { key: 'orders', icon: '📦', name: 'Ordini e vendite', description: 'Aggiornamenti su acquisti e vendite' },
    { key: 'live_alerts', icon: '📺', name: 'Live e eventi', description: 'Notifiche per dirette e eventi' },
    { key: 'security', icon: '🔒', name: 'Sicurezza', description: 'Login e modifiche account' },
    { key: 'system', icon: '⚙️', name: 'Sistema', description: 'Aggiornamenti e manutenzione' }
  ];

  return (
    <div className="container section" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* MODERN HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: 20,
        padding: 32,
        color: "white",
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)",
        textAlign: "center"
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 32
        }}>
          🔔
        </div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
          Notifiche
        </h1>
        <p style={{ margin: "12px 0 0 0", fontSize: 16, opacity: 0.9 }}>
          Gestisci come e quando ricevere le notifiche
        </p>
      </div>

      {/* MESSAGES */}
      {error && (
        <div style={{
          background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
          color: "white",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: "linear-gradient(135deg, #00b894 0%, #00a085 100%)",
          color: "white",
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
          border: "none",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          {success}
        </div>
      )}

      {/* NOTIFICATION SETTINGS */}
      <div style={{
        background: "#fff",
        borderRadius: 20,
        padding: 0,
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
        overflow: "hidden"
      }}>
        <div style={{ padding: "24px 24px 16px" }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
            Preferenze di notifica
          </h3>
          <p style={{ margin: "8px 0 0 0", color: "#718096", fontSize: 14 }}>
            Scegli come vuoi essere avvisato per ogni tipo di attività
          </p>
        </div>

        {/* TABLE HEADER */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 16,
          padding: "16px 24px",
          background: "#f9fafb",
          borderTop: "1px solid #f0f0f0",
          borderBottom: "1px solid #f0f0f0"
        }}>
          <div style={{ fontWeight: 600, color: "#374151" }}>Categoria</div>
          {notificationTypes.map(type => (
            <div key={type.key} style={{ 
              fontWeight: 600, 
              color: "#374151",
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 16 }}>{type.icon}</span>
              {type.name}
            </div>
          ))}
        </div>

        {/* NOTIFICATION ROWS */}
        {categories.map((category, index) => (
          <div
            key={category.key}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 16,
              padding: "20px 24px",
              borderBottom: index < categories.length - 1 ? "1px solid #f0f0f0" : "none"
            }}
          >
            <div>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 12,
                marginBottom: 4
              }}>
                <span style={{ fontSize: 20 }}>{category.icon}</span>
                <span style={{ fontWeight: 600, color: "#2d3748" }}>
                  {category.name}
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#718096" }}>
                {category.description}
              </div>
            </div>

            {notificationTypes.map(type => (
              <div key={type.key} style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center" 
              }}>
                <label style={{
                  position: "relative",
                  display: "inline-block",
                  width: 44,
                  height: 24,
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={settings[type.key][category.key] || false}
                    onChange={(e) => updateSetting(type.key, category.key, e.target.checked)}
                    style={{
                      opacity: 0,
                      width: 0,
                      height: 0
                    }}
                  />
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 24,
                    background: settings[type.key][category.key] 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "#e2e8f0",
                    transition: "all 0.2s ease",
                    boxShadow: settings[type.key][category.key]
                      ? "0 2px 8px rgba(102, 126, 234, 0.3)"
                      : "none"
                  }}>
                    <div style={{
                      position: "absolute",
                      height: 18,
                      width: 18,
                      left: settings[type.key][category.key] ? 23 : 3,
                      top: 3,
                      borderRadius: "50%",
                      background: "white",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                    }} />
                  </div>
                </label>
              </div>
            ))}
          </div>
        ))}

        {/* SAVE BUTTON */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "16px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving ? "none" : "0 6px 20px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              {saving ? (
                <>
                  <span style={{ fontSize: 16 }}>⏳</span>
                  Salvataggio...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>💾</span>
                  Salva Preferenze
                </>
              )}
            </button>

            <a 
              href="/account" 
              style={{ 
                color: "#667eea", 
                textDecoration: "none",
                padding: "16px 24px",
                borderRadius: 12,
                background: "rgba(102, 126, 234, 0.1)",
                fontWeight: 500,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <span style={{ fontSize: 16 }}>←</span>
              Torna alle Impostazioni
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
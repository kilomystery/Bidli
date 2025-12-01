import React, { useState, useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase, SITE_URL } from "../lib/supabaseClient";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [tab, setTab] = useState("email");    // email | phone

  // email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // phone/otp
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  // ruolo in signup
  const [role, setRole] = useState("customer"); // customer | seller

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  
  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);

  // Controlla se l'utente arriva da una conferma email
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('confirmed') === 'true') {
      setMsg("✅ Email verificata con successo! Ora puoi accedere al tuo account.");
    }
    
    // Ascolta i cambiamenti di auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Reindirizza alla dashboard se l'utente si logga
        window.location.href = '/dashboard/schedule';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function ensureProfile(userId, patch = {}) {
    if (!userId) return;
    try {
      await supabase.from("profiles").upsert({ id: userId, ...patch });
      if (patch.role === "seller") {
        await supabase.from("sellers").upsert({ user_id: userId });
      }
    } catch (error) {
      console.log("Profile creation error (database might not be ready):", error.message);
      // Non bloccare la registrazione se il profilo non può essere creato
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(""); setErr(""); setLoading(true);
    
    // Verifica CAPTCHA per registrazione
    if (mode === "signup" && tab === "email" && !captchaToken) {
      setErr("🛡️ Completa la verifica CAPTCHA per continuare con la registrazione.");
      setLoading(false);
      return;
    }
    
    try {
      if (tab === "email") {
        if (mode === "signup") {
          // signup email + password
          console.log("Tentativo registrazione con:", { email, role });
          console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
          const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { 
              emailRedirectTo: `${SITE_URL}/auth?confirmed=true`,
              captchaToken // Include token for security
            }
          });
          console.log("Risposta Supabase:", { data, error });
          if (error) throw error;
          const uid = data?.user?.id;
          await ensureProfile(uid, { email, role });
          
          // Reset CAPTCHA after successful signup
          setCaptchaToken(null);
          if (captchaRef.current) {
            captchaRef.current.resetCaptcha();
          }
          
          setMsg("✅ Registrazione completata! Controlla la tua email per verificare l'account e poi potrai accedere.");
          setLoading(false);
          return;
        } else {
          // signin email + password
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          location.href = "/";
        }
      } else {
        // telefono + OTP
        if (mode === "signup") {
          const { error } = await supabase.auth.signInWithOtp({ phone, channel: "sms" });
          if (error) throw error;
          setMsg("Ti abbiamo inviato un codice via SMS. Inseriscilo e premi 'Verifica'.");
        } else {
          const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
          if (error) throw error;
          const { data: { user } } = await supabase.auth.getUser();
          await ensureProfile(user?.id, { phone, role: "customer" });
          location.href = "/";
        }
      }
    } catch (e) {
      console.error("Errore durante registrazione:", e);
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="container" style={{ padding: 16, maxWidth: 560 }}>
        <h1 style={{ marginBottom: 6 }}>{mode === "signup" ? "Crea account" : "Accedi"}</h1>
        <div className="seller-tabs" style={{ marginBottom: 10 }}>
          <button className={`tab ${tab === "email" ? "active" : ""}`} onClick={() => setTab("email")}>Email</button>
          <button className={`tab ${tab === "phone" ? "active" : ""}`} onClick={() => setTab("phone")}>Telefono</button>
        </div>

        <form onSubmit={onSubmit} className="cards" style={{ marginTop: 10 }}>
          <div className="live-mini">
            {tab === "email" ? (
              <>
                <label className="meta">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />

                <label className="meta" style={{ marginTop: 8 }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={mode==="signin"} />
                <div className="meta" style={{ marginTop: 6 }}>
                  In registrazione è richiesto email + password; il link di verifica arriva via email.
                </div>
              </>
            ) : (
              <>
                <label className="meta">Telefono (es. +39…)</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required />
                {mode === "signin" && (
                  <>
                    <label className="meta" style={{ marginTop: 8 }}>Codice OTP</label>
                    <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6 cifre" />
                  </>
                )}
              </>
            )}

            {mode === "signup" && (
              <div style={{ marginTop: 12 }}>
                <label className="meta">Tipo account</label>
                <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                  <label><input type="radio" name="role" checked={role === "customer"} onChange={() => setRole("customer")} /> Acquirente</label>
                  <label><input type="radio" name="role" checked={role === "seller"} onChange={() => setRole("seller")} /> Venditore</label>
                </div>
                <div className="meta" style={{ marginTop: 6 }}>
                  Potrai diventare venditore anche dopo, da “Diventa venditore”.
                </div>
              </div>
            )}

            {/* CAPTCHA - Solo per registrazione email */}
            {mode === "signup" && tab === "email" && (
              <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ 
                  marginBottom: "12px", 
                  fontSize: "14px", 
                  color: "#374151",
                  fontWeight: "600"
                }}>
                  🛡️ Verifica di sicurezza
                </div>
                <HCaptcha
                  ref={captchaRef}
                  sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    console.log("✅ CAPTCHA verificato");
                  }}
                  onExpire={() => {
                    setCaptchaToken(null);
                    console.log("⚠️ CAPTCHA scaduto");
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    console.log("❌ CAPTCHA errore");
                  }}
                  size="normal"
                  theme="light"
                />
                {!captchaToken && (
                  <div style={{ 
                    fontSize: "12px", 
                    color: "#9ca3af",
                    textAlign: "center",
                    marginTop: "8px"
                  }}>
                    Completa la verifica per continuare
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button 
                className="btn btn-primary" 
                disabled={loading || (mode === "signup" && tab === "email" && !captchaToken)}
                style={{
                  opacity: (loading || (mode === "signup" && tab === "email" && !captchaToken)) ? 0.6 : 1,
                  cursor: (loading || (mode === "signup" && tab === "email" && !captchaToken)) ? "not-allowed" : "pointer"
                }}
              >
                {loading 
                  ? "⏳ Caricamento..." 
                  : mode === "signup" && tab === "email"
                    ? (captchaToken ? "✅ Registrati" : "🛡️ Completa CAPTCHA")
                    : mode === "signup" 
                      ? "Registrati"
                      : (tab === "phone" ? "Verifica / Accedi" : "Accedi")
                }
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                {mode === "signup" ? "Hai già un account? Accedi" : "Nuovo utente? Registrati"}
              </button>
            </div>

            {msg && <div style={{ color: "green", marginTop: 10 }}>{msg}</div>}
            {err && <div style={{ color: "crimson", marginTop: 10 }}>{err}</div>}
          </div>
        </form>
      </main>
      <Footer />
    </>
  );
}
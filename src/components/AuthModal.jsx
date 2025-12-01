// src/components/AuthModal.jsx
import React, { useEffect, useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "../lib/supabaseClient";
import { forceRoleUpdate } from "../lib/globalRole";

const S = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  card: {
    width: "100%", maxWidth: 520, background: "#fff",
    borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,.25)",
    padding: 24, position: "relative", maxHeight: "90vh", overflowY: "auto",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  close: {
    position: "absolute", top: 12, right: 12,
    width: 36, height: 36, borderRadius: 999, border: "1px solid #eaeaea",
    background: "#fff", cursor: "pointer", fontSize: 18,
  },
  h1: { margin: "0 0 12px", fontSize: 28, fontWeight: 800 },
  tabs: { display: "flex", gap: 8, marginBottom: 12 },
  tabBtn: (active) => ({
    flex: 1, height: 42, borderRadius: 10, border: "1px solid #e8e8f0",
    background: active ? "#111" : "#f6f6fb", color: active ? "#fff" : "#111",
    fontWeight: 600, cursor: "pointer",
  }),
  social: { display: "grid", gap: 10, margin: "12px 0" },
  socialBtn: { 
    display: "flex", alignItems: "center", gap: 10,
    border: "1px solid #e8e8f0", borderRadius: 12, height: 48,
    padding: "0 14px", background: "#fff", cursor: "pointer",
  },
  orWrap: { position: "relative", textAlign: "center", margin: "14px 0" },
  orLine: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "#eee" },
  orTxt: { position: "relative", display: "inline-block", padding: "0 8px", background: "#fff", color: "#888" },
  mode: { display: "flex", gap: 8, marginBottom: 10 },
  modeBtn: (active) => ({
    flex: 1, height: 40, borderRadius: 10, border: "1px solid #e8e8f0",
    background: active ? "#6e3aff" : "#fff", color: active ? "#fff" : "#111",
    fontWeight: 700, cursor: "pointer",
  }),
  input: {
    height: 44, borderRadius: 10, border: "1px solid #e8e8f0",
    padding: "0 12px", outline: "none",
  },
  smallRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#333" },
  checkbox: { width: 16, height: 16, accentColor: "#6e3aff" },
  error: { color: "crimson", fontSize: 14, marginTop: 6 },
  submit: {
    height: 46, borderRadius: 12, background: "#6e3aff",
    color: "#fff", border: 0, fontWeight: 800, cursor: "pointer",
    marginTop: 6,
  },
  link: { color: "#6e3aff", textDecoration: "none", fontWeight: 600 },
  avatarRow: { display: "flex", gap: 16, marginTop: 6, marginBottom: 8 },
  ava: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  avaImg: { width: 64, height: 64, borderRadius: "50%", border: "3px solid #7c4dff" },
  handle: { fontSize: 12, color: "#555" },
};

export default function AuthModal({ isOpen, open, onClose }) {
  const visible = typeof isOpen !== "undefined" ? isOpen : open;
  const [tab, setTab] = useState("email");            // email | phone
  const [mode, setMode] = useState("login");          // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  // const [acceptCookies, setAcceptCookies] = useState(false); // RIMOSSO!
  const [captchaToken, setCaptchaToken] = useState(null);
  const [role, setRole] = useState("customer"); // customer | seller
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const captchaRef = useRef(null);

  // Apri il modal da qualsiasi punto: window.dispatchEvent(new Event("auth:open"))
  useEffect(() => {
    const opener = () => {
      console.log('🚀 AuthModal: auth:open event ricevuto, aprendo modal');
      _setVisibleInternal(true);
    };
    const closer = () => {
      console.log('🚪 AuthModal: auth:close event ricevuto, chiudendo modal');
      _setVisibleInternal(false);
    };
    window.addEventListener("auth:open", opener);
    window.addEventListener("auth:close", closer);
    return () => {
      window.removeEventListener("auth:open", opener);
      window.removeEventListener("auth:close", closer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gestione visibilità controllata vs interna
  const [visibleInternal, _setVisibleInternal] = useState(!!visible);
  useEffect(() => {
    if (typeof isOpen !== "undefined") {
      _setVisibleInternal(!!isOpen);
    }
  }, [isOpen, open]);

  useEffect(() => {
    function onKey(e){ if(e.key === "Escape") onClose?.(); }
    if (visibleInternal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visibleInternal, onClose]);

  if (!visibleInternal) return null;

  function close() {
    console.log('✅ AuthModal: Chiusura modal tramite close()');
    _setVisibleInternal(false);
    onClose?.();
    // Dispatch anche l'evento di chiusura per consistenza
    window.dispatchEvent(new CustomEvent("auth:close"));
  }

  function setReturnTo() {
    const rt = window.location.pathname + window.location.search;
    sessionStorage.setItem("returnTo", rt);
  }

  const callbackUrl = `${window.location.origin}/auth/callback`;

  async function signInWithGoogle() {
    try {
      setBusy(true);
      setError("");
      setReturnTo();
      
      // URL callback corretto per OAuth
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) throw error;
      // Il redirect avviene automaticamente, non chiudiamo il modal
    } catch (e) {
      setError(e.message || "Errore accesso con Google");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithApple() {
    try {
      setBusy(true);
      setError("");
      setReturnTo();
      
      // URL callback corretto per OAuth
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      if (error) throw error;
      // Il redirect avviene automaticamente, non chiudiamo il modal
    } catch (e) {
      setError(e.message || "Errore accesso con Apple");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!acceptTerms) { setError("Devi accettare Termini e Privacy."); return; }
    // Verifica CAPTCHA solo per registrazione
    if (mode === "signup" && !captchaToken) { 
      setError("🛡️ Completa la verifica CAPTCHA per continuare."); 
      return; 
    }

    try {
      setBusy(true);
      setReturnTo();

      if (mode === "signup") {
        // REGISTRAZIONE CON EMAIL VERIFICATION - USA DOMINIO DINAMICO
        const currentDomain = window.location.origin;
        const developCallback = `${currentDomain}/auth/callback`;
        
        console.log('📧 Registrazione Email Debug:', { 
          email, 
          domain: currentDomain, 
          callback: developCallback,
          note: 'CONTROLLA CHE SIA CONFIGURATO IN SUPABASE AUTH SETTINGS'
        });
        
        setSuccess("🚀 Registrazione in corso...");
        
        // Piccola pausa per mostrare feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { 
            emailRedirectTo: developCallback, // USA DOMINIO DINAMICO
            captchaToken,
          }
        });
        
        console.log('📧 Supabase signUp Response:', { 
          hasUser: !!data?.user, 
          userEmail: data?.user?.email,
          userConfirmed: data?.user?.email_confirmed_at,
          error: error?.message,
          session: !!data?.session
        });
        
        if (error) {
          if (error.message.includes('rate limit')) {
            setError(`⏰ TROPPI TENTATIVI! Aspetta 5-10 minuti prima di riprovare.`);
          } else {
            setError(`❌ ERRORE: ${error.message}`);
          }
          throw error;
        }
        
        if (data?.user) {
          setSuccess("✅ Email di verifica inviata! Controlla la tua casella email.");
          
          // Pulizia form
          setEmail("");
          setPassword("");
          setAcceptTerms(false);
          setCaptchaToken(null);
          captchaRef.current?.resetCaptcha?.();
          
          // Chiudi il modal dopo un po'
          setTimeout(() => close(), 3000);
        }
      } else {
        // login con password -> sessione immediata
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // ✅ Aggiorna sistema ruoli globale
        await forceRoleUpdate();
        
        close();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePhone(e) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
        if (error) throw error;
        
        // ✅ Aggiorna sistema ruoli globale
        await forceRoleUpdate();
      }
      close();
    } catch (err) { setError(err.message); }
  }

  function GoogleIcon(){
    return (
      <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 5.2 29.3 3 24 3 12.3 3 3 12.3 3 24s9.3 21 21 21c10.8 0 19.8-7.8 21-18v-6.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 16.2 18.8 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 5.2 29.3 3 24 3 16 3 9.1 7.6 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.3 36 26.8 37 24 37c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.1 40.4 16 45 24 45z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.2 3.5-4.7 6-8.3 6-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.1 40.4 16 45 24 45c10.8 0 19.8-7.8 21-18v-6.5z"/>
      </svg>
    );
  }
  function AppleIcon(){
    return (
      <svg width="18" height="18" viewBox="0 0 448 512" fill="#000">
        <path d="M350.5 129.3c-16.7 19.6-40.4 34.8-65 33.1-3.1-25 8.8-50.7 24.8-67.3 17.6-18.6 46.9-32.6 70.8-33.8 2.8 25.2-7.7 52.2-30.6 68zM403.3 303.4c-.6-62.7 51.3-92.6 53.7-93.9-29.2-42.6-74.6-48.4-90.7-49.1-38.6-3.9-75.3 22.6-94.8 22.6-19.5 0-49.7-22-81.6-21.4-42.1.6-80.8 24.5-102.3 62.2-43.6 75.2-11.2 186.5 31.3 247.5 20.8 29.9 45.6 63.6 78.2 62.4 31.5-1.2 43.4-20.2 81.5-20.2 38.1 0 48.9 20.2 81.8 19.6 33.9-.6 55.4-30.5 76.2-60.4 23.9-35 33.7-68.9 34.2-70.6-.8-.3-65.7-25.3-66-100.7z"/>
      </svg>
    );
  }

  return (
    <div
      style={S.overlay}
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) close(); }}
    >
      <div style={S.card} role="dialog" aria-modal="true">
        <button style={S.close} onClick={close} aria-label="Chiudi">✕</button>

        <h1 style={S.h1}>Accedi</h1>

        {/* Tabs Email / Telefono */}
        <div style={S.tabs}>
          <button style={S.tabBtn(tab==="email")} onClick={()=>setTab("email")}>Email</button>
          <button style={S.tabBtn(tab==="phone")} onClick={()=>setTab("phone")}>Telefono</button>
        </div>

        {/* Social */}
        <div style={S.social}>
          <button className="btn btn-ghost" style={S.socialBtn} onClick={signInWithGoogle} disabled={busy}>
            <GoogleIcon/><span>Continua con Google</span>
          </button>
          <button className="btn btn-ghost" style={S.socialBtn} onClick={signInWithApple} disabled={busy}>
            <AppleIcon/><span>Continua con Apple</span>
          </button>
        </div>

        {/* “Oppure” */}
        <div style={S.orWrap}>
          <div style={S.orLine}></div>
          <span style={S.orTxt}>oppure</span>
        </div>

        {/* MODE */}
        <div style={S.mode}>
          <button style={S.modeBtn(mode==="login")} onClick={()=>setMode("login")}>Accedi</button>
          <button style={S.modeBtn(mode==="signup")} onClick={()=>setMode("signup")}>Registrati</button>
        </div>

        {/* EMAIL */}
        {tab==="email" && (
          <form onSubmit={handleEmail} style={{display:"grid", gap:10}}>
            <input style={S.input} type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            <input style={S.input} type="password" placeholder="Password (minimo 6 caratteri)" value={password} minLength={6} onChange={(e)=>setPassword(e.target.value)} required />

            {/* SCELTA ACQUIRENTE/VENDITORE RIMOSSA! Ora è nel Form Unificato! */}
            <label style={S.smallRow}>
              <input type="checkbox" style={S.checkbox} checked={acceptTerms} onChange={(e)=>setAcceptTerms(e.target.checked)} />
              Accetto <a href="/terms" style={S.link}>Termini</a> e <a href="/privacy" style={S.link}>Privacy</a>
            </label>

            {/* hCaptcha - Sicurezza attivata */}
            <div style={{marginTop: 16, marginBottom: 16}}>
              <HCaptcha
                ref={captchaRef}
                sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000001"}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div>

            {error && <div style={S.error}>{error}</div>}
            {success && <div style={{ color: "#28a745", fontSize: 14, marginTop: 10, marginBottom: 10, padding: 12, backgroundColor: "#f8f9fa", border: "1px solid #d4edda", borderRadius: 6 }}>{success}</div>}
            <button type="submit" className="btn btn-viola" style={S.submit} disabled={busy}>
              {mode==="login" ? "Accedi" : "Registrati"}
            </button>
          </form>
        )}

        {/* PHONE */}
        {tab==="phone" && (
          <form onSubmit={handlePhone} style={{display:"grid", gap:10}}>
            <input style={S.input} type="tel" placeholder="Telefono (es. +39…)" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
            {mode==="login" && (
              <input style={S.input} type="text" placeholder="Codice OTP" value={otp} onChange={(e)=>setOtp(e.target.value)} />
            )}
            {error && <div style={S.error}>{error}</div>}
            <button type="submit" style={S.submit} disabled={busy}>
              {mode==="login" ? "Verifica / Accedi" : "Registrati"}
            </button>
          </form>
        )}

        {/* avatar demo (opzionale, per dare “feeling” social) */}
        <div style={S.avatarRow}>
          <div style={S.ava}>
            <img style={S.avaImg} src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&auto=format" alt="" />
            <span style={S.handle}>@denim_lab</span>
          </div>
          <div style={S.ava}>
            <img style={S.avaImg} src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=128&h=128&fit=crop&auto=format" alt="" />
            <span style={S.handle}>@luca_mot…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
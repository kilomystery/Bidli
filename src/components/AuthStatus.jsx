import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthStatus() {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  // leggi sessione corrente
  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    }
    load();

    // ascolta cambiamenti auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) return <span style={{ color: "#666" }}>…</span>;

  if (email) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: "#555" }}>Ciao, {email}</span>
        <button onClick={signOut} style={{ height: 32, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <a href="/auth" style={{ fontSize: 14, color: "#6e3aff" }}>
      Accedi
    </a>
  );
}
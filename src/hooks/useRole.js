// src/hooks/useRole.js
// Hook React per leggere ruoli dal sistema globale unificato

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useRole() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        // ✅ USA SOLO PROFILES.ROLE - SEMPLICE E AFFIDABILE
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        const detectedRole = profile?.role || "buyer";
        setRole(detectedRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error("useRole refresh error:", error);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        // ✅ USA SOLO PROFILES.ROLE - SEMPLICE E AFFIDABILE
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        const detectedRole = profile?.role || "buyer";
        setRole(detectedRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, role, loading, refresh };
}
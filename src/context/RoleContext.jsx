import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const RoleContext = createContext({
  user: null,
  role: "guest",     // 'guest' | 'customer' | 'seller'
  loading: true,
  refresh: async () => {},
});

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!mounted) return;
        setUser(u ?? null);

        if (u?.id) {
          const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", u.id).maybeSingle();
          if (seller?.id) {
            setRole("seller");
          } else {
            const { data: buyer } = await supabase.from("buyer_profiles").select("id").eq("user_id", u.id).maybeSingle();
            setRole(buyer?.id ? "customer" : "guest");
          }
        } else {
          setRole("guest");
        }
      } catch (e) {
        console.error("RoleProvider bootstrap error:", e);
        setRole("guest");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
      refresh();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const refresh = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      if (u?.id) {
        const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", u.id).maybeSingle();
        if (seller?.id) setRole("seller");
        else {
          const { data: buyer } = await supabase.from("buyer_profiles").select("id").eq("user_id", u.id).maybeSingle();
          setRole(buyer?.id ? "customer" : "guest");
        }
      } else setRole("guest");
    } catch (e) {
      console.error("RoleProvider refresh error:", e);
      setRole("guest");
    }
  };

  const value = useMemo(() => ({ user, role, loading, refresh }), [user, role, loading]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
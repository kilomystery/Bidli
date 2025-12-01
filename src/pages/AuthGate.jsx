import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthGate({ children, requireSeller = false }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        location.href = "/auth";
        return;
      }
      if (requireSeller) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.role !== "seller") {
          location.href = "/dashboard";
          return;
        }
      }
      setOk(true);
    })();
  }, [requireSeller]);

  if (!ok) return null; // o loader
  return <>{children}</>;
}
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// ⬇️ usa lo stesso AuthModal che già avevi nel progetto
// Se il percorso è diverso, aggiorna la import qui sotto.
import AuthModal from "./AuthModal";

export default function AuthModalBridge() {
  const [open, setOpen] = useState(false);

  // apre/chiude da qualunque punto della app
  useEffect(() => {
    const openH = () => setOpen(true);
    const closeH = () => setOpen(false);
    window.addEventListener("auth:open", openH);
    window.addEventListener("auth:close", closeH);
    return () => {
      window.removeEventListener("auth:open", openH);
      window.removeEventListener("auth:close", closeH);
    };
  }, []);

  // se il login va a buon fine, chiudo il modal
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setOpen(false);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  if (!open) return null;
  return <AuthModal isOpen={open} onClose={() => setOpen(false)} />;
}
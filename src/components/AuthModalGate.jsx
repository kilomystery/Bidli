// src/components/AuthModalGate.jsx
import React, { useEffect, useState } from "react";

// ⚠️ importa il TUO AuthModal
// Se il path è diverso, cambialo qui:
import AuthModal from "./AuthModal";

export default function AuthModalGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    window.addEventListener("auth:open", onOpen);
    window.addEventListener("auth:close", onClose);
    return () => {
      window.removeEventListener("auth:open", onOpen);
      window.removeEventListener("auth:close", onClose);
    };
  }, []);

  // Monta sempre il modal; decide lui se mostrare un overlay ecc.
  return (
    <AuthModal
      open={open}
      isOpen={open}
      visible={open}
      onClose={() => setOpen(false)}
      onRequestClose={() => setOpen(false)}
      setOpen={setOpen}
      setIsOpen={setOpen}
    />
  );
}
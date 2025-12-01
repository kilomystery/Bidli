import React, { useState } from "react";
import { forceUpgradeToSeller } from "../services/roleService";
import { useNavigate } from "react-router-dom";

export default function UpgradeToSellerButton({ defaultStoreName = "" }) {
  const [open, setOpen] = useState(false);
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onConfirm() {
    setLoading(true);
    setErr("");
    try {
      await forceUpgradeToSeller({ store_name: storeName || "My Store" });
      setOpen(false);
      // vai subito nell’ecosistema venditore
      navigate("/seller-dashboard");
    } catch (e) {
      console.error("[UpgradeToSellerButton] errore:", e);
      setErr(e?.message || "Errore durante upgrade a venditore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid rgba(64,224,208,.35)",
          background:
            "linear-gradient(180deg, rgba(64,224,208,.15), rgba(64,224,208,.08))",
          color: "#40e0d0",
          fontWeight: 700,
        }}
      >
        🚀 Diventa venditore
      </button>

      {!open ? null : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.6)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
          }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              background: "#0f172a",
              border: "1px solid rgba(64,224,208,.3)",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <h3 style={{ color: "#fff", margin: 0, marginBottom: 12 }}>
              Crea il tuo negozio
            </h3>
            <p style={{ color: "#94a3b8", marginTop: 0 }}>
              Inserisci un nome negozio (puoi cambiarlo dopo).
            </p>

            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Es. Vintage Milan"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,.35)",
                background: "rgba(148,163,184,.08)",
                color: "#fff",
                outline: "none",
              }}
            />

            {err && (
              <div
                style={{
                  marginTop: 10,
                  color: "#ef4444",
                  background: "rgba(239,68,68,.12)",
                  border: "1px solid rgba(239,68,68,.35)",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                {err}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,.35)",
                  background: "transparent",
                  color: "#cbd5e1",
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading || !storeName.trim()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(64,224,208,.35)",
                  background:
                    "linear-gradient(180deg, rgba(64,224,208,.25), rgba(64,224,208,.15))",
                  color: "#0f172a",
                  fontWeight: 800,
                  opacity: loading || !storeName.trim() ? 0.6 : 1,
                  cursor:
                    loading || !storeName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creazione…" : "Conferma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function StoryViewer({
  stories = [],
  index = 0,
  open = false,
  onClose,
  onNext,
  onPrev,
}) {
  const s = stories[index];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") onNext?.();
      if (e.key === "ArrowLeft") onPrev?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onNext, onPrev]);

  if (!open || !s) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(0,0,0,0.96)",
        color: "#fff",
      }}
    >
      {/* top bar */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          zIndex: 2,
        }}
      >
        <Link
          to={`/seller/${s.seller_handle || ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <img
            src={s.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${s.seller_display_name || s.seller_handle || "v"}`}
            alt=""
            style={{ width: 34, height: 34, borderRadius: "50%" }}
          />
          <div style={{ fontWeight: 600 }}>
            @{s.seller_handle || s.seller_display_name}
          </div>
        </Link>
        <button
          onClick={onClose}
          aria-label="Chiudi"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: 0,
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* media full-screen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
        }}
      >
        {s.type === "video" ? (
          <video
            src={s.media}
            autoPlay
            muted
            controls={false}
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <img
            src={s.media}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
      </div>

      {/* nav arrows (desktop/tablet) */}
      <button
        onClick={onPrev}
        aria-label="Precedente"
        style={{
          position: "absolute",
          left: 6,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: 0,
          fontSize: 28,
          color: "rgba(255,255,255,0.9)",
          cursor: "pointer",
        }}
      >
        ‹
      </button>
      <button
        onClick={onNext}
        aria-label="Successiva"
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: 0,
          fontSize: 28,
          color: "rgba(255,255,255,0.9)",
          cursor: "pointer",
        }}
      >
        ›
      </button>

      {/* reazione cuore in basso */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <button
          onClick={() => console.log("❤️ like story", s.id)}
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ❤️
        </button>
      </div>
    </div>
  );
}
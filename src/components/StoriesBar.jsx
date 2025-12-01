import React from "react";
import { Link } from "react-router-dom";

export default function StoriesBar({ stories = [], onOpen }) {
  if (!stories.length) return null;

  return (
    <div className="container" style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "8px 2px" }}>
        {stories.map((s, i) => {
          const isSponsored = s.sponsored || s.is_sponsored;
          
          return (
            <button
              key={s.id || s.seller_handle || i}
              onClick={() => onOpen(i)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 74,
                background: "transparent",
                border: 0,
                cursor: "pointer",
                position: "relative"
              }}
            >
              {/* Badge sponsorizzata */}
              {isSponsored && (
                <div style={{
                  position: "absolute",
                  top: -4,
                  right: 4,
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 10,
                  zIndex: 2,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>
                  ✨
                </div>
              )}
              
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  padding: 2,
                  background: isSponsored 
                    ? "conic-gradient(#fbbf24, #f59e0b, #fbbf24, #f59e0b)" // Anello dorato per sponsorizzate
                    : "conic-gradient(#a855f7, #7c3aed, #06b6d4, #a855f7)", // anello colorato normale
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#111",
                  }}
                >
                  <img
                    src={s.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${s.seller_display_name || s.seller_handle || "v"}`}
                    alt={s.seller_display_name || s.seller_handle}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  marginTop: 6,
                  maxWidth: 72,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  color: isSponsored ? "#f59e0b" : "#40e0d0",
                  fontWeight: isSponsored ? 700 : 400
                }}
                title={s.seller_display_name || s.seller_handle}
              >
                @{s.seller_handle || s.seller_display_name}
                {isSponsored && " ✨"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

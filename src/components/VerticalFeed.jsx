import React, { useRef } from "react";

export default function VerticalFeed({ items = [], onOpen }) {
  const ref = useRef(null);
  return (
    <div ref={ref} style={styles.feed}>
      {items.map((it) => (
        <section key={it.id} style={styles.snap}>
          <div style={styles.player}>
            <div style={styles.overlay}>
              <div style={styles.title}>{it.title}</div>
              <div style={styles.sub}>@{it.seller} • {it.category}</div>
              <div style={styles.actions}>
                <button style={styles.btn} onClick={() => onOpen?.(it)}>Entra ora</button>
                <button style={styles.btnGhost}>Segui</button>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

const styles = {
  feed: { height: "calc(100vh - 56px)", overflowY: "auto", scrollSnapType: "y mandatory" },
  snap: { scrollSnapAlign: "start", minHeight: "calc(100vh - 56px)" },
  player: { position: "relative", height: "100%", background: "#000", backgroundImage: "radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 60%)" },
  overlay: { position: "absolute", left: 12, right: 12, bottom: 12, color: "#fff" },
  title: { fontWeight: 900, fontSize: 18, color: "#40e0d0", textShadow: "0 0 12px rgba(64, 224, 208, 0.6)" },
  sub: { marginTop: 4, color: "#40e0d0", fontSize: 13, opacity: 0.8 },
  actions: { marginTop: 10, display: "flex", gap: 8 },
  btn: { background: "#6e3aff", color: "#fff", border: 0, borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", borderRadius: 10, padding: "10px 14px", cursor: "pointer" },
};
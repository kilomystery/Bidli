// src/pages/dashboard/Content.jsx
import React from "react";

export default function Content() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Contenuti</h2>
      <div className="top-actions" style={{ marginBottom:10 }}>
        <button className="btn primary">+ Nuovo post</button>
        <button className="btn">+ Nuova story</button>
      </div>

      <div className="card">
        <div className="muted">Griglia post (coming soon)</div>
        <div style={{ height:180, background:"#fafafa", border:"1px dashed #ddd", borderRadius:10 }} />
      </div>
    </div>
  );
}
import React from "react";
import { CATEGORIES } from "../constants/categories";

export default function CategoryPills({ active, onPick }) {
  return (
    <div style={styles.wrap}>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          onClick={() => onPick?.(c.id)}
          style={{ ...styles.pill, ...(active === c.id ? styles.active : {}) }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", gap: 8, overflowX: "auto", padding: "8px 2px 0", WebkitOverflowScrolling: "touch" },
  pill: { whiteSpace: "nowrap", border: "1px solid #e8e8ee", background: "#fff", borderRadius: 999, padding: "10px 14px", fontSize: 14, cursor: "pointer" },
  active: { borderColor: "#6e3aff", color: "#6e3aff", fontWeight: 600 },
};
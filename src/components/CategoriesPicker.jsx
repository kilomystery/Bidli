import React from "react";

export default function CategoriesPicker({ onChoose }) {

  return (
    <div className="cat-picker" style={{ position: "relative" }}>
      <button 
        className="btn btn-viola" 
        onClick={() => window.location.href = '/categories'}
      >
        Scegli categoria
      </button>
    </div>
  );
}
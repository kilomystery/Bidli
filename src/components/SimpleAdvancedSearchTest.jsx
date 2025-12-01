// src/components/SimpleAdvancedSearchTest.jsx
// Componente di test per mostrare la ricerca avanzata

import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import AdvancedSearch from './AdvancedSearch';

export default function SimpleAdvancedSearchTest() {
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  return (
    <>
      {/* Floating Button for Advanced Search */}
      <button
        onClick={() => setShowAdvancedSearch(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#40e0d0',
          color: '#0f172a',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          zIndex: 999,
          boxShadow: '0 10px 30px rgba(64, 224, 208, 0.5)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
        }}
        title="Ricerca Avanzata"
      >
        <Filter size={24} />
      </button>

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} />
      )}
    </>
  );
}
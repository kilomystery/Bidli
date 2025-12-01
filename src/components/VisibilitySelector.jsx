// src/components/VisibilitySelector.jsx
import React, { useState, useRef, useEffect } from 'react';

const VisibilitySelector = ({ value = 'public', onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const visibilityOptions = [
    {
      value: 'public',
      label: 'Pubblico',
      description: 'Chiunque può vedere questo post',
      icon: '🌍'
    },
    {
      value: 'followers_only',
      label: 'Solo seguaci',
      description: 'Solo i tuoi seguaci possono vedere',
      icon: '👥'
    },
    {
      value: 'private',
      label: 'Privato',
      description: 'Solo tu puoi vedere questo post',
      icon: '🔒'
    }
  ];

  const selectedOption = visibilityOptions.find(opt => opt.value === value) || visibilityOptions[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef}
      className={`visibility-selector ${className}`} 
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #dbdbdb',
          borderRadius: 8,
          background: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s'
        }}
        onFocus={(e) => e.target.style.borderColor = '#0095f6'}
        onBlur={(e) => e.target.style.borderColor = '#dbdbdb'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>{selectedOption.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, color: '#262626' }}>
              {selectedOption.label}
            </div>
            <div style={{ fontSize: 12, color: '#8e8e8e', marginTop: 2 }}>
              {selectedOption.description}
            </div>
          </div>
        </div>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <path 
            d="M6 9L12 15L18 9" 
            stroke="#8e8e8e" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #dbdbdb',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: 4,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {visibilityOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: option.value === value ? '#f8f9fa' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 14,
                fontFamily: 'inherit',
                textAlign: 'left',
                borderBottom: index < visibilityOptions.length - 1 ? '1px solid #efefef' : 'none',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.target.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 16 }}>{option.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: option.value === value ? 600 : 500, 
                  color: '#262626' 
                }}>
                  {option.label}
                </div>
                <div style={{ fontSize: 12, color: '#8e8e8e', marginTop: 2 }}>
                  {option.description}
                </div>
              </div>
              {option.value === value && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M20 6L9 17L4 12" 
                    stroke="#0095f6" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VisibilitySelector;
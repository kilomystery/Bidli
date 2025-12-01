// src/components/AdvancedSearch.jsx
// Ricerca avanzata con filtri multipli per venditori, live e categorie

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Star, 
  Clock, 
  Users, 
  MapPin, 
  Calendar,
  Tag,
  TrendingUp,
  ChevronDown 
} from 'lucide-react';
import { useInfiniteSearch } from '../hooks/useInfiniteScroll';
import OptimizedImage from './OptimizedImage';

const CATEGORIES = [
  'Vintage Fashion',
  'Sneakers',
  'Electronics', 
  'Gaming',
  'Collectibles',
  'Home Design',
  'Art & Antiques',
  'Jewelry',
  'Books & Media',
  'Sports'
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Rilevanza', icon: TrendingUp },
  { value: 'followers', label: 'Più Seguiti', icon: Users },
  { value: 'rating', label: 'Valutazione', icon: Star },
  { value: 'recent', label: 'Più Recenti', icon: Clock },
  { value: 'live_active', label: 'Live Attive', icon: Calendar }
];

const PRICE_RANGES = [
  { value: '', label: 'Qualsiasi Prezzo' },
  { value: '0-50', label: 'Fino a €50' },
  { value: '50-100', label: '€50 - €100' },
  { value: '100-250', label: '€100 - €250' },
  { value: '250-500', label: '€250 - €500' },
  { value: '500+', label: 'Oltre €500' }
];

const LOCATION_FILTERS = [
  { value: '', label: 'Tutte le località' },
  { value: 'milano', label: 'Milano' },
  { value: 'roma', label: 'Roma' },
  { value: 'napoli', label: 'Napoli' },
  { value: 'torino', label: 'Torino' },
  { value: 'firenze', label: 'Firenze' },
  { value: 'bologna', label: 'Bologna' }
];

export default function AdvancedSearch({ onClose }) {
  const [filters, setFilters] = useState({
    query: '',
    category: '',
    priceRange: '',
    location: '',
    minRating: 0,
    hasLiveActive: false,
    onlyVerified: false,
    sortBy: 'relevance'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [savedFilters, setSavedFilters] = useState([]);

  // Advanced search API function
  const performAdvancedSearch = async ({ query, page, pageSize, signal }) => {
    const searchParams = new URLSearchParams({
      q: query,
      ...filters,
      page: page.toString(),
      limit: pageSize.toString()
    });

    const response = await fetch(`/api/search/advanced?${searchParams}`, {
      signal
    });

    if (!response.ok) {
      throw new Error('Errore ricerca avanzata');
    }

    const data = await response.json();
    return {
      data: data.results || [],
      hasMore: data.hasMore || false
    };
  };

  const {
    data: results,
    loading,
    error,
    hasNextPage,
    targetRef,
    handleQueryChange,
    reset
  } = useInfiniteSearch(performAdvancedSearch, {
    pageSize: 20,
    debounceMs: 500
  });

  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('bidli_saved_filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.warn('Invalid saved filters');
      }
    }
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Reset search with new filters
    reset();
    if (newFilters.query.trim()) {
      handleQueryChange(newFilters.query);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = e.target.search.value.trim();
    handleFilterChange('query', query);
  };

  const clearFilters = () => {
    const clearedFilters = {
      query: filters.query,
      category: '',
      priceRange: '',
      location: '',
      minRating: 0,
      hasLiveActive: false,
      onlyVerified: false,
      sortBy: 'relevance'
    };
    setFilters(clearedFilters);
    reset();
    if (clearedFilters.query.trim()) {
      handleQueryChange(clearedFilters.query);
    }
  };

  const saveCurrentFilters = () => {
    const filterName = prompt('Nome per questi filtri:');
    if (filterName && filterName.trim()) {
      const newSavedFilter = {
        id: Date.now(),
        name: filterName.trim(),
        filters: { ...filters }
      };
      
      const updated = [...savedFilters, newSavedFilter];
      setSavedFilters(updated);
      localStorage.setItem('bidli_saved_filters', JSON.stringify(updated));
    }
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    reset();
    if (savedFilter.filters.query.trim()) {
      handleQueryChange(savedFilter.filters.query);
    }
  };

  const deleteSavedFilter = (filterId) => {
    const updated = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem('bidli_saved_filters', JSON.stringify(updated));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceRange) count++;
    if (filters.location) count++;
    if (filters.minRating > 0) count++;
    if (filters.hasLiveActive) count++;
    if (filters.onlyVerified) count++;
    return count;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0f172a',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(64, 224, 208, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Search size={20} />
          Ricerca Avanzata
        </h1>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} style={{ padding: '20px' }}>
        <div style={{
          position: 'relative',
          marginBottom: '16px'
        }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#40e0d0'
            }}
          />
          <input
            name="search"
            type="text"
            placeholder="Cerca venditori, categorie, prodotti..."
            defaultValue={filters.query}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              backgroundColor: 'rgba(64, 224, 208, 0.1)',
              border: '2px solid rgba(64, 224, 208, 0.3)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: showFilters ? '#40e0d0' : 'rgba(64, 224, 208, 0.1)',
              color: showFilters ? '#0f172a' : '#40e0d0',
              border: '1px solid rgba(64, 224, 208, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            <Filter size={16} />
            Filtri {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
            <ChevronDown 
              size={16} 
              style={{
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>

          {getActiveFiltersCount() > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Cancella Filtri
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div style={{
            backgroundColor: 'rgba(64, 224, 208, 0.05)',
            border: '1px solid rgba(64, 224, 208, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Category Filter */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#40e0d0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <Tag size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Categoria
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Tutte le categorie</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#40e0d0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  💰 Fascia Prezzo
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  {PRICE_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#40e0d0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Località
                </label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  {LOCATION_FILTERS.map(location => (
                    <option key={location.value} value={location.value}>{location.label}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label style={{
                  display: 'block',
                  color: '#40e0d0',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  <TrendingUp size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Ordina per
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Filters */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ffffff',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={filters.hasLiveActive}
                  onChange={(e) => handleFilterChange('hasLiveActive', e.target.checked)}
                  style={{ accentColor: '#40e0d0' }}
                />
                🔴 Solo con Live Attive
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ffffff',
                fontSize: '14px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={filters.onlyVerified}
                  onChange={(e) => handleFilterChange('onlyVerified', e.target.checked)}
                  style={{ accentColor: '#40e0d0' }}
                />
                ✅ Solo Venditori Verificati
              </label>
            </div>

            {/* Rating Filter */}
            <div>
              <label style={{
                display: 'block',
                color: '#40e0d0',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                <Star size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Valutazione Minima: {filters.minRating}/5
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#40e0d0'
                }}
              />
            </div>

            {/* Save/Load Filters */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(64, 224, 208, 0.2)',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={saveCurrentFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(64, 224, 208, 0.2)',
                  color: '#40e0d0',
                  border: '1px solid rgba(64, 224, 208, 0.3)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                💾 Salva Filtri
              </button>

              {savedFilters.map(savedFilter => (
                <div key={savedFilter.id} style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => loadSavedFilter(savedFilter)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      color: '#94a3b8',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    {savedFilter.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSavedFilter(savedFilter.id)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 20px 20px'
      }}>
        {loading && results.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#94a3b8'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(64, 224, 208, 0.3)',
              borderTop: '3px solid #40e0d0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            Ricerca in corso...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#ef4444'
          }}>
            ❌ Errore: {error}
          </div>
        ) : results.length === 0 && filters.query ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#94a3b8'
          }}>
            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ color: '#ffffff', marginBottom: '8px' }}>
              Nessun risultato trovato
            </h3>
            <p>Prova a modificare i filtri o i termini di ricerca</p>
          </div>
        ) : (
          <>
            {results.length > 0 && (
              <div style={{
                marginBottom: '20px',
                color: '#94a3b8',
                fontSize: '14px'
              }}>
                {results.length} risultat{results.length !== 1 ? 'i' : 'o'} trovat{results.length !== 1 ? 'i' : 'o'}
              </div>
            )}
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {results.map((item, index) => (
                <SearchResultCard key={`${item.id}-${index}`} item={item} />
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            {hasNextPage && (
              <div ref={targetRef} style={{
                padding: '20px',
                textAlign: 'center',
                color: '#94a3b8'
              }}>
                {loading ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid rgba(64, 224, 208, 0.3)',
                    borderTop: '2px solid #40e0d0',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                ) : (
                  'Caricamento altri risultati...'
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Result Card Component
const SearchResultCard = ({ item }) => {
  const itemType = item.handle ? 'seller' : 'live';
  
  if (itemType === 'seller') {
    return (
      <div style={{
        backgroundColor: 'rgba(64, 224, 208, 0.1)',
        border: '1px solid rgba(64, 224, 208, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <OptimizedImage
            src={item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.display_name || 'Seller')}&background=40e0d0&color=fff&size=50`}
            alt={item.display_name}
            width={50}
            height={50}
            style={{
              borderRadius: '50%',
              border: '2px solid #40e0d0'
            }}
          />
          <div style={{ flex: 1 }}>
            <h3 style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '4px'
            }}>
              {item.display_name}
            </h3>
            <div style={{
              color: '#40e0d0',
              fontSize: '12px',
              marginBottom: '2px'
            }}>
              @{item.handle}
            </div>
            {item.verified && (
              <span style={{
                color: '#40e0d0',
                fontSize: '11px'
              }}>
                ✅ Verificato
              </span>
            )}
          </div>
        </div>
        
        {item.bio && (
          <p style={{
            color: '#94a3b8',
            fontSize: '14px',
            marginBottom: '12px'
          }}>
            {item.bio.length > 100 ? `${item.bio.slice(0, 100)}...` : item.bio}
          </p>
        )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={12} />
            {item.followers} follower{item.followers !== 1 ? 's' : ''}
          </div>
          
          {item.rating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="#40e0d0" stroke="#40e0d0" />
              {item.rating.toFixed(1)}
            </div>
          )}
          
          {item.live_active && (
            <span style={{
              color: '#ef4444',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              🔴 LIVE
            </span>
          )}
        </div>
      </div>
    );
  }
  
  return null;
};
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Users, Star, ChevronLeft, Filter } from 'lucide-react';
import AdvancedSearch from '../components/AdvancedSearch';
import BackButton from '../components/BackButton';

export default function SearchResults() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('sellers');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  useEffect(() => {
    // Ottieni parametri dalla URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    const type = urlParams.get('type') || 'sellers';
    const category = urlParams.get('cat');
    
    setSearchQuery(query);
    setSearchType(type);
    
    // Se c'è una categoria, cerca in quella categoria
    if (category) {
      performCategorySearch(category);
    } else if (query.trim()) {
      performSearch(query, type);
    }
  }, []);

  const performSearch = async (query, type = 'sellers') => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      if (type === 'sellers') {
        await searchSellers(query);
      } else {
        await searchPosts(query);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const performCategorySearch = async (category) => {
    setLoading(true);
    try {
      // Cerca seller per categoria
      const { data: sellersData, error } = await supabase
        .from('sellers')
        .select(`
          *,
          profile:user_id (
            id, username, first_name, last_name, profile_picture
          )
        `)
        .eq('category', category)
        .order('followers', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Category search error:', error);
        setResults([]);
        setTotalResults(0);
        return;
      }

      setResults(sellersData || []);
      setTotalResults(sellersData?.length || 0);
    } catch (error) {
      console.error('Category search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchSellers = async (query) => {
    const { data: sellersData, error } = await supabase
      .from('sellers')
      .select(`
        *,
        profile:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `)
      .or(`display_name.ilike.%${query}%, handle.ilike.%${query}%, bio.ilike.%${query}%`)
      .order('followers', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Sellers search error:', error);
      setResults([]);
      setTotalResults(0);
      return;
    }

    setResults(sellersData || []);
    setTotalResults(sellersData?.length || 0);
  };

  const searchPosts = async (query) => {
    const { data: postsData, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        user:user_id (
          id, username, first_name, last_name, profile_picture
        )
      `)
      .ilike('content', `%${query}%`)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Posts search error:', error);
      setResults([]);
      setTotalResults(0);
      return;
    }

    setResults(postsData || []);
    setTotalResults(postsData?.length || 0);
  };

  const handleNewSearch = (e) => {
    e.preventDefault();
    const newQuery = e.target.search.value.trim();
    if (newQuery) {
      const newUrl = `/search?q=${encodeURIComponent(newQuery)}&type=${searchType}`;
      window.history.pushState({}, '', newUrl);
      setSearchQuery(newQuery);
      performSearch(newQuery, searchType);
    }
  };

  const handleTypeChange = (newType) => {
    setSearchType(newType);
    const newUrl = `/search?q=${encodeURIComponent(searchQuery)}&type=${newType}`;
    window.history.pushState({}, '', newUrl);
    if (searchQuery.trim()) {
      performSearch(searchQuery, newType);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ora';
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString('it-IT');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      padding: '20px 0'
    }}>
      {/* Header */}
      <div style={{
        padding: '0 16px 20px',
        borderBottom: '1px solid rgba(64, 224, 208, 0.2)',
        marginBottom: '20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <BackButton />
            <h1 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0
            }}>
              Risultati ricerca
            </h1>
          </div>

          {/* Search Form */}
          <form onSubmit={handleNewSearch} style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              position: 'relative',
              flex: '1',
              minWidth: '300px'
            }}>
              <input
                name="search"
                type="text"
                defaultValue={searchQuery}
                placeholder="Cerca venditori, negozi o contenuti..."
                style={{
                  width: '100%',
                  padding: '12px 50px 12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(64, 224, 208, 0.3)',
                  backgroundColor: 'rgba(64, 224, 208, 0.1)',
                  color: '#ffffff',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(64, 224, 208, 0.6)';
                  e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                  e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.1)';
                }}
              />
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#40e0d0',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <Search size={20} />
              </button>
            </div>
            
            {/* Advanced Search Button */}
            <button
              onClick={() => setShowAdvancedSearch(true)}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid rgba(64, 224, 208, 0.3)',
                backgroundColor: 'rgba(64, 224, 208, 0.1)',
                color: '#40e0d0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.2)';
                e.target.style.borderColor = 'rgba(64, 224, 208, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.1)';
                e.target.style.borderColor = 'rgba(64, 224, 208, 0.3)';
              }}
            >
              <Filter size={16} />
              Ricerca Avanzata
            </button>
          </form>

          {/* Search Type Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => handleTypeChange('sellers')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: searchType === 'sellers' ? '#40e0d0' : 'transparent',
                color: searchType === 'sellers' ? '#0f172a' : '#40e0d0',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                border: searchType === 'sellers' ? 'none' : '1px solid rgba(64, 224, 208, 0.3)'
              }}
            >
              Venditori
            </button>
            <button
              onClick={() => handleTypeChange('posts')}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: searchType === 'posts' ? '#40e0d0' : 'transparent',
                color: searchType === 'posts' ? '#0f172a' : '#40e0d0',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                border: searchType === 'posts' ? 'none' : '1px solid rgba(64, 224, 208, 0.3)'
              }}
            >
              Post
            </button>
          </div>

          {/* Results Count */}
          {searchQuery && (
            <div style={{
              marginTop: '16px',
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              {loading ? 'Ricerca in corso...' : `${totalResults} risultati per "${searchQuery}"`}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px'
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#40e0d0'
          }}>
            <Search size={48} style={{ marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              Ricerca in corso...
            </div>
          </div>
        ) : results.length > 0 ? (
          searchType === 'sellers' ? (
            // Risultati Venditori
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {results.map((seller) => (
                <div
                  key={seller.id}
                  style={{
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                  }}
                  onClick={() => window.location.href = `/seller/${seller.handle}`}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <img
                      src={seller.avatar_url || seller.profile?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.display_name || seller.handle)}&background=40e0d0&color=fff&size=60`}
                      alt={seller.display_name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid rgba(64, 224, 208, 0.3)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: '#ffffff',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                      }}>
                        {seller.display_name}
                      </div>
                      <div style={{
                        color: '#40e0d0',
                        fontSize: '14px',
                        marginBottom: '4px'
                      }}>
                        @{seller.handle}
                      </div>
                      {seller.verified && (
                        <div style={{
                          color: '#10b981',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✓ Verificato
                        </div>
                      )}
                    </div>
                  </div>

                  {seller.bio && (
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      marginBottom: '16px'
                    }}>
                      {seller.bio}
                    </p>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    color: '#94a3b8',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Users size={14} />
                      {seller.followers || 0} follower
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Star size={14} />
                      {seller.rating || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Risultati Post
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {results.map((post) => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                  }}
                >
                  {/* Post Image */}
                  {post.images && post.images.length > 0 && (
                    <div style={{
                      aspectRatio: '16/9',
                      overflow: 'hidden'
                    }}>
                      <img
                        src={post.images[0]}
                        alt="Post content"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ padding: '16px' }}>
                    {/* Post Author */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <img
                        src={post.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.first_name || 'User')}&background=40e0d0&color=fff&size=32`}
                        alt={post.user?.first_name || 'User'}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {post.user?.first_name || post.user?.username || 'Utente'}
                        </div>
                        <div style={{
                          color: '#94a3b8',
                          fontSize: '12px'
                        }}>
                          {formatTimeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p style={{
                      color: '#ffffff',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: 0
                    }}>
                      {post.content}
                    </p>

                    {/* Post Stats */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '12px',
                      color: '#94a3b8',
                      fontSize: '12px'
                    }}>
                      <span>❤️ {post.likes_count || 0}</span>
                      <span>💬 {post.comments_count || 0}</span>
                      <span>👀 {post.views_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : searchQuery ? (
          // Nessun risultato
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8'
          }}>
            <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h2 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Nessun risultato trovato
            </h2>
            <p style={{
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              Prova con termini di ricerca diversi o esplora le categorie
            </p>
            <a
              href="/discover"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#40e0d0',
                color: '#0f172a',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}
            >
              Esplora Venditori
            </a>
          </div>
        ) : (
          // Initial state
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8'
          }}>
            <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h2 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Cerca nella community BIDLi
            </h2>
            <p style={{
              fontSize: '16px'
            }}>
              Trova venditori, negozi e contenuti interessanti
            </p>
          </div>
        )}
      </div>

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} />
      )}
    </div>
  );
}
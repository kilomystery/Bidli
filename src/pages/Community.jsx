import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, User, Calendar, Search, Plus } from 'lucide-react';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories for filtering
  const categories = [
    { id: 'all', label: 'Tutti', emoji: '🎯' },
    { id: 'fashion', label: 'Fashion', emoji: '👗' },
    { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
    { id: 'accessories', label: 'Accessori', emoji: '👜' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' },
    { id: 'electronics', label: 'Tech', emoji: '📱' },
    { id: 'collectibles', label: 'Collezionabili', emoji: '🎪' }
  ];

  // Load mock data
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      
      // Simula caricamento API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockPosts = [
        {
          id: 1,
          user: { 
            name: 'Vintage Milano Store', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VintageMilano&backgroundColor=40e0d0', 
            handle: '@vintage_milano_official',
            verified: true
          },
          content: '🔥 APPENA ARRIVATA! Giacca di pelle Schott perfetta anni 80 - taglia M. Mai vista una così ben conservata! 😍 Domani in live alle 19:00 📺',
          images: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop'],
          likes: 247,
          comments: 34,
          shares: 18,
          time: '1h',
          category: 'fashion',
          type: 'post'
        },
        {
          id: 2,
          user: { 
            name: 'Sneaker Collector', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SneakerCollector&backgroundColor=ef4444', 
            handle: '@sneakercollector_ita',
            verified: true
          },
          content: '🚨 HOLY GRAIL ALERT! Air Jordan 1 Chicago 1985 originali con box! Condition 8.5/10 👟 State of the Union level find! 🔴⚪',
          images: [
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=400&h=400&fit=crop'
          ],
          likes: 1843,
          comments: 267,
          shares: 156,
          time: '3h',
          category: 'sneakers',
          type: 'post',
          hasVideo: true,
          videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        },
        {
          id: 3,
          user: { 
            name: 'WatchMaster Roma', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=WatchMaster&backgroundColor=fbbf24', 
            handle: '@watchmaster_roma',
            verified: true
          },
          content: '⌚ Rolex Submariner 5513 del 1970 - No Date, Original Dial. Movimento revisionato e certificato! Una leggenda al polso 🌊',
          images: ['https://images.unsplash.com/photo-1524805444756-af9f8e682b1f?w=400&h=400&fit=crop'],
          likes: 892,
          comments: 76,
          shares: 43,
          time: '5h',
          category: 'accessories',
          type: 'post'
        },
        {
          id: 4,
          user: { 
            name: 'RetroGamer Bologna', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=RetroGamer&backgroundColor=8b5cf6', 
            handle: '@retrogamer_bo',
            verified: false
          },
          content: '🎮 Nintendo Famicom originale giapponese con 15 giochi CIB! Appena arrivata dal Giappone, funziona perfettamente! 🇯🇵',
          images: [
            'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop',
            'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400&h=300&fit=crop'
          ],
          likes: 456,
          comments: 89,
          shares: 34,
          time: '6h',
          category: 'gaming',
          type: 'post'
        },
        {
          id: 5,
          user: { 
            name: 'Luxury Finder', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=LuxuryFinder&backgroundColor=ec4899', 
            handle: '@luxury_finder_ita',
            verified: true
          },
          content: '💎 Hermès Birkin 30 Togo Black PHW anno 2019 con ricevuta! Condizioni da sogno, mai usata! Un investimento che vale oro 💼✨',
          images: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'
          ],
          likes: 2341,
          comments: 198,
          shares: 287,
          time: '8h',
          category: 'fashion',
          type: 'post',
          hasVideo: true,
          videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4'
        },
        {
          id: 6,
          user: { 
            name: 'FunkoMaster', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=FunkoMaster&backgroundColor=06b6d4', 
            handle: '@funkomaster_collect',
            verified: false
          },
          content: '🦸‍♂️ Trovato Chase Gitd Batman #01 alla convention! 1/6 ratio - sono ancora scioccato! I Funko Chase sono magia pura! ⚡',
          images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop'],
          likes: 567,
          comments: 123,
          shares: 67,
          time: '12h',
          category: 'collectibles',
          type: 'post'
        },
        {
          id: 7,
          user: { 
            name: 'Vinyl Collector IT', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=VinylCollector&backgroundColor=10b981', 
            handle: '@vinyl_collector_italy',
            verified: true
          },
          content: '🎵 Pink Floyd - The Wall 1979 first pressing UK! Suono incredibile, copertina mint condition. Un pezzo di storia della musica! 🎸',
          images: [
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=entropy&cs=tinysrgb&auto=format'
          ],
          likes: 789,
          comments: 156,
          shares: 89,
          time: '1d',
          category: 'collectibles',
          type: 'post',
          hasVideo: true,
          videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4'
        },
        {
          id: 8,
          user: { 
            name: 'Antiquario Napoli', 
            avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=AntiquarioNapoli&backgroundColor=f59e0b', 
            handle: '@antiquario_napoli',
            verified: true
          },
          content: '🏺 Vaso di Murano anni 60 firmato Venini! Blu cobalto con applicazioni dorate, un capolavoro dell\'artigianato italiano! 🇮🇹✨',
          images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop'],
          likes: 234,
          comments: 45,
          shares: 23,
          time: '1d',
          category: 'home',
          type: 'post'
        }
      ];
      
      setPosts(mockPosts);
      setLoading(false);
    };

    loadPosts();
  }, []);

  // Filter posts based on search and category
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLike = (postId) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + 1 }
          : post
      )
    );
  };

  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: `Post di ${post.user.name}`,
        text: post.content,
        url: window.location.href
      });
    } else {
      // Fallback copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiato negli appunti!');
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '60vh' 
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid rgba(16, 185, 129, 0.1)',
          borderTop: '4px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      paddingTop: 20,
      paddingBottom: 100 // Space for bottom bar
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{
          margin: 0,
          color: 'white',
          fontSize: 28,
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: 20
        }}>
          Community BIDLi
        </h1>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: 20
        }}>
          <Search 
            size={20} 
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }}
          />
          <input
            type="text"
            placeholder="Cerca post o utenti..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: 'white',
              fontSize: 16,
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filters */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: selectedCategory === category.id 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {category.emoji} {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 2,
        padding: 0
      }}>
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            style={{
              position: 'relative',
              backgroundColor: '#111',
              aspectRatio: '1',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid rgba(64, 224, 208, 0.1)',
              background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url(${post.images[0]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            onClick={() => console.log('Open post:', post.id)}
          >
            {/* Post overlay content */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 12,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))'
            }}>
              {/* User info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8
              }}>
                <img
                  src={post.user.avatar}
                  alt={post.user.name}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%'
                  }}
                />
                <div>
                  <div style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {post.user.name}
                    {post.user.verified && (
                      <span style={{ color: '#10b981' }}>✓</span>
                    )}
                  </div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: 10
                  }}>
                    {post.time}
                  </div>
                </div>
              </div>

              {/* Content preview */}
              <p style={{
                margin: 0,
                color: 'white',
                fontSize: 11,
                lineHeight: 1.3,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                marginBottom: 8
              }}>
                {post.content}
              </p>

              {/* Engagement */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      cursor: 'pointer'
                    }}
                  >
                    <Heart size={12} fill="currentColor" />
                    {post.likes}
                  </button>
                  
                  <div style={{
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10
                  }}>
                    <MessageCircle size={12} />
                    {post.comments}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(post);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Share size={12} />
                </button>
              </div>
            </div>

            {/* Category badge */}
            <div style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(16, 185, 129, 0.9)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 600
            }}>
              {categories.find(c => c.id === post.category)?.emoji} {categories.find(c => c.id === post.category)?.label}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>Nessun post trovato</h3>
          <p style={{ margin: 0 }}>
            {searchTerm ? 'Prova con altri termini di ricerca' : 'Cambia categoria o rimuovi i filtri'}
          </p>
        </div>
      )}
    </div>
  );
}
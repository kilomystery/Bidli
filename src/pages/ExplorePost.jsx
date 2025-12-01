import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import BackButton from '../components/BackButton';
import { Heart, MessageCircle, Eye, ChevronLeft, X, ExternalLink } from 'lucide-react';

// Componente Post Modal per vista dettaglio
function PostDetailModal({ post, isOpen, onClose, onLike, onComment, userSession }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && post?.id) {
      loadComments();
      checkIfLiked();
    }
  }, [isOpen, post?.id, userSession?.user?.id]);

  const loadComments = async () => {
    if (!post?.id) return;
    setLoadingComments(true);
    try {
      const { data: commentsData } = await supabase
        .from('post_comments')
        .select(`
          *,
          user:user_id (
            id, username, first_name, last_name, profile_picture
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const checkIfLiked = async () => {
    if (!post?.id || !userSession?.user?.id) return;
    try {
      const { data } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', userSession.user.id)
        .single();
      
      setIsLiked(!!data);
    } catch (error) {
      setIsLiked(false);
    }
  };

  const handleLike = async () => {
    if (!userSession?.user?.id) return;
    try {
      const response = await fetch('/api/social/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          userId: userSession.user.id
        })
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        onLike(post.id, !isLiked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !userSession?.user?.id) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: userSession.user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          user:user_id (
            id, username, first_name, last_name, profile_picture
          )
        `)
        .single();

      if (!error && data) {
        setComments(prev => [...prev, data]);
        setNewComment('');
        onComment(post.id);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmittingComment(false);
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

  if (!isOpen || !post) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(64, 224, 208, 0.3)',
        display: 'flex',
        flexDirection: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'column' : 'row'
      }}>
        {/* Sezione Immagine */}
        <div style={{
          flex: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'none' : '1',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: (typeof window !== 'undefined' && window.innerWidth < 768) ? '300px' : '500px'
        }}>
          {post.images && post.images.length > 0 ? (
            <img
              src={post.images[0]}
              alt="Post content"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #40e0d0, #0891b2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              BIDLi Post
            </div>
          )}
        </div>

        {/* Sezione Dettagli */}
        <div style={{
          flex: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'none' : '1',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'none' : '500px'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(64, 224, 208, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={post.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.first_name || 'User')}&background=40e0d0&color=fff&size=40`}
                alt={post.user?.first_name || 'User'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <div>
                <div style={{
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '14px'
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
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Contenuto Post */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(64, 224, 208, 0.2)'
          }}>
            <p style={{
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.5'
            }}>
              {post.content}
            </p>
            {post.live && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
                  🔴 Collegato alla Live
                </div>
                <div style={{ color: '#ffffff', fontSize: '14px' }}>
                  {post.live.title}
                </div>
              </div>
            )}
          </div>

          {/* Azioni */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(64, 224, 208, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <button
              onClick={handleLike}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: isLiked ? '#ef4444' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Heart size={20} fill={isLiked ? '#ef4444' : 'none'} />
              {post.likes_count || 0}
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              <MessageCircle size={20} />
              {post.comments_count || 0}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              <Eye size={20} />
              {post.views_count || 0}
            </div>
            {post.user?.id && (
              <a
                href={`/seller/${post.user.username || post.user.id}`}
                style={{
                  marginLeft: 'auto',
                  color: '#40e0d0',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Vai al profilo <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Commenti */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto'
          }}>
            {loadingComments ? (
              <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                Caricamento commenti...
              </div>
            ) : comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {comments.map((comment) => (
                  <div key={comment.id} style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <img
                      src={comment.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.first_name || 'User')}&background=40e0d0&color=fff&size=32`}
                      alt={comment.user?.first_name || 'User'}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}>
                          {comment.user?.first_name || comment.user?.username || 'Utente'}
                        </span>
                        <span style={{
                          color: '#94a3b8',
                          fontSize: '11px'
                        }}>
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p style={{
                        color: '#ffffff',
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                color: '#94a3b8',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                Nessun commento ancora
              </div>
            )}
          </div>

          {/* Form Commento */}
          {userSession?.user && (
            <div style={{
              padding: '16px',
              borderTop: '1px solid rgba(64, 224, 208, 0.2)'
            }}>
              <form onSubmit={handleCommentSubmit} style={{
                display: 'flex',
                gap: '8px'
              }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Scrivi un commento..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(64, 224, 208, 0.3)',
                    backgroundColor: 'rgba(64, 224, 208, 0.1)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: '#40e0d0',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                    opacity: newComment.trim() ? 1 : 0.5,
                    fontSize: '14px'
                  }}
                >
                  {submittingComment ? '...' : 'Pubblica'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente principale ExplorePost
export default function ExplorePost() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [userSession, setUserSession] = useState(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [realTimeSubscriptions, setRealTimeSubscriptions] = useState([]);

  useEffect(() => {
    // Ottieni sessione utente
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserSession(user);
    };
    getSession();

    // Carica posts
    loadPosts();

    // 🚀 Setup Real-time Updates
    setupRealTimeUpdates();

    // 🧹 Cleanup on unmount
    return () => {
      realTimeSubscriptions.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData } = await supabase
        .from('social_posts')
        .select(`
          *,
          user:user_id (
            id, username, first_name, last_name, profile_picture
          ),
          live:live_id (
            id, title, status
          )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      // 🧠 ALGORITMO VITALITÀ AVANZATO
      const postsWithVitality = (postsData || []).map(post => {
        // Metriche base
        const likes = post.likes_count || 0;
        const comments = post.comments_count || 0;
        const views = post.views_count || 0;
        
        // Time decay (post più recenti hanno boost)
        const hoursAgo = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
        const timeDecay = Math.max(0.1, 1 - hoursAgo / 168); // Decade su 7 giorni
        
        // Engagement rate (interazioni/visualizzazioni)
        const engagementRate = views > 0 ? (likes + comments) / views : 0;
        
        // Punteggi pesati
        const likeScore = likes * 2; // Peso ridotto
        const commentScore = comments * 8; // Peso alto (conversazione)
        const viewScore = views * 0.5; // Peso basso
        const engagementBoost = engagementRate * 50; // Boost per alta engagement
        
        // Score finale con time decay
        const baseVitality = likeScore + commentScore + viewScore + engagementBoost;
        const finalVitality = baseVitality * timeDecay;
        
        return {
          ...post,
          vitality: finalVitality,
          timeDecay,
          engagementRate,
          hoursAgo: Math.round(hoursAgo * 10) / 10
        };
      }).sort((a, b) => b.vitality - a.vitality);

      // Se non ci sono post, usa demo posts
      if (postsWithVitality.length === 0) {
        console.log('📦 Caricando demo posts per ExplorePost...');
        const demoPosts = [
          {
            id: 'demo-1',
            user_id: 'demo-user-1',
            content: '🔥 GRAIL ALERT! Air Jordan 1 Chicago 1985 originali con box! Condition 9/10 - un pezzo di storia dello sport! 👟🏀 #Jordan #SneakerHead #Vintage',
            image_urls: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop'],
            likes_count: 2847,
            comments_count: 234,
            views_count: 8932,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-1',
              username: 'sneakercollector_ita',
              first_name: 'Sneaker',
              last_name: 'Collector',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=SneakerCollector&backgroundColor=ef4444'
            },
            vitality: 1000,
            timeDecay: 0.95,
            engagementRate: 0.34,
            hoursAgo: 2
          },
          {
            id: 'demo-2',
            user_id: 'demo-user-2',
            content: '✨ Hermès Birkin 30 Black Togo PHW 2019 con ricevuta! Condizioni perfette, mai usata. Un investimento che vale oro! 💼💎 #Hermes #Luxury #Investment',
            image_urls: [
              'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop',
              'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
            ],
            likes_count: 3421,
            comments_count: 187,
            views_count: 12456,
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-2',
              username: 'luxury_finder_ita',
              first_name: 'Luxury',
              last_name: 'Finder',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=LuxuryFinder&backgroundColor=ec4899'
            },
            vitality: 1200,
            timeDecay: 0.90,
            engagementRate: 0.29,
            hoursAgo: 4
          },
          {
            id: 'demo-3',
            user_id: 'demo-user-3',
            content: '⌚ Rolex Submariner 5513 del 1970 No Date! Dial originale, movimento revisionato e certificato. Una leggenda assoluta! 🌊⚡ #Rolex #Vintage #Watches',
            image_urls: ['https://images.unsplash.com/photo-1524805444756-af9f8e682b1f?w=500&h=500&fit=crop'],
            likes_count: 1892,
            comments_count: 156,
            views_count: 7234,
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-3',
              username: 'watchmaster_roma',
              first_name: 'WatchMaster',
              last_name: 'Roma',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=WatchMaster&backgroundColor=fbbf24'
            },
            vitality: 800,
            timeDecay: 0.85,
            engagementRate: 0.28,
            hoursAgo: 6
          },
          {
            id: 'demo-4',
            user_id: 'demo-user-4',
            content: '🎮 Nintendo Famicom originale del 1983 con 20 giochi CIB! Funziona perfettamente, un tuffo negli anni 80! 🇯🇵🕹️ #Nintendo #Retrogaming #Vintage',
            image_urls: [
              'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&h=400&fit=crop',
              'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=500&h=400&fit=crop'
            ],
            likes_count: 1234,
            comments_count: 89,
            views_count: 5678,
            created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-4',
              username: 'retrogamer_bo',
              first_name: 'RetroGamer',
              last_name: 'Bologna',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=RetroGamer&backgroundColor=8b5cf6'
            },
            vitality: 600,
            timeDecay: 0.80,
            engagementRate: 0.23,
            hoursAgo: 8
          },
          {
            id: 'demo-5',
            user_id: 'demo-user-5',
            content: '🦸‍♂️ Funko Pop Chase Gitd Batman #01 ratio 1/6! Trovato alla convention, ancora incredulo! La magia dei Chase! ⚡💫 #Funko #Chase #Batman',
            image_urls: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500&h=500&fit=crop'],
            likes_count: 892,
            comments_count: 67,
            views_count: 3456,
            created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-5',
              username: 'funkomaster_collect',
              first_name: 'FunkoMaster',
              last_name: 'Collector',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=FunkoMaster&backgroundColor=06b6d4'
            },
            vitality: 400,
            timeDecay: 0.70,
            engagementRate: 0.28,
            hoursAgo: 12
          },
          {
            id: 'demo-6',
            user_id: 'demo-user-6',
            content: '🎵 Pink Floyd - The Wall 1979 first pressing UK! Suono cristallino, copertina mint condition. Un pezzo di storia! 🎸🎤 #Vinyl #PinkFloyd #Music',
            image_urls: [
              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
              'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=400&fit=crop&crop=entropy'
            ],
            likes_count: 1567,
            comments_count: 123,
            views_count: 6789,
            created_at: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
            status: 'published',
            user: {
              id: 'demo-user-6',
              username: 'vinyl_collector_italy',
              first_name: 'Vinyl',
              last_name: 'Collector',
              profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=VinylCollector&backgroundColor=10b981'
            },
            vitality: 500,
            timeDecay: 0.65,
            engagementRate: 0.25,
            hoursAgo: 16
          }
        ];
        setPosts(demoPosts);
      } else {
        setPosts(postsWithVitality);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      // Fallback ai demo posts in caso di errore
      console.log('📦 Fallback: Caricando demo posts...');
      const demoPosts = [
        {
          id: 'demo-1',
          user_id: 'demo-user-1',
          content: '🔥 GRAIL ALERT! Air Jordan 1 Chicago 1985 originali con box! Condition 9/10 - un pezzo di storia dello sport! 👟🏀 #Jordan #SneakerHead #Vintage',
          image_urls: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop'],
          likes_count: 2847,
          comments_count: 234,
          views_count: 8932,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'published',
          user: {
            id: 'demo-user-1',
            username: 'sneakercollector_ita',
            first_name: 'Sneaker',
            last_name: 'Collector',
            profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=SneakerCollector&backgroundColor=ef4444'
          },
          vitality: 1000,
          timeDecay: 0.95,
          engagementRate: 0.34,
          hoursAgo: 2
        },
        {
          id: 'demo-2',
          user_id: 'demo-user-2',
          content: '✨ Hermès Birkin 30 Black Togo PHW 2019 con ricevuta! Condizioni perfette, mai usata. Un investimento che vale oro! 💼💎 #Hermes #Luxury #Investment',
          image_urls: [
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
          ],
          likes_count: 3421,
          comments_count: 187,
          views_count: 12456,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          status: 'published',
          user: {
            id: 'demo-user-2',
            username: 'luxury_finder_ita',
            first_name: 'Luxury',
            last_name: 'Finder',
            profile_picture: 'https://api.dicebear.com/7.x/initials/svg?seed=LuxuryFinder&backgroundColor=ec4899'
          },
          vitality: 1200,
          timeDecay: 0.90,
          engagementRate: 0.29,
          hoursAgo: 4
        }
      ];
      setPosts(demoPosts);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post, index) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setIsFullscreenMode(true);
    // Incrementa views
    incrementPostViews(post.id);
    
    // 🎬 Mobile TikTok Mode: Attiva live-mode per nascondere bottom bar
    if (window.innerWidth <= 768) {
      console.log('🎬 Explore: Activating live-mode (hiding bottom bar)');
      document.body.classList.add('live-mode');
    }
  };

  const navigateToNextPost = () => {
    if (selectedPostIndex < posts.length - 1) {
      const nextIndex = selectedPostIndex + 1;
      const nextPost = posts[nextIndex];
      setSelectedPost(nextPost);
      setSelectedPostIndex(nextIndex);
      incrementPostViews(nextPost.id);
    }
  };

  const navigateToPrevPost = () => {
    if (selectedPostIndex > 0) {
      const prevIndex = selectedPostIndex - 1;
      const prevPost = posts[prevIndex];
      setSelectedPost(prevPost);
      setSelectedPostIndex(prevIndex);
      incrementPostViews(prevPost.id);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreenMode(false);
    setSelectedPost(null);
    setSelectedPostIndex(null);
    
    // 🎬 Mobile TikTok Mode: Disattiva live-mode per mostrare bottom bar
    if (window.innerWidth <= 768) {
      console.log('🎬 Explore: Deactivating live-mode (showing bottom bar)');
      document.body.classList.remove('live-mode');
    }
  };

  // Gestione touch per mobile (swipe verticale)
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > 50; // Swipe up (next post)
    const isDownSwipe = distance < -50; // Swipe down (prev post)

    if (isUpSwipe && selectedPostIndex < posts.length - 1) {
      navigateToNextPost();
    }
    if (isDownSwipe && selectedPostIndex > 0) {
      navigateToPrevPost();
    }
  };

  // Gestione scroll con throttling per performance
  const handleWheelNavigation = (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - (handleWheelNavigation.lastCall || 0) < 300) return;
    handleWheelNavigation.lastCall = now;

    if (e.deltaY > 0 && selectedPostIndex < posts.length - 1) {
      navigateToNextPost();
    } else if (e.deltaY < 0 && selectedPostIndex > 0) {
      navigateToPrevPost();
    }
  };

  const incrementPostViews = async (postId) => {
    try {
      // 📈 Incrementa views via nuova API
      await fetch('/api/social/posts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId })
      });

      // Aggiorna UI locale per feedback immediato
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, views_count: (post.views_count || 0) + 1 }
          : post
      ));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  };

  // 🚀 REAL-TIME UPDATES SETUP
  const setupRealTimeUpdates = () => {
    // Subscription per likes
    const likesChannel = supabase
      .channel('post_likes_changes')
      .on('postgres_changes', {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'post_likes'
      }, (payload) => {
        console.log('🔥 Real-time like update:', payload);
        handleRealTimeLikeUpdate(payload);
      })
      .subscribe();

    // Subscription per comments
    const commentsChannel = supabase
      .channel('post_comments_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'post_comments'
      }, (payload) => {
        console.log('🔥 Real-time comment update:', payload);
        handleRealTimeCommentUpdate(payload);
      })
      .subscribe();

    // Subscription per social_posts updates (contatori)
    const postsChannel = supabase
      .channel('social_posts_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'social_posts'
      }, (payload) => {
        console.log('🔥 Real-time post update:', payload);
        handleRealTimePostUpdate(payload);
      })
      .subscribe();

    setRealTimeSubscriptions([likesChannel, commentsChannel, postsChannel]);
  };

  // 🔥 Handle real-time like updates
  const handleRealTimeLikeUpdate = (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const postId = newRecord?.post_id || oldRecord?.post_id;
    
    if (!postId) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const currentLikes = post.likes_count || 0;
        const newLikes = eventType === 'INSERT' 
          ? currentLikes + 1 
          : eventType === 'DELETE' 
          ? Math.max(0, currentLikes - 1)
          : currentLikes;
        
        return { ...post, likes_count: newLikes };
      }
      return post;
    }));
  };

  // 🔥 Handle real-time comment updates  
  const handleRealTimeCommentUpdate = (payload) => {
    const { eventType, new: newRecord } = payload;
    const postId = newRecord?.post_id;
    
    if (!postId || eventType !== 'INSERT') return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { 
          ...post, 
          comments_count: (post.comments_count || 0) + 1 
        };
      }
      return post;
    }));
  };

  // 🔥 Handle real-time post updates (contatori)
  const handleRealTimePostUpdate = (payload) => {
    const { new: newRecord } = payload;
    const postId = newRecord?.id;
    
    if (!postId) return;

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes_count: newRecord.likes_count || 0,
          comments_count: newRecord.comments_count || 0,
          views_count: newRecord.views_count || 0
        };
      }
      return post;
    }));
  };

  const handleLike = (postId, isLiked) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes_count: (post.likes_count || 0) + (isLiked ? 1 : -1) }
        : post
    ));
    
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => ({ 
        ...prev, 
        likes_count: (prev.likes_count || 0) + (isLiked ? 1 : -1) 
      }));
    }
  };

  const handleComment = (postId) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
        : post
    ));
    
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => ({ 
        ...prev, 
        comments_count: (prev.comments_count || 0) + 1 
      }));
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}g`;
    return date.toLocaleDateString('it-IT');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          color: '#40e0d0',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          Caricamento post...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      padding: '20px 0'
    }}>
      {/* Header con freccia indietro a destra */}
      <div style={{
        padding: '0 16px 20px',
        borderBottom: '1px solid rgba(64, 224, 208, 0.2)',
        marginBottom: '20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0
          }}>
            Explore Community
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              {posts.length} post
            </div>
            <button
              onClick={() => window.history.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#40e0d0',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(64, 224, 208, 0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Posts stile Instagram */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 16px'
      }}>
        {posts.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth <= 768 
              ? 'repeat(auto-fill, minmax(120px, 1fr))' 
              : 'repeat(auto-fill, minmax(280px, 1fr))', // ✅ Desktop: meno icone tagliate
            gap: window.innerWidth <= 768 ? '2px' : '8px', // ✅ Più spazio su desktop
            maxWidth: '100%',
            overflow: 'hidden' // ✅ Evita scroll orizzontale
          }}>
            {posts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => handlePostClick(post, index)}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b'
                }}
                onMouseEnter={(e) => {
                  const overlay = e.currentTarget.querySelector('.post-overlay');
                  if (overlay) overlay.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const overlay = e.currentTarget.querySelector('.post-overlay');
                  if (overlay) overlay.style.opacity = '0';
                }}
              >
                {/* Immagine o contenuto */}
                {post.images && post.images.length > 0 ? (
                  <img
                    src={post.images[0]}
                    alt="Post content"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #40e0d0, #0891b2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '16px'
                  }}>
                    {post.content?.substring(0, 100)}...
                  </div>
                )}

                {/* Overlay con stats - SEMPRE VISIBILE su desktop */}
                <div
                  className="post-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: window.innerWidth <= 768 ? 0 : 0.9, // ✅ Desktop sempre visibile
                    transition: 'opacity 0.2s ease',
                    color: 'white',
                    fontSize: window.innerWidth <= 768 ? '12px' : '16px', // ✅ Più grandi su desktop
                    fontWeight: 'bold',
                    padding: '8px' // ✅ Evita icone tagliate ai bordi
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: window.innerWidth <= 768 ? '8px' : '20px', // ✅ Più spazio su desktop
                    flexWrap: 'wrap', // ✅ Evita overflow su schermi stretti
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Heart size={window.innerWidth <= 768 ? 16 : 20} fill="white" />
                      {post.likes_count || 0}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MessageCircle size={window.innerWidth <= 768 ? 16 : 20} fill="white" />
                      {post.comments_count || 0}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={window.innerWidth <= 768 ? 16 : 20} fill="white" />
                      {post.views_count || 0}
                    </div>
                  </div>
                </div>

                {/* Badge Live se collegato */}
                {post.live && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    🔴 LIVE
                  </div>
                )}

                {/* Avatar utente */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  overflow: 'hidden'
                }}>
                  <img
                    src={post.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.first_name || 'User')}&background=40e0d0&color=fff&size=32`}
                    alt={post.user?.first_name || 'User'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📱
            </div>
            <h2 style={{
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Nessun post ancora
            </h2>
            <p style={{
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              Inizia a seguire i venditori per vedere i loro post qui
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
              Scopri Venditori
            </a>
          </div>
        )}
      </div>

      {/* Fullscreen Post Viewer stile TikTok MIGLIORATO */}
      {isFullscreenMode && selectedPost && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            // 🎬 Mobile TikTok Full-Screen
            width: '100vw',
            height: '100vh',
            margin: 0,
            padding: 0
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheelNavigation}
        >
          {/* Header con controlli - MOBILE OTTIMIZZATO */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
            padding: window.innerWidth <= 768 ? '12px 16px' : '16px', // 🎬 Mobile: meno padding
            paddingTop: window.innerWidth <= 768 ? '20px' : '16px', // 🎬 Mobile: più spazio per notch
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: window.innerWidth <= 768 ? '60px' : 'auto' // 🎬 Mobile: area touch più grande
          }}>
            <button
              onClick={closeFullscreen}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            
            <div style={{
              color: 'white',
              fontSize: '14px',
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 12px',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              {selectedPostIndex + 1} di {posts.length}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedPostIndex > 0 && (
                <button
                  onClick={navigateToPrevPost}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="m18 15-6-6-6 6"/>
                  </svg>
                </button>
              )}
              {selectedPostIndex < posts.length - 1 && (
                <button
                  onClick={navigateToNextPost}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Contenuto principale del post */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {selectedPost.images && selectedPost.images.length > 0 ? (
              <img
                src={selectedPost.images[0]}
                alt="Post content"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #40e0d0, #0891b2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                fontWeight: 'bold',
                textAlign: 'center',
                padding: '20px'
              }}>
                {selectedPost.content}
              </div>
            )}
          </div>

          {/* Footer con info post e azioni - MOBILE OTTIMIZZATO */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
            padding: window.innerWidth <= 768 ? '16px' : '20px 16px', // 🎬 Mobile: meno padding
            paddingBottom: window.innerWidth <= 768 ? '24px' : '20px', // 🎬 Mobile: spazio per gesture home
            color: 'white',
            minHeight: window.innerWidth <= 768 ? '120px' : 'auto' // 🎬 Mobile: area touch più ampia
          }}>
            {/* Info utente */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <img
                src={selectedPost.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost.user?.first_name || 'User')}&background=40e0d0&color=fff&size=40`}
                alt={selectedPost.user?.first_name || 'User'}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #40e0d0'
                }}
              />
              <div>
                <div style={{
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  {selectedPost.user?.first_name || selectedPost.user?.username || 'Utente'}
                </div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '14px'
                }}>
                  {formatTimeAgo(selectedPost.created_at)}
                </div>
              </div>
            </div>

            {/* Contenuto post */}
            {selectedPost.content && (
              <p style={{
                margin: '0 0 16px 0',
                lineHeight: '1.5',
                fontSize: '16px'
              }}>
                {selectedPost.content}
              </p>
            )}

            {/* Azioni engagement - MOBILE OTTIMIZZATO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: window.innerWidth <= 768 ? 'wrap' : 'nowrap', // 🎬 Mobile: wrap se necessario
              gap: window.innerWidth <= 768 ? '12px' : '0' // 🎬 Mobile: più gap
            }}>
              <div style={{ 
                display: 'flex', 
                gap: window.innerWidth <= 768 ? '20px' : '24px', // 🎬 Mobile: icone più grandi
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Heart size={window.innerWidth <= 768 ? 28 : 24} fill="none" stroke="white" />
                  <span style={{ fontSize: window.innerWidth <= 768 ? '18px' : '16px' }}>{selectedPost.likes_count || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={window.innerWidth <= 768 ? 28 : 24} stroke="white" />
                  <span style={{ fontSize: window.innerWidth <= 768 ? '18px' : '16px' }}>{selectedPost.comments_count || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={window.innerWidth <= 768 ? 28 : 24} stroke="white" />
                  <span style={{ fontSize: window.innerWidth <= 768 ? '18px' : '16px' }}>{selectedPost.views_count || 0}</span>
                </div>
              </div>
              
              <a
                href={`/seller/${selectedPost.user?.username || selectedPost.user?.id}`}
                style={{
                  background: '#40e0d0',
                  color: '#0f172a',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Profilo
              </a>
            </div>
          </div>

          {/* Indicatori di navigazione */}
          <div style={{
            position: 'absolute',
            right: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {posts.slice(Math.max(0, selectedPostIndex - 2), selectedPostIndex + 3).map((_, i) => {
              const actualIndex = Math.max(0, selectedPostIndex - 2) + i;
              return (
                <div
                  key={actualIndex}
                  style={{
                    width: '4px',
                    height: actualIndex === selectedPostIndex ? '20px' : '12px',
                    borderRadius: '2px',
                    backgroundColor: actualIndex === selectedPostIndex ? '#40e0d0' : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.2s ease'
                  }}
                />
              );
            })}
          </div>

          {/* Istruzioni swipe per mobile */}
          {(typeof window !== 'undefined' && window.innerWidth <= 768) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              textAlign: 'center',
              pointerEvents: 'none',
              animation: 'fadeOut 3s ease-out forwards'
            }}>
              ↕️ Swipe per navigare
            </div>
          )}
        </div>
      )}
    </div>
  );
}
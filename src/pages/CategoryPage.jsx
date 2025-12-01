// src/pages/CategoryPage.jsx - Categoria stile Discover (SENZA Layout per evitare doppio bottom bar)
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { CATEGORIES } from "../constants/categories";
import { Heart, Eye, Users, Play, ArrowLeft } from "lucide-react";

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [lives, setLives] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trova la categoria corrente
  const currentCategory = CATEGORIES.find(cat => cat.id === categoryId);

  // 🎥 DEMO LIVE DATA - Solo live, zero prodotti!
  const getCategoryDemoData = (category) => {
    const demoData = {
      fashion: {
        lives: [
          {
            id: 'live-fashion-1',
            title: 'Giacche Vintage Anni 80-90 - Selezione Esclusiva',
            viewers: 432,
            seller: { 
              display_name: 'Vintage Milano', 
              handle: 'vintage_milano',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=VintageMilano'
            },
            cover_image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=600&fit=crop',
            likes: 1247,
            scheduled: false
          },
          {
            id: 'live-fashion-2',
            title: 'Borse Hermès e Chanel Vintage Certificate',
            viewers: 267,
            seller: { 
              display_name: 'Luxury Torino', 
              handle: 'luxury_torino',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=LuxuryTorino'
            },
            cover_image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=600&fit=crop',
            likes: 892,
            scheduled: true,
            scheduled_at: '2025-01-16T14:30:00Z'
          }
        ]
      },
      sneakers: {
        lives: [
          {
            id: 'live-sneakers-1',
            title: 'Jordan Rare Collection - Autentiche e Certificate', 
            viewers: 587,
            seller: {
              display_name: 'Retro Roma',
              handle: 'retro_roma',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=RetroRoma'
            },
            cover_image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=600&fit=crop',
            likes: 2103,
            scheduled: false
          },
          {
            id: 'live-sneakers-2',
            title: 'Nike Dunk Vintage 80s-90s Deadstock',
            viewers: 341,
            seller: {
              display_name: 'Sneaker Napoli',
              handle: 'sneaker_napoli',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=SneakerNapoli'
            },
            cover_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=600&fit=crop',
            likes: 1456,
            scheduled: true,
            scheduled_at: '2025-01-16T16:00:00Z'
          }
        ]
      },
      accessori: {
        lives: [
          {
            id: 'live-accessori-1',
            title: 'Rolex e Orologi Vintage Autentici',
            viewers: 678,
            seller: {
              display_name: 'WatchMaster Milano',
              handle: 'watchmaster_milano',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=WatchMaster'
            },
            cover_image: 'https://images.unsplash.com/photo-1524805444756-af9f8e682b1f?w=400&h=600&fit=crop',
            likes: 2845,
            scheduled: false
          }
        ]
      },
      gaming: {
        lives: [
          {
            id: 'live-gaming-1',
            title: 'Console Nintendo & PlayStation Vintage',
            viewers: 423,
            seller: {
              display_name: 'RetroGamer Bologna',
              handle: 'retrogamer_bologna',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=RetroGamer'
            },
            cover_image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=600&fit=crop',
            likes: 1687,
            scheduled: false
          }
        ]
      },
      collectibles: {
        lives: [
          {
            id: 'live-collectibles-1',
            title: 'Funko Pop Rare & Chase Edition',
            viewers: 234,
            seller: {
              display_name: 'CollectMaster',
              handle: 'collectmaster',
              avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=CollectMaster'
            },
            cover_image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=600&fit=crop',
            likes: 967,
            scheduled: false
          }
        ]
      }
    };
    return demoData[category.id] || demoData.fashion;
  };

  useEffect(() => {
    if (!currentCategory) {
      navigate('/discover');
      return;
    }

    const fetchCategoryData = async () => {
      try {
        // 🎥 Usa sempre demo data - SOLO LIVE!
        const categoryDemoData = getCategoryDemoData(currentCategory);
        setLives(categoryDemoData.lives);
        setProducts([]); // Nessun prodotto!
        setLoading(false);
      } catch (error) {
        console.error("Errore caricamento categoria:", error);
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categoryId, currentCategory, navigate]);

  if (!currentCategory) {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        paddingTop: '60px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚡</div>
          Caricamento {currentCategory.label}...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
      paddingTop: '60px',
      paddingBottom: '100px',
      position: 'relative'
    }}>
      
      {/* ✅ HEADER MOBILE */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(15, 15, 35, 0.95)',
        backdropFilter: 'blur(20px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid rgba(64, 224, 208, 0.1)'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#40e0d0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={20} />
          {currentCategory.label}
        </button>
      </div>

      {/* ✅ CONTENT */}
      <div style={{ padding: '20px 16px' }}>
        
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>
            {currentCategory.icon}
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#40e0d0',
            margin: 0,
            marginBottom: '4px'
          }}>
            {currentCategory.label}
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            margin: 0
          }}>
            {lives.length} live • {products.length} prodotti disponibili
          </p>
        </div>

        {/* ✅ LIVE CARDS stile Discover */}
        {lives.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '6px',
                height: '6px', 
                borderRadius: '50%',
                background: '#ff0844'
              }}></div>
              Live in Corso
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {lives.map((live) => (
                <div
                  key={live.id}
                  onClick={() => navigate(`/explore`)}
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {/* Cover Image */}
                  <div style={{
                    height: '160px',
                    backgroundImage: `url(${live.cover_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    {/* Live Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'linear-gradient(135deg, #ff0844 0%, #ff6b6b 100%)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'white'
                      }}></div>
                      LIVE
                    </div>

                    {/* Viewers */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={12} />
                      {live.viewers}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px' }}>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '8px',
                      lineHeight: '1.3'
                    }}>
                      {live.title}
                    </div>

                    {/* Seller Info */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <img
                          src={live.seller.avatar_url}
                          alt=""
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%'
                          }}
                        />
                        <span style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: '500'
                        }}>
                          @{live.seller.handle}
                        </span>
                      </div>

                      {/* Like Count */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '12px'
                      }}>
                        <Heart size={14} />
                        {live.likes}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ PRODUCT CARDS stile Discover */}
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '16px'
          }}>
            🛍️ Prodotti Disponibili
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {/* Product Image */}
                <div style={{
                  height: '200px',
                  backgroundImage: `url(${product.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}></div>

                {/* Content */}
                <div style={{ padding: '16px' }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'white',
                    marginBottom: '8px'
                  }}>
                    {product.title}
                  </div>
                  
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#40e0d0',
                    marginBottom: '8px'
                  }}>
                    €{product.price}
                  </div>

                  {/* Seller & Likes */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.7)'
                    }}>
                      {product.seller.display_name}
                    </span>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '12px'
                    }}>
                      <Heart size={14} />
                      {product.likes}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";
import BackButton from '../components/BackButton';
import { Eye, Users, Play, Calendar, ArrowLeft } from "lucide-react";

function LiveCard({ live, onOpen }) {
  const isScheduled = live.status === "scheduled";
  const when = isScheduled ? new Date(live.scheduled_at).toLocaleString() : "";

  return (
    <div 
      className="card live-card glow-border" 
      onClick={() => onOpen(live)}
      style={{
        cursor: 'pointer',
        transform: 'scale(1)',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 15px 35px rgba(59, 130, 246, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
      }}
    >
      <div className="thumb" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)'
      }}>
        <span className={`badge ${isScheduled ? "scheduled" : live.status === "live" ? "live-indicator" : ""}`}>
          {isScheduled ? "PROSSIMA" : live.status === "live" ? "LIVE" : "—"}
        </span>
        
        {/* Play button overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(59, 130, 246, 0.9)',
          borderRadius: '50%',
          padding: '12px',
          opacity: '0.8'
        }}>
          <Play size={24} color="white" fill="white" />
        </div>
        
        {/* Categoria */}
        <span style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
          color: 'white',
          fontSize: '10px',
          padding: '4px 8px',
          borderRadius: '12px',
          fontWeight: '600'
        }}>
          {live.category_label || "Tech"}
        </span>
        
        {/* Nome venditore */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          color: '#06b6d4',
          fontSize: '11px',
          padding: '4px 8px',
          borderRadius: '8px',
          fontWeight: '600'
        }}>
          @{live.seller_handle || "unknown"}
        </div>
      </div>
      
      <div className="live-card-content">
        <h3>{live.title || "Live senza titolo"}</h3>
        <div className="live-stats">
          <span><Eye size={16} />{live.viewers || 0}</span>
          {isScheduled && <span><Calendar size={16} />{when}</span>}
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ category, onSelect }) {
  // 🎭 Live count con demo data
  const demoLiveCounts = {
    'Fashion': 8,
    'Sneakers': 12,
    'Electronics': 6,
    'Gaming': 9,
    'Collectibles': 15,
    'Home Design': 4
  };
  
  const [liveCount, setLiveCount] = useState(demoLiveCounts[category.label] || 3);

  useEffect(() => {
    const fetchLiveCount = async () => {
      const { count } = await supabase
        .from("lives")
        .select("*", { count: 'exact', head: true })
        .eq("category_id", category.id)
        .in("status", ["live", "scheduled"]);
      
      // Usa demo se nessun dato reale
      setLiveCount(count || demoLiveCounts[category.label] || 3);
    };
    fetchLiveCount();
  }, [category.id]);

  return (
    <div 
      className="category-card"
      onClick={() => onSelect(category)}
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '2px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textAlign: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 15px 35px rgba(59, 130, 246, 0.3)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }}
    >
      <h3 style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '12px'
      }}>
        {category.label}
      </h3>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#06b6d4',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <Play size={16} />
        <span>{liveCount} live attive</span>
      </div>
    </div>
  );
}

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carica tutte le categorie
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, label")
        .order("label");
      
      const defaultCategories = [
        { id: "vintage", label: "Moda Vintage" },
        { id: "retro-tech", label: "Retro-Tech" },
        { id: "sneakers", label: "Sneakers" },
        { id: "motors", label: "Motors" },
        { id: "pre-loved", label: "Pre-loved" },
      ];
      
      setCategories(data?.length ? data : defaultCategories);
      setLoading(false);
    };
    
    fetchCategories();
  }, []);

  // Carica live per categoria selezionata
  useEffect(() => {
    if (!selectedCategory) return;
    
    const fetchLives = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lives")
        .select(`
          id, title, status, viewers, scheduled_at,
          seller:seller_id ( display_name, handle, avatar_url ),
          category:category_id ( label )
        `)
        .eq("category_id", selectedCategory.id)
        .in("status", ["live", "scheduled"])
        .order("viewers", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Errore caricamento live:", error);
        setLives([]);
      } else {
        // Trasforma i dati per compatibilità
        const transformedLives = (data || []).map(live => ({
          ...live,
          seller_handle: live.seller?.handle,
          category_label: live.category?.label
        }));
        setLives(transformedLives);
      }
      setLoading(false);
    };
    
    fetchLives();
  }, [selectedCategory]);

  const openLive = (live) => {
    if (live.status === "live") {
      navigate(`/live/${live.id}`);
    } else if (live.status === "scheduled") {
      alert("Questa live è programmata per più tardi!");
    }
  };

  const goBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      navigate("/discover");
    }
  };

  return (
    <div className="page-container">
      <div className="content">
        {/* Header con breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
          padding: '20px 0'
        }}>
          <button
            onClick={goBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: '#3b82f6',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.2)';
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.1)';
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            }}
          >
            <ArrowLeft size={16} />
          </button>
          
          <h1 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: '800',
            background: 'linear-gradient(45deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {selectedCategory ? selectedCategory.label : "Categorie"}
          </h1>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            color: '#06b6d4',
            fontSize: '18px'
          }}>
            Caricamento...
          </div>
        ) : selectedCategory ? (
          // Vista live della categoria selezionata
          <div>
            <p style={{
              color: '#94a3b8',
              fontSize: '16px',
              marginBottom: '24px'
            }}>
              {lives.length > 0 
                ? `${lives.length} live trovate in ${selectedCategory.label}`
                : `Nessuna live attiva in ${selectedCategory.label}`
              }
            </p>
            
            <div className="live-grid">
              {lives.map((live) => (
                <LiveCard
                  key={live.id}
                  live={live}
                  onOpen={openLive}
                />
              ))}
            </div>
            
            {lives.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b'
              }}>
                <h3 style={{ marginBottom: '16px', color: '#94a3b8' }}>
                  Nessuna live in questa categoria
                </h3>
                <p>Torna più tardi per vedere nuove live!</p>
              </div>
            )}
          </div>
        ) : (
          // Vista griglia categorie
          <div>
            <p style={{
              color: '#94a3b8',
              fontSize: '16px',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Scegli una categoria per vedere le live disponibili
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onSelect={setSelectedCategory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <Footer />
      
      {/* CSS per le card delle live */}
      <style jsx>{`
        .live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }
        
        .live-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .thumb {
          position: relative;
          height: 200px;
          background-size: cover;
          background-position: center;
        }
        
        .badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .live-indicator {
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
          animation: pulse 2s infinite;
        }
        
        .scheduled {
          background: linear-gradient(45deg, #f59e0b, #d97706);
          color: white;
        }
        
        .live-card-content {
          padding: 20px;
        }
        
        .live-card-content h3 {
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          line-height: 1.3;
        }
        
        .live-stats {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #06b6d4;
          font-size: 14px;
          font-weight: 600;
        }
        
        .live-stats span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @media (max-width: 768px) {
          .live-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .thumb {
            height: 180px;
          }
          
          .live-card-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
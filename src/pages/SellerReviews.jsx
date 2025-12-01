// src/pages/SellerReviews.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import BackButton from '../components/BackButton';
import ReviewsSection from '../components/ReviewsSection';

export default function SellerReviews() {
  const { handle } = useParams();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      setLoading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) {
          setCurrentUser(user);
        }

        // Get seller from API
        const response = await fetch(`/api/sellers/handle/${handle}`);
        
        if (response.ok) {
          const sellerData = await response.json();
          if (mounted) {
            console.log('✅ SellerReviews: Venditore trovato:', sellerData.display_name);
            setSeller(sellerData);
          }
        } else {
          console.log('❌ SellerReviews: Venditore non trovato per handle:', handle);
        }
        
      } catch (error) {
        console.error('Errore caricamento seller:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();
    
    return () => { mounted = false; };
  }, [handle]);

  if (loading) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <h1>Caricamento recensioni...</h1>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="container section">
        <BackButton />
        <h1>Venditore non trovato</h1>
        <a href="/">← Torna alla home</a>
      </div>
    );
  }

  const canWriteReview = currentUser && currentUser.id !== seller.user_id;

  return (
    <main className="container section" style={{ maxWidth: 800 }}>
      <BackButton />
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <img
            src={seller.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.display_name)}&background=6366f1&color=fff&size=64`}
            alt={seller.display_name}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
              Recensioni di {seller.display_name}
            </h1>
            <p style={{ 
              margin: '4px 0 0 0', 
              color: '#6b7280',
              fontSize: 14 
            }}>
              @{seller.handle}
            </p>
          </div>
        </div>
        
        <a 
          href={`/seller/${handle}`}
          style={{
            color: '#40e0d0',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          ← Torna al profilo venditore
        </a>
      </div>

      {/* Reviews Section */}
      <ReviewsSection 
        sellerId={seller.user_id}
        currentUserId={currentUser?.id}
        canWriteReview={canWriteReview}
      />
    </main>
  );
}
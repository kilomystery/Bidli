// src/components/SmartLiveRouter.jsx - Automatic routing for live streams based on user role
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import LiveDashboard from "../pages/LiveDashboard";
import LiveNew from "../pages/LiveNew";

export default function SmartLiveRouter() {
  const { id: liveId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const determineUserRole = async () => {
      try {
        console.log('🔀 SmartLiveRouter: Determining role for live:', liveId);
        
        // Get current session
        const { data: session } = await supabase.auth.getSession();
        const userId = session?.session?.user?.id;
        
        if (!userId) {
          // Not authenticated - default to buyer view
          console.log('👤 SmartLiveRouter: No auth - defaulting to buyer view');
          if (mounted) {
            setIsSeller(false);
            setLoading(false);
          }
          return;
        }

        // Get live data to check ownership
        let liveData = null;
        try {
          const response = await fetch(`/api/lives/${liveId}`);
          if (response.ok) {
            liveData = await response.json();
            console.log('📡 SmartLiveRouter: Live data loaded:', {
              id: liveData.id,
              seller_user_id: liveData.seller_user_id,
              current_user: userId
            });
          }
        } catch (error) {
          console.warn('⚠️ SmartLiveRouter: Could not load live data:', error);
        }

        // ✅ USA SOLO PROFILES.ROLE - SEMPLICE E AFFIDABILE
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();
        
        const userRole = profile?.role || "buyer";
        
        console.log('🔍 SmartLiveRouter: Profile role detected:', userRole);

        // Determine final routing decision
        let shouldRoutToSeller = false;

        if (userRole === 'seller') {
          if (liveData?.seller_user_id === userId) {
            // User is seller AND owns this live
            shouldRoutToSeller = true;
            console.log('🏪 SmartLiveRouter: SELLER + OWNER → LiveDashboard');
          } else {
            // User is seller but doesn't own this live → buyer view
            shouldRoutToSeller = false;
            console.log('🏪 SmartLiveRouter: SELLER but not owner → LiveNew (buyer view)');
          }
        } else {
          // User is buyer or guest
          shouldRoutToSeller = false;
          console.log('👤 SmartLiveRouter: BUYER/GUEST → LiveNew');
        }

        if (mounted) {
          setIsSeller(shouldRoutToSeller);
          setLoading(false);
        }

      } catch (error) {
        console.error('❌ SmartLiveRouter: Error determining role:', error);
        if (mounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    determineUserRole();

    return () => {
      mounted = false;
    };
  }, [liveId]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: 'white',
        fontSize: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>🔄</div>
          <div>Caricamento live...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#000',
        color: 'white',
        fontSize: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '12px' }}>⚠️</div>
          <div>Errore caricamento live</div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Route to appropriate component with CORRECT PROPS
  console.log(`🎯 SmartLiveRouter: Rendering ${isSeller ? 'LiveDashboard (SELLER)' : 'LiveNew (BUYER)'} with liveId:`, liveId);
  
  // ✅ PASSA liveId CORRETTAMENTE ai componenti
  return isSeller ? 
    <LiveDashboard liveIdParam={liveId} /> : 
    <LiveNew liveId={liveId} />;
}
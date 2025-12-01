import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

/**
 * Router intelligente per dashboard
 * Reindirizza automaticamente in base al ruolo utente:
 * - Acquirenti → /buyer-dashboard
 * - Venditori → /seller-dashboard
 * - Non autenticati → /auth
 */
export default function SmartDashboardRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // ✅ BYPASS PRECISO: SmartDashboardRouter NON interferisce con live paths
    if (location.pathname.startsWith('/live/') || location.pathname.startsWith('/stream/')) {
      console.log('🎥 SmartDashboardRouter: BYPASSING per live path:', location.pathname);
      setChecking(false);
      return;
    }
    
    (async () => {
      try {
        // Verifica autenticazione
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (!user) {
          // Non autenticato → login
          navigate('/auth', { replace: true });
          return;
        }

        // ✅ USA SOLO PROFILES.ROLE - SEMPLICE E AFFIDABILE
        console.log('SmartDashboardRouter: Controllo profiles.role per user:', user.id);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const role = profile?.role || "buyer";
        
        console.log('🔍 SmartDashboardRouter: PROFILE ROLE', { 
          role, 
          userId: user.id,
          profile
        });

        if (!mounted) return;

        // 🏢 ROUTING BASATO SU PROFILES.ROLE
        if (role === 'seller') {
          console.log('✅ SmartDashboardRouter: VENDITORE CONFERMATO (profiles) - redirect seller-dashboard');
          navigate('/seller-dashboard', { replace: true });
        } else {
          console.log('👤 SmartDashboardRouter: ACQUIRENTE (profiles) - redirect buyer-dashboard');
          navigate('/buyer-dashboard', { replace: true });
        }

      } catch (error) {
        console.error('Errore smart router:', error);
        if (mounted) {
          navigate('/buyer-dashboard', { replace: true });
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>
            Caricamento dashboard...
          </div>
        </div>
      </div>
    );
  }

  return null;
}
import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import MobileBottomBar from "./MobileBottomBar";
import MobileHeaderMini from "./MobileHeaderMini";
import MobileCategories from "./MobileCategories";
import AuthModalBridge from "./AuthModalBridge";
import { supabase } from "../lib/supabaseClient";
import "../styles/mobile-chrome.css";
import "../styles/desktop-fixes.css";

export default function Layout() {
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const { pathname } = useLocation();

  // ✅ MOBILE DETECTION migliorato
  useEffect(() => {
    const updateMobileState = () => {
      const widthCheck = window.innerWidth <= 960;
      const mediaCheck = window.matchMedia("(max-width: 960px)").matches;
      const mobile = widthCheck && mediaCheck;
      setIsMobile(mobile);
      
      console.log('📱 Mobile Detection:', { 
        widthCheck, 
        mediaCheck, 
        result: mobile,
        innerWidth: window.innerWidth 
      });
    };

    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateMobileState, 100);
    });

    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('orientationchange', updateMobileState);
    };
  }, []);

  // ✅ USER ROLE DETECTION
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          
          setUserRole(profile?.role || "buyer");
        } else {
          setUserRole("guest");
        }
      } catch (error) {
        console.error("Error getting user role:", error);
        setUserRole("guest");
      }
    };

    getUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ PAGES che non dovrebbero mostrare la UI mobile
  const hideMobileChromePages = [
    '/live/',
    '/live-dashboard/',
    '/create-post',
    '/create-story'
  ];

  const shouldHideMobileChrome = hideMobileChromePages.some(page => 
    pathname.startsWith(page)
  ) || pathname === '/live';

  // ✅ MOBILE CHROME CONDITIONS
  const showMobileChrome = isMobile && !shouldHideMobileChrome;
  

  return (
    <div className="app-shell">
      {/* Header: mobile compatto o desktop completo */}
      {showMobileChrome ? <MobileHeaderMini /> : <Header />}

      {/* Contenuto principale */}
      <main className={`app-main ${showMobileChrome ? "with-mb" : ""}`}>
        <Outlet />
      </main>

      {/* Footer solo su desktop */}
      {!showMobileChrome && <Footer />}

      {/* Bottom bar solo su mobile */}
      {showMobileChrome && <MobileBottomBar role={userRole} />}

      {/* ✅ Popup login sempre presente */}
      <AuthModalBridge />
    </div>
  );
}
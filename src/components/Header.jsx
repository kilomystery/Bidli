// src/components/Header.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import AuthModal from "./AuthModal";
import NotificationBell from "./NotificationBell";
import AdvancedSearch from "./AdvancedSearch";
import { SearchCache } from "../utils/searchCache";

export default function Header() {
  const headerRef = useRef(null);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [seller, setSeller] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Ruolo utente
  const [userRole, setUserRole] = useState(null);

  // Detect mobile for responsive design - MOVED UP TO FIX HOISTING ISSUE
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile((typeof window !== 'undefined') && window.innerWidth <= 960);
    };
    checkMobile();
    const onR = () => checkMobile();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // sync session
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
      if (s) setAuthOpen(false);
      // al cambio sessione ricarico ruolo
      updateUserRole(s?.user?.id, s?.access_token);
    });
    return () => sub?.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ricarica quando arriva un evento globale (es. dopo compile form)
  useEffect(() => {
    const handler = () => updateUserRole(session?.user?.id, session?.access_token);
    window.addEventListener("role:updated", handler);
    return () => window.removeEventListener("role:updated", handler);
  }, [session?.user?.id, session?.access_token]);

  // 📱 Header a scomparsa durante scroll - SOLO MOBILE
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const el = headerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          const goingDown = y > lastY;
          lastY = y;
          
          // 🎯 ANIMAZIONE SOLO SU MOBILE
          if (isMobile) {
            // Header scompare quando scrolli verso il basso oltre 80px
            if (goingDown && y > 80) {
              el.style.transform = "translateY(-100%)";
              el.style.opacity = "0.8";
            } else if (!goingDown || y <= 30) {
              el.style.transform = "translateY(0)";
              el.style.opacity = "1";
            }
          } else {
            // Su desktop, header sempre visibile
            el.style.transform = "translateY(0)";
            el.style.opacity = "1";
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  // 🎯 RUOLO: USA SISTEMA UNIFICATO
  const updateUserRole = useCallback(async (uidParam, tokenParam) => {
    const userId = uidParam ?? session?.user?.id;
    const accessToken = tokenParam ?? session?.access_token;
    
    if (!userId) {
      setSeller(null);
      setUserRole(null);
      return;
    }

    try {
      // ✅ USA SOLO PROFILES.ROLE - SEMPLICE E AFFIDABILE
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      
      const role = profile?.role || "buyer";
      console.log('✅ Header: PROFILE ROLE:', role);
      setUserRole(role);
      
      // Carica seller data se è seller
      if (role === 'seller') {
        try {
          const response = await fetch(`/api/sellers/user/${userId}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          if (response.ok) {
            const sellerData = await response.json();
            setSeller(sellerData);
          } else {
            setSeller(null);
          }
        } catch (e) {
          setSeller(null);
        }
      } else {
        setSeller(null);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setUserRole('buyer');
      setSeller(null);
    }
  }, [session?.user?.id, session?.access_token]);

  useEffect(() => {
    updateUserRole();
  }, [updateUserRole]);

  // ----------------------------
  // Ricerca venditori con cache
  // ----------------------------
  const searchSellers = useCallback(async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const cachedResults = SearchCache.get(query);
    if (cachedResults) {
      setSearchResults(cachedResults);
      setShowSearchResults(true);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/sellers/search?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const sellers = await response.json();
        SearchCache.set(query, sellers);
        setSearchResults(sellers);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce ricerca
  useEffect(() => {
    const id = setTimeout(() => {
      if (searchQuery) searchSellers(searchQuery);
      else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [searchQuery, searchSellers]);

  // Funzioni per la ricerca venditori
  const handleSellerSearch = useCallback((searchTerm) => setSearchQuery(searchTerm), []);
  const handleSearchSubmit = useCallback((searchTerm) => {
    if (searchTerm.trim()) {
      setShowMobileSearch(false);
      setShowSearchResults(false);
      setSearchQuery('');
      const searchUrl = `/search?q=${encodeURIComponent(searchTerm.trim())}&type=sellers`;
      window.location.href = searchUrl;
    }
  }, []);
  const handleSellerClick = useCallback((seller) => {
    setShowMobileSearch(false);
    setShowSearchResults(false);
    setSearchQuery('');
    window.location.href = `/seller/${seller.handle}`;
  }, []);

  // close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileOpen && !event.target.closest('[data-profile-dropdown]')) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileOpen]);

  // login click
  const onClickLogin = () => setAuthOpen(true);

  return (
    <>
      <header className="topbar" style={{
        backgroundColor: "#0f172a",
        borderBottom: "2px solid rgba(64, 224, 208, 0.6)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 0 20px rgba(64, 224, 208, 0.3)"
      }}>
        {/* TOP BAR principale: user info + actions */}
        <div style={{
          padding: "12px 0",
          borderBottom: "1px solid rgba(64, 224, 208, 0.2)"
        }}>
          <div style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: isMobile ? "0 8px" : "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
            gap: isMobile ? "4px" : "8px"
          }}>
            {/* LOGO + brand */}
            <div style={{ 
              display: "flex", 
              alignItems: "center",
              flex: "0 0 auto",
              minWidth: isMobile ? "80px" : "120px"
            }}>
              <a
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: isMobile ? 18 : 24,
                  background: "linear-gradient(45deg, #40e0d0, #00bcd4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.5px"
                }}
              >
                <div style={{
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                  background: "linear-gradient(45deg, #40e0d0, #00bcd4)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(64, 224, 208, 0.5)"
                }}>
                  <span style={{ color: "#0f172a", fontSize: isMobile ? 16 : 20, fontWeight: 900 }}>B</span>
                </div>
                BIDLi
              </a>
            </div>

            {/* AREA Actions: notifiche + user */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: isMobile ? 8 : 12,
              flex: "0 0 auto",
              minWidth: "fit-content"
            }}>
              {session?.user && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                  }}></div>
                  <span style={{ color: "#ef4444" }}>25 Live</span>
                </div>
              )}

              {session?.user && <NotificationBell />}

              {/* AREA utente: login o profilo */}
              {!session?.user ? (
                <button
                  onClick={onClickLogin}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "rgba(64, 224, 208, 0.1)",
                    border: "2px solid rgba(64, 224, 208, 0.6)",
                    borderRadius: 25,
                    color: "#40e0d0",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 0 15px rgba(64, 224, 208, 0.3)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "rgba(64, 224, 208, 0.2)";
                    e.target.style.boxShadow = "0 0 25px rgba(64, 224, 208, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "rgba(64, 224, 208, 0.1)";
                    e.target.style.boxShadow = "0 0 15px rgba(64, 224, 208, 0.3)";
                  }}
                >
                  Accedi
                </button>
              ) : (
                <div style={{ position: "relative" }} data-profile-dropdown>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 6 : 8,
                      background: "rgba(64, 224, 208, 0.1)",
                      border: "2px solid rgba(64, 224, 208, 0.6)",
                      borderRadius: 25,
                      padding: isMobile ? "4px 8px" : "6px 12px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 0 15px rgba(64, 224, 208, 0.3)",
                      minWidth: "fit-content",
                      maxWidth: "none",
                      overflow: "visible",
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "rgba(64, 224, 208, 0.2)";
                      e.target.style.boxShadow = "0 0 25px rgba(64, 224, 208, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "rgba(64, 224, 208, 0.1)";
                      e.target.style.boxShadow = "0 0 15px rgba(64, 224, 208, 0.3)";
                    }}
                  >
                    <img
                      src={seller?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(seller?.display_name || session.user.email || "U")}&background=6366f1&color=fff&size=32`}
                      alt="Profilo"
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0
                      }}
                    />
                    <span style={{ 
                      fontSize: isMobile ? 12 : 14, 
                      fontWeight: 600, 
                      color: "#40e0d0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: isMobile ? "120px" : "150px",
                      flexShrink: 1
                    }}>
                      {seller?.display_name || "Profilo"}
                    </span>
                    <svg width={isMobile ? "14" : "16"} height={isMobile ? "14" : "16"} viewBox="0 0 24 24" fill="none" style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {profileOpen && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "#0f172a",
                      border: "2px solid rgba(64, 224, 208, 0.6)",
                      borderRadius: 12,
                      boxShadow: "0 0 30px rgba(64, 224, 208, 0.5), 0 10px 40px rgba(0,0,0,0.7)",
                      minWidth: isMobile ? 220 : 250,
                      zIndex: 1000,
                      marginTop: 4
                    }}>
                      <div style={{ padding: "12px 16px", borderBottom: "2px solid rgba(64, 224, 208, 0.3)" }}>
                        <div 
                          style={{ 
                            display: "block",
                            padding: "8px",
                            borderRadius: "8px",
                            transition: "background-color 0.2s",
                            cursor: "pointer"
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#f9fafb"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          onClick={() => {
                            setProfileOpen(false);
                            if (userRole === 'seller' && seller?.handle) {
                              window.location.href = `/seller/${seller.handle}`;
                            } else {
                              window.location.href = "/buyer-profile";
                            }
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "180px" }}>
                            {userRole === 'seller' ? (seller?.display_name || "Profilo Venditore") : "Il tuo profilo"}
                          </div>
                          {userRole === 'seller' && seller?.handle && (
                            <div style={{ fontSize: 12, color: "#40e0d0" }}>
                              @{seller.handle}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: "#ffffff", marginTop: 2, opacity: 0.8 }}>
                            {userRole === 'seller' ? "Gestisci negozio" : "Gestisci profilo"}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 8 }}>
                        {/* DASHBOARD */}
                        <a
                          href={userRole === 'seller' ? "/seller-dashboard" : "/dashboard"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            color: "#ffffff",
                            textDecoration: "none",
                            borderRadius: 10,
                            transition: "background-color 0.2s",
                            marginBottom: 4
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#f0f9ff"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          onClick={() => setProfileOpen(false)}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            backgroundColor: "#3b82f6",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="white" strokeWidth="2"/>
                              <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2"/>
                              <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2"/>
                              <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>
                              📊 {userRole === 'seller' ? 'Dashboard Venditori' : 'Dashboard'}
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {userRole === 'seller' ? 'Analytics, ordini e prodotti' : 'Panoramica acquisti e preferiti'}
                            </div>
                          </div>
                        </a>

                        {/* LIVE STUDIO - Solo per venditori */}
                        {userRole === 'seller' && (
                          <a
                            href="/live-studio"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px",
                              color: "#ffffff",
                              textDecoration: "none",
                              borderRadius: 10,
                              transition: "background-color 0.2s",
                              marginBottom: 4
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#fef2f2"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            onClick={() => setProfileOpen(false)}
                          >
                            <div style={{
                              width: 36,
                              height: 36,
                              backgroundColor: "#ef4444",
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2"/>
                                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="white" strokeWidth="2"/>
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>
                                🎥 Live Studio
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                Crea e gestisci live streaming
                              </div>
                            </div>
                          </a>
                        )}

                        {/* CENTRO GESTIONE ACCOUNT */}
                        <a
                          href="/account"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            color: "#ffffff",
                            textDecoration: "none",
                            borderRadius: 10,
                            transition: "background-color 0.2s",
                            marginBottom: 4
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#f0f9ff"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                          onClick={() => setProfileOpen(false)}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            backgroundColor: "#10b981",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M12 15l-3-3h6l-3 3z" fill="white"/>
                              <path d="M9 12l3-3 3 3H9z" fill="white"/>
                              <circle cx="12" cy="12" r="1" fill="white"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>
                              ⚙️ Centro Gestione Account
                            </div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              Impostazioni e preferenze
                            </div>
                          </div>
                        </a>

                        {/* DIVENTA VENDITORE - visibile ai buyer */}
                        {userRole !== 'seller' && (
                          <a
                            href="/complete-buyer-profile"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 16px",
                              color: "#ffffff",
                              textDecoration: "none",
                              borderRadius: 10,
                              transition: "background-color 0.2s",
                              marginBottom: 4
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = "#ecfeff"}
                            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                            onClick={() => setProfileOpen(false)}
                          >
                            <div style={{
                              width: 36,
                              height: 36,
                              backgroundColor: "#06b6d4",
                              borderRadius: 8,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>
                                🚀 Diventa venditore
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                Apri il tuo negozio
                              </div>
                            </div>
                          </a>
                        )}

                        {/* LOGOUT */}
                        <button
                          onClick={async () => {
                            await supabase.auth.signOut();
                            setProfileOpen(false);
                            window.location.href = "/";
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            borderRadius: 10,
                            cursor: "pointer",
                            width: "100%",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#fef2f2"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            backgroundColor: "#ef4444",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="white" strokeWidth="2"/>
                              <polyline points="16,17 21,12 16,7" stroke="white" strokeWidth="2"/>
                              <line x1="21" y1="12" x2="9" y2="12" stroke="white" strokeWidth="2"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>🚪 Esci</div>
                            <div style={{ fontSize: 12, color: "#ef4444", opacity: 0.8 }}>Disconnetti dall'account</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NAV secondaria */}
        <div style={{ padding: "8px 0", background: "rgba(15, 23, 42, 0.95)" }}>
          <div style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "48px"
          }}>
            <a 
              href="/explore" 
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: "20px",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#a855f7",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {isMobile ? "Live" : "BIDLi - SHOPPERTAINMENT"}
            </a>

            <a 
              href="/explore-posts" 
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                borderRadius: "20px",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#a855f7",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {isMobile ? "Community" : "Explore Community"}
            </a>

            <button
              onClick={() => setShowAdvancedSearch(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: isMobile ? "8px 12px" : "8px 16px",
                borderRadius: "20px",
                border: "1px solid rgba(64, 224, 208, 0.3)",
                backgroundColor: "rgba(64, 224, 208, 0.1)",
                color: "#40e0d0",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                marginLeft: "auto",
                position: "relative",
                whiteSpace: "nowrap"
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "rgba(64, 224, 208, 0.6)";
                e.target.style.backgroundColor = "rgba(64, 224, 208, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "rgba(64, 224, 208, 0.3)";
                e.target.style.backgroundColor = "rgba(64, 224, 208, 0.1)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              {!isMobile && <span>Ricerca Avanzata</span>}
              <div style={{
                width: "6px",
                height: "6px",
                backgroundColor: "#f59e0b",
                borderRadius: "50%",
                position: isMobile ? "absolute" : "static",
                top: isMobile ? "-2px" : "auto",
                right: isMobile ? "-2px" : "auto"
              }}></div>
            </button>
          </div>
        </div>
      </header>

      {/* Modal di autenticazione */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedSearch onClose={() => setShowAdvancedSearch(false)} />
      )}
    </>
  );
}
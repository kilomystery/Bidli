// src/components/MobileBottomBar.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Radio,
  Users,
  User,
  Plus,
  Settings,
  LogOut,
  Store,
  Video,
  FileText,
  Image,
  PlusCircle,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCurrentRole, getCurrentSession } from "../lib/globalRole";
import "../styles/mobile-bottom-bar.css";

export default function MobileBottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState("guest"); // guest | buyer | seller
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sellerHandle, setSellerHandle] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    loadUserData();

    const handleRoleChange = () => {
      loadUserData();
    };
    window.addEventListener("role:changed", handleRoleChange);
    return () => window.removeEventListener("role:changed", handleRoleChange);
  }, []);

  const loadUserData = async () => {
    try {
      const currentRole = getCurrentRole();
      const currentSession = getCurrentSession();

      setRole(currentRole);
      setSession(currentSession);

      if (currentSession?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .single();

        if (error) {
          setUserProfile(null);
          setSellerHandle(null);
        } else {
          setUserProfile(profile);

          if (currentRole === "seller") {
            try {
              const r = await fetch(`/api/sellers/user/${currentSession.user.id}`);
              if (r.ok) {
                const json = await r.json();
                setSellerHandle(json.handle || null);
              } else {
                setSellerHandle(null);
              }
            } catch {
              setSellerHandle(null);
            }
          } else {
            setSellerHandle(null);
          }
        }
      } else {
        setUserProfile(null);
        setSellerHandle(null);
      }
    } catch (e) {
      console.error("loadUserData error:", e);
    }
  };

  const handleProfileClick = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setShowCreateMenu(false);

    if (role === "guest") {
      window.dispatchEvent(new CustomEvent("auth:open"));
    } else {
      setShowProfileMenu((v) => !v);
    }
  };

  const handleCreateClick = () => {
    if (role === "seller") setShowCreateMenu(true);
  };

  const closePopups = () => {
    setShowCreateMenu(false);
    setShowProfileMenu(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      closePopups();
      navigate("/");
    } catch (e) {
      console.error("logout error:", e);
    }
  };

  const navigateTo = (path) => {
    closePopups();
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const renderProfileIcon = () => {
    if (userProfile?.avatar_url) {
      return (
        <div className="profile-icon-wrapper has-photo">
          <img src={userProfile.avatar_url} alt="Profilo" className="profile-photo" />
        </div>
      );
    }
    return (
      <div className="profile-icon-wrapper">
        <div className="profile-icon-fallback">
          <User size={16} />
        </div>
      </div>
    );
  };

  const renderBottomBarIcons = () => {
    const baseIcons = [
      { icon: Home, label: "Home", path: "/", key: "home" },
      { icon: Search, label: "Cerca", path: "/search", key: "search" },
      { icon: Radio, label: "Live", path: "/explore", key: "live" },
      { icon: Users, label: "Community", path: "/explore-posts", key: "community" },
    ];

    const icons = [...baseIcons];

    if (role === "seller") {
      icons.push({
        icon: Plus,
        label: "Crea",
        onClick: handleCreateClick,
        key: "create",
      });
    }

    icons.push({
      icon: User,
      label: "Profilo",
      onClick: handleProfileClick,
      key: "profile",
      isProfile: true,
    });

    return icons.map((item) => (
      <div
        key={item.key}
        className={`bottom-bar-item ${item.path && isActive(item.path) ? "active" : ""}`}
        onClick={item.onClick || (() => navigateTo(item.path))}
      >
        {item.isProfile ? renderProfileIcon() : <item.icon size={24} />}
        <span>{item.label}</span>
      </div>
    ));
  };

  return (
    <>
      {/* Bottom Bar */}
      <div className="mobile-bottom-bar">
        <div className="bottom-bar-content">{renderBottomBarIcons()}</div>
      </div>

      {/* Popup CREATE (solo seller) */}
      {showCreateMenu && (
        <div className="popup-overlay visible" onClick={closePopups}>
          <div className="popup-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">Crea contenuto</h3>
              <p className="popup-subtitle">Scegli cosa vuoi creare</p>
            </div>
            <div className="create-menu">
              <div
                className="create-card"
                onClick={() => {
                  closePopups();
                  window.dispatchEvent(new CustomEvent("seller:create-post"));
                }}
              >
                <FileText size={32} />
                <div className="create-card-title">Post</div>
              </div>

              <div
                className="create-card"
                onClick={() => {
                  closePopups();
                  window.dispatchEvent(new CustomEvent("seller:create-story"));
                }}
              >
                <Image size={32} />
                <div className="create-card-title">Story</div>
              </div>

              {/* ✅ Live Studio: /live-studio */}
              <div className="create-card" onClick={() => navigateTo("/live-studio")}>
                <Video size={32} />
                <div className="create-card-title">Live Studio</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup PROFILO */}
      {showProfileMenu && (
        <div className="popup-overlay visible" onClick={closePopups}>
          <div className="popup-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">Il tuo profilo</h3>
              <p className="popup-subtitle">
                {userProfile?.email || session?.user?.email || "Account"}
              </p>
            </div>

            <div className="popup-menu">
              {role === "buyer" ? (
                <>
                  <div className="popup-menu-item" onClick={() => navigateTo("/profile")}>
                    <User size={24} color="#3b82f6" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Il mio profilo</div>
                      <div className="popup-menu-subtitle">Visualizza e modifica il profilo</div>
                    </div>
                  </div>

                  <div className="popup-menu-item" onClick={() => navigateTo("/buyer-dashboard")}>
                    <Store size={24} color="#10b981" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Dashboard buyer</div>
                      <div className="popup-menu-subtitle">Ordini, preferiti e attività</div>
                    </div>
                  </div>

                  <div className="popup-menu-item" onClick={() => navigateTo("/account/settings")}>
                    <Settings size={24} color="#8b5cf6" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Centro gestione</div>
                      <div className="popup-menu-subtitle">Impostazioni e privacy</div>
                    </div>
                  </div>

                  <div
                    className="popup-menu-item popup-menu-upgrade"
                    onClick={() => navigateTo("/complete-seller-profile")}
                  >
                    <PlusCircle size={24} color="#22c55e" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Diventa venditore</div>
                      <div className="popup-menu-subtitle">Inizia a vendere su BIDLi</div>
                    </div>
                  </div>

                  <div className="popup-menu-item popup-menu-danger" onClick={handleLogout}>
                    <LogOut size={24} color="#ef4444" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Disconnetti</div>
                      <div className="popup-menu-subtitle">Esci dal tuo account</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="popup-menu-item"
                    onClick={() => {
                      const profilePath = sellerHandle ? `/seller/${sellerHandle}` : "/account";
                      navigateTo(profilePath);
                    }}
                  >
                    <User size={24} color="#3b82f6" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Il mio profilo</div>
                      <div className="popup-menu-subtitle">Visualizza il profilo venditore</div>
                    </div>
                  </div>

                  <div className="popup-menu-item" onClick={() => navigateTo("/seller-dashboard")}>
                    <Store size={24} color="#10b981" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Dashboard venditore</div>
                      <div className="popup-menu-subtitle">Gestisci prodotti e vendite</div>
                    </div>
                  </div>

                  {/* ✅ Live Studio: /live-studio */}
                  <div className="popup-menu-item" onClick={() => navigateTo("/live-studio")}>
                    <Video size={24} color="#f59e0b" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Live Studio</div>
                      <div className="popup-menu-subtitle">Avvia e gestisci live streaming</div>
                    </div>
                  </div>

                  <div className="popup-menu-item" onClick={() => navigateTo("/account/settings")}>
                    <Settings size={24} color="#8b5cf6" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Centro gestione</div>
                      <div className="popup-menu-subtitle">Impostazioni e privacy</div>
                    </div>
                  </div>

                  <div className="popup-menu-item popup-menu-danger" onClick={handleLogout}>
                    <LogOut size={24} color="#ef4444" />
                    <div className="popup-menu-text">
                      <div className="popup-menu-title">Disconnetti</div>
                      <div className="popup-menu-subtitle">Esci dal tuo account</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// src/components/BottomBar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * BottomBar mobile-only, stile geek, "intelligente"
 * - Mostra 5 tab reattivi con badge e highlight dell'active route
 * - Adatta la 4^ icona in base al ruolo (buyer: Ordini, seller: Live Studio)
 * - Badge notifiche (fallback 0 se API non disponibile)
 * - Safe-area ready (iPhone notch) + haptic-like micro animazioni
 */
export default function BottomBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 960);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Session + ruolo
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'buyer' | 'seller' | null

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data?.session || null);

      const uid = data?.session?.user?.id;
      if (uid) {
        // legge il ruolo dai tuoi profili Supabase
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .maybeSingle();

        const r = (profile?.role === "seller") ? "seller" : (profile?.role ? "buyer" : null);
        setRole(r);
      } else {
        setRole(null);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Notifiche (badge)
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Se hai una tua API:
        // const res = await fetch("/api/notifications/unread-count");
        // const json = await res.json();
        // if (active) setUnread(json?.count ?? 0);

        // Fallback sicuro (0) per evitare errori
        if (active) setUnread(0);
      } catch {
        if (active) setUnread(0);
      }
    })();
    return () => { active = false; };
  }, [session?.user?.id]);

  // Active route matcher
  const current = location.pathname;
  const isActive = (paths) => paths.some((p) => current.startsWith(p));

  // Tabs dinamiche (4° varia per ruolo)
  const tabs = useMemo(() => {
    const common = [
      {
        key: "home",
        label: "Home",
        paths: ["/", "/discover", "/home"],
        onClick: () => navigate("/discover"),
        icon: (active) => (
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" strokeWidth={active ? 2.2 : 1.8}/>
          </svg>
        ),
      },
      {
        key: "live",
        label: "Live",
        paths: ["/explore", "/livefeed", "/live"],
        onClick: () => navigate("/explore"),
        icon: (active) => (
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="currentColor">
            <circle cx="12" cy="12" r="3" />
            <path d="M2 12a10 10 0 0 1 20 0" strokeWidth={active ? 2.2 : 1.8} fill="none"/>
            <path d="M5 12a7 7 0 0 1 14 0" strokeWidth={active ? 2.2 : 1.8} fill="none"/>
          </svg>
        ),
      },
      {
        key: "community",
        label: "Community",
        paths: ["/explore-posts"],
        onClick: () => navigate("/explore-posts"),
        icon: (active) => (
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <path d="M7 10a4 4 0 1 1 10 0" strokeWidth={active ? 2.2 : 1.8}/>
            <path d="M2 20a7 7 0 0 1 20 0" strokeWidth={active ? 2.2 : 1.8}/>
          </svg>
        ),
        badge: unread > 0 ? unread : null,
      },
    ];

    const sellerTab = {
      key: "studio",
      label: "Studio",
      paths: ["/live-studio", "/seller-dashboard"],
      onClick: () => navigate("/live-studio"),
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth={active ? 2.2 : 1.8}/>
          <path d="M7 12h6" strokeWidth={active ? 2.4 : 2}/>
          <path d="M19 9l3 2v2l-3 2V9Z" fill="currentColor" />
        </svg>
      ),
    };

    const buyerTab = {
      key: "orders",
      label: "Ordini",
      paths: ["/orders", "/orders/my", "/orders/center"],
      onClick: () => navigate("/orders/my"),
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none">
          <path d="M6 7h12l-1 12H7L6 7Z" strokeWidth={active ? 2.2 : 1.8}/>
          <path d="M9 7V5a3 3 0 0 1 6 0v2" strokeWidth={active ? 2.2 : 1.8}/>
        </svg>
      ),
    };

    const last = {
      key: "me",
      label: session?.user ? "Profilo" : "Accedi",
      paths: ["/profile", "/account", "/auth"],
      onClick: () => {
        if (session?.user) navigate("/profile");
        else window.dispatchEvent(new Event("auth:open"));
      },
      icon: (active) => (
        <img
          alt="me"
          src={
            session?.user?.user_metadata?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              session?.user?.email || "U"
            )}&background=6366f1&color=fff&size=64`
          }
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: active ? "2px solid #40e0d0" : "2px solid rgba(255,255,255,0.18)",
            boxShadow: active ? "0 0 12px rgba(64,224,208,0.6)" : "none",
          }}
        />
      ),
    };

    return [...common, role === "seller" ? sellerTab : buyerTab, last];
  }, [navigate, session?.user, role, unread, current]);

  if (!isMobile) return null;

  return (
    <>
      {/* Spacer per non coprire il contenuto */}
      <div style={{ height: 72 }} aria-hidden />

      <nav
        className="bottom-bar"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 72,
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "rgba(15, 23, 42, 0.92)",
          borderTop: "2px solid rgba(64,224,208,0.35)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          alignItems: "center",
          zIndex: 60,
          boxShadow: "0 -10px 30px rgba(64,224,208,0.25)",
        }}
      >
        {tabs.map((t) => {
          const active = isActive(t.paths);
          return (
            <button
              key={t.key}
              onClick={t.onClick}
              style={{
                appearance: "none",
                background: "transparent",
                border: 0,
                outline: 0,
                color: active ? "#40e0d0" : "#cbd5e1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 4px",
                cursor: "pointer",
                transform: active ? "translateY(-2px)" : "translateY(0)",
                transition: "all .18s ease",
                position: "relative",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = active ? "translateY(-2px)" : "translateY(0)")}
            >
              <div
                aria-hidden
                style={{
                  width: 32,
                  height: 28,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {t.icon(active)}
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  textTransform: "uppercase",
                }}
              >
                {t.label}
              </span>

              {t.badge ? (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: "18%",
                    minWidth: 16,
                    height: 16,
                    padding: "0 5px",
                    borderRadius: 999,
                    background: "#ef4444",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid rgba(255,255,255,0.25)",
                    boxShadow: "0 0 10px rgba(239,68,68,0.5)",
                  }}
                >
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              ) : null}

              {active && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: 6,
                    width: 26,
                    height: 3,
                    background:
                      "linear-gradient(90deg, rgba(64,224,208,0) 0%, rgba(64,224,208,0.9) 50%, rgba(64,224,208,0) 100%)",
                    borderRadius: 4,
                    filter: "drop-shadow(0 0 6px rgba(64,224,208,0.8))",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
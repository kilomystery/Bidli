import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [session, setSession] = useState(null);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Carica sessione utente
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Carica post social feed
  useEffect(() => {
    loadPostsFeed();
  }, [session]);

  const loadPostsFeed = async () => {
    setLoadingPosts(true);
    try {
      const response = await fetch(`/api/social/posts/feed?userId=${session?.user?.id || ''}&limit=6`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPosts(data.posts);
        }
      }
    } catch (error) {
      console.error('Errore caricamento feed:', error);
    } finally {
      setLoadingPosts(false);
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

  return (
    <div style={styles.page}>

      {/* HERO */}
      <main>
        <section style={styles.sectionHero}>
          <div style={styles.container}>
            <h1 style={styles.h1}>
              Compra e vendi <span style={{ color: styles.accent.color }}>in diretta</span>
            </h1>
            <p style={styles.lead}>
              Funko, videogiochi, moda, TCG, carte sportive e altro. Vivi lo shopping live su <strong>BIDLi</strong>.
            </p>

            <div style={styles.searchRow}>
              <input placeholder="Cerca prodotti, creator o brand" style={styles.input} />
              <button style={styles.btnPrimary}>Cerca</button>
            </div>
            <p style={styles.hint}>Suggerimenti: "Funko Pop", "PS5", "sneakers", "Pokemon"</p>

            <div style={styles.storeRow}>
              <a href="#" style={styles.storeBtn}>App Store</a>
              <a href="#" style={styles.storeBtn}>Google Play</a>
            </div>
          </div>
        </section>

        {/* CATEGORIE */}
        <section id="categorie" style={styles.sectionAlt}>
          <div style={styles.container}>
            <h2 style={styles.h2}>Categorie</h2>
            <div style={styles.grid}>
              {[
                "Per te",
                "Moda",
                "Funko",
                "Trading Card Game",
                "Carte Sportive",
                "Videogiochi",
                "Tecnologia",
                "Cultura Pop",
                "Lego & Hot Wheels",
              ].map((c) => (
                <div key={c} style={styles.card}>
                  <div style={styles.cardTitle}>{c}</div>
                  <div style={styles.cardSub}>Esplora ora</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* VENDITORI IN TENDENZA */}
        <section id="trending-sellers" style={styles.sectionTrending}>
          <div style={styles.container}>
            <div style={styles.trendingHeader}>
              <h2 style={styles.h2}>🔥 Venditori in Tendenza</h2>
              <div style={styles.premiumBadge}>Premium</div>
            </div>
            <p style={styles.trendingSubtitle}>I migliori venditori sponsorizzati di questo mese</p>
            
            <div style={styles.trendingSellersGrid}>
              {[
                {
                  name: "VintageKing",
                  specialty: "Sneakers & Streetwear",
                  followers: "12.5K",
                  rating: 4.9,
                  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=VintageKing",
                  verified: true,
                  livesThisMonth: 15
                },
                {
                  name: "FunkoMaster",
                  specialty: "Funko Pop & Collectibles",
                  followers: "8.2K",
                  rating: 4.8,
                  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=FunkoMaster",
                  verified: true,
                  livesThisMonth: 22
                },
                {
                  name: "TechTraders",
                  specialty: "Gaming & Tech",
                  followers: "15.7K",
                  rating: 4.9,
                  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TechTraders",
                  verified: true,
                  livesThisMonth: 18
                },
                {
                  name: "CardCollector",
                  specialty: "TCG & Sport Cards",
                  followers: "9.8K",
                  rating: 4.7,
                  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CardCollector",
                  verified: true,
                  livesThisMonth: 12
                }
              ].map((seller, index) => (
                <div key={seller.name} style={styles.trendingSellerCard}>
                  <div style={styles.trendingRank}>#{index + 1}</div>
                  
                  <div style={styles.sellerAvatar}>
                    <img 
                      src={seller.avatar} 
                      alt={seller.name}
                      style={styles.avatarImg}
                    />
                    {seller.verified && (
                      <div style={styles.verifiedBadge}>✓</div>
                    )}
                  </div>
                  
                  <div style={styles.sellerInfo}>
                    <div style={styles.sellerName}>
                      @{seller.name}
                      <div style={styles.trendingIcon}>🔥</div>
                    </div>
                    <div style={styles.sellerSpecialty}>{seller.specialty}</div>
                    
                    <div style={styles.sellerStats}>
                      <div style={styles.stat}>
                        <span style={styles.statNumber}>{seller.followers}</span>
                        <span style={styles.statLabel}>followers</span>
                      </div>
                      <div style={styles.stat}>
                        <span style={styles.statNumber}>⭐ {seller.rating}</span>
                        <span style={styles.statLabel}>rating</span>
                      </div>
                      <div style={styles.stat}>
                        <span style={styles.statNumber}>{seller.livesThisMonth}</span>
                        <span style={styles.statLabel}>live</span>
                      </div>
                    </div>
                    
                    <button style={styles.followBtn}>
                      Segui
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={styles.trendingCta}>
              <p style={styles.trendingCtaText}>
                Sei un venditore? <strong>Entra anche tu in tendenza!</strong>
              </p>
              <a href="/seller/ads" style={{ textDecoration: 'none' }}>
                <button style={styles.btnTrendingCta}>
                  Scopri le Sponsorizzazioni
                </button>
              </a>
            </div>
          </div>
        </section>


        {/* CTA VENDITORI */}
        <section id="vende" style={styles.section}>
          <div style={styles.containerGridTwo}>
            <div>
              <h3 style={styles.h3}>Diventa venditore</h3>
              <p style={styles.text}>
                Vai live con aste a rialzo, “Compra ora” e richieste d’acquisto. Pagamenti automatici e
                spedizione unica per diretta.
              </p>
              <div style={styles.ctaRow}>
                <a href="/sell" style={{ textDecoration: "none" }}>
                  <button style={styles.btnPrimary}>Voglio vendere</button>
                </a>
                <button style={styles.btnGhost}>Come funziona</button>
              </div>
              <ul style={styles.bullets}>
                <li>Commissioni trasparenti</li>
                <li>Pagamenti rapidi</li>
                <li>Strumenti per creator</li>
              </ul>
            </div>

            <ol style={styles.steps}>
              {[
                ["Crea l’account", "Completa il profilo venditore in pochi minuti."],
                ["Carica i prodotti", "Titolo, prezzo, immagini e stock."],
                ["Vai in diretta", "Gestisci chat, timer d’asta e vendite in tempo reale."],
              ].map(([t, s], i) => (
                <li key={i} style={styles.stepItem}>
                  <div style={styles.stepNum}>{i + 1}</div>
                  <div>
                    <div style={styles.stepTitle}>{t}</div>
                    <div style={styles.stepSub}>{s}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.containerGrid}>
          <div>
            <div style={styles.brandWrap}>
              <div style={styles.logoSmall}>V</div>
              <div style={styles.brandStrong}>BIDLi</div>
            </div>
            <p style={styles.textMuted}>
              La piattaforma live per comprare e vendere collezionabili.
            </p>
          </div>
          <div>
            <div style={styles.footerHead}>Risorse</div>
            <ul style={styles.footerList}>
              <li><a href="#" style={styles.footerLink}>FAQ</a></li>
              <li><a href="#" style={styles.footerLink}>Privacy</a></li>
              <li><a href="#" style={styles.footerLink}>Cookie</a></li>
              <li><a href="#" style={styles.footerLink}>Termini</a></li>
              <li><a href="#" style={styles.footerLink}>Contatti</a></li>
            </ul>
          </div>
          <div>
            <div style={styles.footerHead}>Per i venditori</div>
            <ul style={styles.footerList}>
              <li><a href="/sell" style={styles.footerLink}>Inizia a vendere</a></li>
              <li><a href="#" style={styles.footerLink}>Linee guida</a></li>
              <li><a href="#" style={styles.footerLink}>Tariffe e commissioni</a></li>
            </ul>
          </div>
        </div>
        <div style={styles.copy}>
          © {new Date().getFullYear()} BIDLi • Tutti i diritti riservati
        </div>
      </footer>
    </div>
  );
}

/* ---- STYLES ---- */
const styles = {
  accent: { color: "#6e3aff" },
  page: { background: "#0f172a", color: "#ffffff", fontFamily: "system-ui, sans-serif" },

  /* Header styles removed - now using shared Header component */

  /* Hero */
  sectionHero: { padding: "48px 16px", background: "#0f172a" },
  container: { maxWidth: 1080, margin: "0 auto" },
  h1: { fontSize: 38, lineHeight: 1.1, margin: 0, fontWeight: 900, color: "#40e0d0", textShadow: "0 0 25px rgba(64, 224, 208, 0.7)" },
  lead: { marginTop: 12, color: "#40e0d0", maxWidth: 760, textShadow: "0 0 15px rgba(64, 224, 208, 0.5)" },
  searchRow: { marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 220, border: "1px solid #ddd", borderRadius: 8, height: 44, padding: "0 12px" },
  btnPrimary: { height: 44, padding: "0 16px", borderRadius: 8, background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#fff", border: 0, cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 15px rgba(6, 182, 212, 0.4)" },
  btnGhost: { height: 44, padding: "0 16px", borderRadius: 8, border: "1px solid rgba(64, 224, 208, 0.3)", background: "rgba(64, 224, 208, 0.05)", cursor: "pointer", color: "#40e0d0" },
  hint: { marginTop: 8, fontSize: 14, color: "#40e0d0", opacity: 0.8 },
  storeRow: { marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" },
  storeBtn: { border: "1px solid rgba(64, 224, 208, 0.3)", borderRadius: 8, height: 44, padding: "0 12px", display: "grid", placeItems: "center", fontSize: 14, textDecoration: "none", color: "#40e0d0", background: "rgba(64, 224, 208, 0.05)" },

  /* Categorie */
  sectionAlt: { padding: "48px 16px", borderTop: "1px solid rgba(64, 224, 208, 0.3)", background: "#0f172a" },
  h2: { fontSize: 32, margin: 0, fontWeight: 800, color: "#40e0d0", textShadow: "0 0 25px rgba(64, 224, 208, 0.7)" },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" },
  card: { border: "1px solid rgba(64, 224, 208, 0.3)", borderRadius: 16, background: "rgba(64, 224, 208, 0.05)", padding: 20, boxShadow: "0 4px 15px rgba(64, 224, 208, 0.1)" },
  cardTitle: { fontWeight: 800, color: "#40e0d0", fontSize: 18, textShadow: "0 0 15px rgba(64, 224, 208, 0.5)" },
  cardSub: { fontSize: 14, color: "#40e0d0", marginTop: 4, opacity: 0.8 },

  /* Venditori */
  section: { padding: "48px 16px", borderTop: "1px solid rgba(64, 224, 208, 0.3)", background: "#0f172a" },
  containerGridTwo: { maxWidth: 1080, margin: "0 auto", display: "grid", gap: 24, gridTemplateColumns: "1fr" },
  h3: { fontSize: 28, margin: 0, fontWeight: 800, color: "#40e0d0", textShadow: "0 0 20px rgba(64, 224, 208, 0.6)" },
  text: { color: "#40e0d0", marginTop: 8, opacity: 0.9 },
  ctaRow: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" },
  bullets: { marginTop: 12, paddingLeft: 18, color: "#40e0d0", opacity: 0.9 },
  steps: { marginTop: 8, listStyle: "none", padding: 0, display: "grid", gap: 12 },
  stepItem: { display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid #eee", borderRadius: 12, padding: 16 },
  stepNum: { height: 32, width: 32, borderRadius: 999, background: "#111", color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700 },
  stepTitle: { fontWeight: 700 },
  stepSub: { color: "#555", fontSize: 14, marginTop: 2 },

  /* Footer */
  footer: { borderTop: "1px solid #eee", marginTop: 24 },
  logoSmall: { height: 32, width: 32, display: "grid", placeItems: "center", borderRadius: 16, background: "rgba(26, 26, 46, 0.9)", color: "#40e0d0", fontWeight: 800, border: "2px solid rgba(64, 224, 208, 0.5)", boxShadow: "0 0 10px rgba(64, 224, 208, 0.3)" },
  brandStrong: { fontWeight: 800, marginLeft: 8, color: "#40e0d0", textShadow: "0 0 15px rgba(64, 224, 208, 0.6)" },
  footerHead: { fontWeight: 800, marginBottom: 8 },
  footerList: { margin: 0, paddingLeft: 16, lineHeight: 1.9 },
  footerLink: { color: "#ffffff", textDecoration: "none", opacity: 0.9 },
  textMuted: { color: "#ffffff", marginTop: 8, fontSize: 14, opacity: 0.9 },
  copy: { padding: "14px 0", borderTop: "1px solid #eee", textAlign: "center", fontSize: 12, color: "#666" },

  /* Venditori in Tendenza */
  sectionTrending: { 
    padding: "48px 16px", 
    borderTop: "1px solid #eee", 
    background: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)"
  },
  trendingHeader: { 
    display: "flex", 
    alignItems: "center", 
    gap: 12, 
    marginBottom: 8 
  },
  premiumBadge: { 
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)", 
    color: "white", 
    padding: "4px 12px", 
    borderRadius: 20, 
    fontSize: 12, 
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)"
  },
  trendingSubtitle: { 
    color: "#92400e", 
    fontSize: 16, 
    margin: "0 0 24px 0",
    fontWeight: 500
  },
  trendingSellersGrid: { 
    display: "grid", 
    gap: 20, 
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    marginBottom: 32
  },
  trendingSellerCard: { 
    background: "white", 
    border: "2px solid #fbbf24", 
    borderRadius: 16, 
    padding: 20,
    position: "relative",
    boxShadow: "0 8px 25px rgba(251, 191, 36, 0.15)",
    transition: "transform 0.2s ease",
    cursor: "pointer"
  },
  trendingRank: { 
    position: "absolute", 
    top: -10, 
    right: 12, 
    background: "#fbbf24", 
    color: "white", 
    width: 28, 
    height: 28, 
    borderRadius: "50%", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: 14, 
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
  },
  sellerAvatar: { 
    position: "relative", 
    width: 64, 
    height: 64, 
    margin: "0 auto 16px auto" 
  },
  avatarImg: { 
    width: "100%", 
    height: "100%", 
    borderRadius: "50%", 
    objectFit: "cover",
    border: "3px solid #fbbf24"
  },
  verifiedBadge: { 
    position: "absolute", 
    bottom: 0, 
    right: 0, 
    background: "#10b981", 
    color: "white", 
    width: 20, 
    height: 20, 
    borderRadius: "50%", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    fontSize: 12, 
    fontWeight: 700 
  },
  sellerInfo: { 
    textAlign: "center" 
  },
  sellerName: { 
    fontSize: 18, 
    fontWeight: 700, 
    color: "#40e0d0", 
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    textShadow: "0 0 10px rgba(64, 224, 208, 0.5)"
  },
  trendingIcon: { 
    fontSize: 16 
  },
  sellerSpecialty: { 
    color: "#40e0d0", 
    fontSize: 14, 
    marginBottom: 16,
    textShadow: "0 0 8px rgba(64, 224, 208, 0.4)"
  },
  sellerStats: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr 1fr", 
    gap: 8, 
    marginBottom: 16,
    padding: "12px 0",
    borderTop: "1px solid #f1f5f9",
    borderBottom: "1px solid #f1f5f9"
  },
  stat: { 
    textAlign: "center" 
  },
  statNumber: { 
    display: "block", 
    fontSize: 14, 
    fontWeight: 700, 
    color: "#ffffff",
    textShadow: "0 0 10px rgba(64, 224, 208, 0.5)"
  },
  statLabel: { 
    fontSize: 11, 
    color: "#ffffff", 
    textTransform: "uppercase", 
    letterSpacing: 0.5,
    opacity: 0.8,
    textShadow: "0 0 8px rgba(64, 224, 208, 0.3)"
  },
  followBtn: { 
    width: "100%", 
    padding: "10px 16px", 
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)", 
    color: "white", 
    border: "none", 
    borderRadius: 8, 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: "pointer",
    transition: "transform 0.2s ease"
  },
  trendingCta: { 
    textAlign: "center", 
    padding: "24px", 
    background: "rgba(251, 191, 36, 0.1)", 
    borderRadius: 16, 
    border: "1px solid rgba(251, 191, 36, 0.3)" 
  },
  trendingCtaText: { 
    margin: "0 0 16px 0", 
    color: "#92400e", 
    fontSize: 16 
  },
  btnTrendingCta: { 
    padding: "12px 24px", 
    background: "#6e3aff", 
    color: "white", 
    border: "none", 
    borderRadius: 8, 
    fontSize: 16, 
    fontWeight: 600, 
    cursor: "pointer",
    transition: "background 0.2s ease"
  },

  // Social Feed Styles
  sectionSocial: { 
    padding: "60px 16px", 
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" 
  },
  socialHeader: { 
    textAlign: "center", 
    marginBottom: "48px" 
  },
  socialSubtitle: { 
    fontSize: "16px", 
    color: "#64748b", 
    marginTop: "8px" 
  },
  postsGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
    gap: "24px", 
    marginBottom: "32px" 
  },
  postCard: { 
    background: "#ffffff", 
    borderRadius: "16px", 
    border: "1px solid #e2e8f0", 
    overflow: "hidden", 
    transition: "all 0.3s ease", 
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)" 
  },
  postHeader: { 
    padding: "16px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderBottom: "1px solid #f1f5f9" 
  },
  postAuthor: { 
    display: "flex", 
    alignItems: "center", 
    gap: "12px" 
  },
  postAvatar: { 
    width: "40px", 
    height: "40px", 
    borderRadius: "50%", 
    objectFit: "cover" 
  },
  authorInfo: { 
    display: "flex", 
    flexDirection: "column" 
  },
  authorName: { 
    fontWeight: "600", 
    fontSize: "14px", 
    color: "#1e293b" 
  },
  postTime: { 
    fontSize: "12px", 
    color: "#64748b" 
  },
  liveBadge: { 
    background: "#ef4444", 
    color: "white", 
    padding: "4px 8px", 
    borderRadius: "12px", 
    fontSize: "12px", 
    fontWeight: "bold" 
  },
  postContent: { 
    padding: "16px" 
  },
  postText: { 
    margin: "0 0 12px 0", 
    fontSize: "14px", 
    lineHeight: "1.5", 
    color: "#334155" 
  },
  postImages: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
    gap: "8px" 
  },
  postImage: { 
    width: "100%", 
    height: "120px", 
    objectFit: "cover", 
    borderRadius: "8px" 
  },
  postFooter: { 
    padding: "16px", 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderTop: "1px solid #f1f5f9" 
  },
  postStats: { 
    display: "flex", 
    gap: "16px" 
  },
  postStat: { 
    fontSize: "12px", 
    color: "#64748b", 
    display: "flex", 
    alignItems: "center", 
    gap: "4px" 
  },
  postCta: { 
    background: "#40e0d0", 
    color: "#0f172a", 
    padding: "6px 12px", 
    borderRadius: "8px", 
    textDecoration: "none", 
    fontSize: "12px", 
    fontWeight: "bold", 
    transition: "all 0.2s ease" 
  },
  loadingContainer: { 
    textAlign: "center", 
    padding: "48px" 
  },
  loadingText: { 
    fontSize: "16px", 
    color: "#64748b" 
  },
  emptyState: { 
    textAlign: "center", 
    padding: "48px", 
    background: "#ffffff", 
    borderRadius: "16px", 
    border: "1px solid #e2e8f0" 
  },
  emptyIcon: { 
    fontSize: "48px", 
    marginBottom: "16px" 
  },
  emptyTitle: { 
    fontSize: "18px", 
    fontWeight: "bold", 
    color: "#1e293b", 
    marginBottom: "8px" 
  },
  emptyText: { 
    fontSize: "14px", 
    color: "#64748b", 
    marginBottom: "24px" 
  },
  emptyAction: { 
    background: "#40e0d0", 
    color: "#0f172a", 
    border: "none", 
    padding: "12px 24px", 
    borderRadius: "8px", 
    fontWeight: "bold", 
    cursor: "pointer" 
  },
  socialCta: { 
    textAlign: "center" 
  },
  btnSocialCta: { 
    background: "linear-gradient(135deg, #40e0d0, #0891b2)", 
    color: "#ffffff", 
    border: "none", 
    padding: "12px 32px", 
    borderRadius: "8px", 
    fontWeight: "bold", 
    cursor: "pointer", 
    fontSize: "16px", 
    transition: "all 0.3s ease" 
  }
};
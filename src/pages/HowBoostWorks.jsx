// src/pages/HowBoostWorks.jsx
import React from "react";
import Footer from "../components/Footer";

export default function HowBoostWorks() {
  return (
    <>
      
      <main className="container" style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
        {/* HERO SECTION */}
        <div style={{
          background: "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)",
          borderRadius: 24,
          padding: 48,
          color: "white",
          textAlign: "center",
          marginBottom: 48,
          boxShadow: "0 12px 40px rgba(110, 58, 255, 0.3)"
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
          <h1 style={{ 
            margin: "0 0 16px 0", 
            fontSize: 42, 
            fontWeight: 800,
            lineHeight: 1.1
          }}>
            Come Funzionano i Boost
          </h1>
          <p style={{ 
            fontSize: 20, 
            opacity: 0.9, 
            maxWidth: 600,
            margin: "0 auto"
          }}>
            Sistema di priorità BIDLi per far apparire i tuoi contenuti in cima al feed
          </p>
        </div>

        {/* ALGORITMO SECTION */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginBottom: 24,
            textAlign: "center",
            color: "#2d3748"
          }}>
            🧠 L'Algoritmo Intelligente
          </h2>
          
          <div style={{
            background: "#f8fafc",
            borderRadius: 20,
            padding: 32,
            marginBottom: 32,
            border: "2px solid #e2e8f0"
          }}>
            <p style={{ fontSize: 18, lineHeight: 1.6, marginBottom: 24, color: "#4a5568" }}>
              Il nostro algoritmo calcola automaticamente un <strong>punteggio base</strong> per ogni contenuto 
              basandosi su metriche reali di engagement. I boost moltiplicano questo punteggio!
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "2px solid #fed7aa",
                borderLeft: "6px solid #d97706"
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#d97706", fontSize: 18, fontWeight: 700 }}>
                  📺 Live Stream
                </h4>
                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#6b7280" }}>
                  Punteggio base calcolato su:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#4a5568" }}>
                  <li>Numero di spettatori in tempo reale</li>
                  <li>Offerte ricevute durante la live</li>
                  <li>Valore totale delle offerte</li>
                  <li>Durata della live</li>
                  <li>Like, commenti, condivisioni</li>
                </ul>
              </div>
              
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "2px solid #c7d2fe",
                borderLeft: "6px solid #4c2bd1"
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#4c2bd1", fontSize: 18, fontWeight: 700 }}>
                  📝 Post
                </h4>
                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#6b7280" }}>
                  Punteggio base calcolato su:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#4a5568" }}>
                  <li>Visualizzazioni del post</li>
                  <li>Like, commenti, condivisioni</li>
                  <li>Salvataggi e click sui link</li>
                  <li>Tempo di permanenza</li>
                </ul>
              </div>
              
              <div style={{
                background: "#fff",
                borderRadius: 16,
                padding: 24,
                border: "2px solid #86efac",
                borderLeft: "6px solid #16a34a"
              }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#16a34a", fontSize: 18, fontWeight: 700 }}>
                  👤 Profilo
                </h4>
                <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#6b7280" }}>
                  Punteggio base calcolato su:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#4a5568" }}>
                  <li>Numero di follower</li>
                  <li>Vendite completate</li>
                  <li>Rating e recensioni</li>
                  <li>Visite al profilo</li>
                  <li>Anzianità dell'account</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PREZZI E MOLTIPLICATORI */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginBottom: 24,
            textAlign: "center",
            color: "#2d3748"
          }}>
            💰 Prezzi e Moltiplicatori
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            <div style={{
              background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
              border: "3px solid #fed7aa",
              borderRadius: 20,
              padding: 32,
              textAlign: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: "#d97706" }}>
                Boost x2
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#d97706", marginBottom: 16 }}>
                €9.99
              </div>
              <p style={{ margin: 0, fontSize: 16, color: "#92400e" }}>
                Raddoppia il tuo punteggio base
              </p>
            </div>
            
            <div style={{
              background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
              border: "3px solid #c7d2fe",
              borderRadius: 20,
              padding: 32,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              transform: "scale(1.05)",
              boxShadow: "0 12px 40px rgba(79, 70, 229, 0.3)"
            }}>
              <div style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#4f46e5",
                color: "white",
                padding: "4px 12px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700
              }}>
                POPOLARE
              </div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: "#4c2bd1" }}>
                Boost x5
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#4c2bd1", marginBottom: 16 }}>
                €14.99
              </div>
              <p style={{ margin: 0, fontSize: 16, color: "#3730a3" }}>
                Quintuplica il tuo punteggio base
              </p>
            </div>
            
            <div style={{
              background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
              border: "3px solid #fca5a5",
              borderRadius: 20,
              padding: 32,
              textAlign: "center",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
                Boost x10
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#dc2626", marginBottom: 16 }}>
                €19.99
              </div>
              <p style={{ margin: 0, fontSize: 16, color: "#991b1b" }}>
                Moltiplica per 10 il tuo punteggio
              </p>
            </div>
          </div>
        </section>

        {/* ESEMPIO PRATICO */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginBottom: 24,
            textAlign: "center",
            color: "#2d3748"
          }}>
            📊 Esempio Pratico
          </h2>
          
          <div style={{
            background: "#fff",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #f0f0f0"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }}>
              <div>
                <h4 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
                  🎯 Live con 50 spettatori + 10 offerte
                </h4>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: "#6b7280" }}>Punteggio base:</span>
                  <strong style={{ marginLeft: 8, color: "#2d3748" }}>800 punti</strong>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: "#6b7280" }}>Con boost x5:</span>
                  <strong style={{ marginLeft: 8, color: "#4c2bd1" }}>4.000 punti</strong>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Posizione nel feed:</span>
                  <strong style={{ marginLeft: 8, color: "#16a34a" }}>🥇 Primo posto</strong>
                </div>
              </div>
              
              <div>
                <h4 style={{ margin: "0 0 16px 0", fontSize: 20, fontWeight: 700, color: "#2d3748" }}>
                  📱 Live con 5 spettatori + 2 offerte
                </h4>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: "#6b7280" }}>Punteggio base:</span>
                  <strong style={{ marginLeft: 8, color: "#2d3748" }}>250 punti</strong>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: "#6b7280" }}>Con boost x10:</span>
                  <strong style={{ marginLeft: 8, color: "#dc2626" }}>2.500 punti</strong>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>Posizione nel feed:</span>
                  <strong style={{ marginLeft: 8, color: "#f59e0b" }}>🥈 Secondo posto</strong>
                </div>
              </div>
            </div>
            
            <div style={{
              background: "#dcfce7",
              border: "2px solid #86efac",
              borderRadius: 16,
              padding: 20,
              marginTop: 24,
              textAlign: "center"
            }}>
              <p style={{ margin: 0, fontSize: 16, color: "#166534", fontWeight: 600 }}>
                💡 <strong>Sistema Equo:</strong> Il boost aiuta, ma chi ha più engagement naturale resta comunque in cima!
              </p>
            </div>
          </div>
        </section>

        {/* FATTORI AGGIUNTIVI */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginBottom: 24,
            textAlign: "center",
            color: "#2d3748"
          }}>
            ⚡ Fattori Aggiuntivi
          </h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "2px solid #e2e8f0",
              borderLeft: "6px solid #8b5cf6"
            }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#8b5cf6", fontSize: 18, fontWeight: 700 }}>
                ⏰ Decay Temporale
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: "#4a5568", lineHeight: 1.5 }}>
                I contenuti più recenti hanno punteggi più alti. Nelle prime 4 ore il punteggio è al 100%, 
                poi diminuisce gradualmente. Minimo 50% anche per contenuti vecchi.
              </p>
            </div>
            
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "2px solid #e2e8f0",
              borderLeft: "6px solid #f59e0b"
            }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#f59e0b", fontSize: 18, fontWeight: 700 }}>
                🛡️ Anti-Spam
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: "#4a5568", lineHeight: 1.5 }}>
                Limiti per evitare abusi: Live max 3 boost/30min, Post max 5 boost/2ore, 
                Profili max 1 boost/24ore. Sistema equo per tutti!
              </p>
            </div>
            
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              border: "2px solid #e2e8f0",
              borderLeft: "6px solid #10b981"
            }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#10b981", fontSize: 18, fontWeight: 700 }}>
                📈 Ottimizzazione Continua
              </h4>
              <p style={{ margin: 0, fontSize: 14, color: "#4a5568", lineHeight: 1.5 }}>
                L'algoritmo si adatta automaticamente in base a orari di traffico, 
                engagement degli utenti e performance dei contenuti.
              </p>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 24,
          padding: 48,
          textAlign: "center",
          color: "white"
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 32, fontWeight: 700 }}>
            Pronto a Boostare i tuoi Contenuti?
          </h2>
          <p style={{ margin: "0 0 32px 0", fontSize: 18, opacity: 0.9 }}>
            Inizia subito a far apparire i tuoi contenuti in cima al feed
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a 
              href="/sell" 
              className="btn"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.3)",
                color: "white",
                textDecoration: "none",
                padding: "16px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              🚀 Boost Live Stream
            </a>
            <a 
              href="/seller/boost" 
              className="btn"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.3)",
                color: "white",
                textDecoration: "none",
                padding: "16px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.2s ease"
              }}
            >
              📝 Boost Post/Profilo
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
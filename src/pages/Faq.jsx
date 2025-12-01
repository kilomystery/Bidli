import React, { useState } from "react";
import Footer from "../components/Footer";
import BackButton from '../components/BackButton';

export default function Faq() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqData = [
    {
      category: "🚀 Sistema Boost",
      questions: [
        {
          q: "Come funzionano i boost su BIDLi?",
          a: "I boost moltiplicano il punteggio del tuo contenuto nell'algoritmo di ranking. Offriamo 3 livelli: x2 (€9.99), x5 (€14.99), x10 (€19.99). Il punteggio base viene calcolato su engagement reale come spettatori, offerte, like e commenti."
        },
        {
          q: "I boost garantiscono che il mio contenuto sarà sempre primo?",
          a: "No, il sistema è equo! I boost moltiplicano il tuo punteggio base, ma chi ha più engagement naturale può comunque superarti. Ad esempio: una live con 50 spettatori + boost x5 batterà una live con 5 spettatori + boost x10."
        },
        {
          q: "Ci sono limiti ai boost per evitare spam?",
          a: "Sì, abbiamo protezioni anti-spam: Live max 3 boost ogni 30 minuti, Post max 5 boost ogni 2 ore, Profili max 1 boost ogni 24 ore. Questo mantiene il sistema equo per tutti."
        },
        {
          q: "Quanto durano i boost?",
          a: "I boost sono attivi fino alla fine della campagna. Per le live, durano tutta la trasmissione. Per i post, 24 ore. I profili vengono boostati per 7 giorni."
        },
        {
          q: "Posso cancellare un boost dopo averlo attivato?",
          a: "Puoi mettere in pausa le campagne attive dalla sezione boost del tuo dashboard, ma non è possibile ottenere rimborsi per boost già consumati."
        }
      ]
    },
    {
      category: "📺 Live Streaming",
      questions: [
        {
          q: "Come posso iniziare una live su BIDLi?",
          a: "Vai nella sezione 'Vendi' e scegli 'Vai in live ora' o 'Programma live'. Aggiungi titolo, categoria, prezzo di partenza e opzionalmente seleziona un boost. Poi clicca per andare live!"
        },
        {
          q: "Cosa serve per fare live streaming?",
          a: "Hai bisogno di una connessione internet stabile, webcam e microfono. Ti consigliamo almeno 5 Mbps in upload per una qualità ottimale."
        },
        {
          q: "Posso programmare live in anticipo?",
          a: "Sì! Usa la funzione 'Programma live' per impostare data e ora. I tuoi follower riceveranno una notifica quando inizia."
        },
        {
          q: "Come funzionano le aste durante le live?",
          a: "Imposti un prezzo di partenza e gli spettatori possono fare offerte in tempo reale. Il vincitore dell'asta può acquistare l'oggetto al termine della live."
        },
        {
          q: "Posso vendere più oggetti in una live?",
          a: "Assolutamente! Puoi presentare diversi prodotti vintage durante la stessa live e gestire aste separate per ognuno."
        }
      ]
    },
    {
      category: "💰 Vendite e Pagamenti",
      questions: [
        {
          q: "Quali commissioni applica BIDLi?",
          a: "Applichiamo una commissione del 8% sul prezzo finale di vendita più le commissioni Stripe (2.9% + €0.25 per transazione europea)."
        },
        {
          q: "Quando ricevo i pagamenti delle vendite?",
          a: "I pagamenti vengono elaborati automaticamente 2-3 giorni lavorativi dopo la conferma della vendita tramite Stripe."
        },
        {
          q: "Posso vendere solo oggetti vintage?",
          a: "Sì, BIDLi è specializzata in vintage e collectibles. Accettiamo abbigliamento vintage, sneakers rare, elettronica retro, gaming vintage, oggetti da collezione e design d'epoca."
        },
        {
          q: "Come imposto i prezzi dei miei prodotti?",
          a: "Puoi impostare prezzi fissi per i post o prezzi di partenza per le aste live. Ti consigliamo di ricercare prezzi simili sulla piattaforma per essere competitivo."
        },
        {
          q: "Cosa succede se un acquirente non paga?",
          a: "Abbiamo sistemi di protezione: pagamenti anticipati per le aste e protezione acquirenti/venditori. In caso di problemi, contatta il nostro supporto."
        }
      ]
    },
    {
      category: "👤 Account e Profilo",
      questions: [
        {
          q: "Come divento un venditore su BIDLi?",
          a: "Registrati, completa il profilo con foto e descrizione, verifica la tua identità e inizia a caricare i tuoi primi prodotti vintage!"
        },
        {
          q: "Posso avere più account?",
          a: "No, è consentito un solo account per persona. Avere account multipli può comportare la sospensione."
        },
        {
          q: "Come migliorare la visibilità del mio profilo?",
          a: "Completa tutto il profilo, carica foto di qualità, mantieni un rating alto, interagisci con la community e considera il boost profilo per maggiore visibilità."
        },
        {
          q: "Posso modificare il mio username?",
          a: "L'username può essere modificato una volta ogni 30 giorni dalle impostazioni account."
        },
        {
          q: "Come attivare l'autenticazione a due fattori?",
          a: "Vai in Impostazioni > Sicurezza e attiva la 2FA. Ti consigliamo vivamente di abilitarla per proteggere il tuo account."
        }
      ]
    },
    {
      category: "📱 Funzionalità Social",
      questions: [
        {
          q: "Come funzionano le Stories su BIDLi?",
          a: "Puoi pubblicare Stories di 24 ore per mostrare anteprime dei prodotti, dietro le quinte o annunci. Le Stories appaiono in cima al feed dei tuoi follower."
        },
        {
          q: "Posso pubblicare post come Instagram?",
          a: "Sì! Pubblica foto e video dei tuoi prodotti vintage con descrizioni. I post restano sul tuo profilo e possono essere boostati per maggiore visibilità."
        },
        {
          q: "Come funziona il feed discover?",
          a: "Il feed mostra contenuti personalizzati basati sui tuoi interessi, venditori che segui e trend del momento. L'algoritmo premia engagement e qualità."
        },
        {
          q: "Posso seguire altri venditori?",
          a: "Certo! Segui i venditori che ti interessano per vedere i loro contenuti nel feed e ricevere notifiche delle loro live."
        },
        {
          q: "Come funzionano i commenti e i like?",
          a: "Puoi interagire con like e commenti su post e live. L'engagement aiuta i contenuti ad apparire più in alto nel feed."
        }
      ]
    },
    {
      category: "🛡️ Sicurezza e Privacy",
      questions: [
        {
          q: "I miei dati sono al sicuro?",
          a: "Sì, usiamo crittografia avanzata e seguiamo le normative GDPR. I dati di pagamento sono gestiti da Stripe, leader mondiale nella sicurezza dei pagamenti."
        },
        {
          q: "Come segnalare contenuti inappropriati?",
          a: "Usa il pulsante 'Segnala' su qualsiasi contenuto. Il nostro team modera 24/7 per mantenere la community sicura."
        },
        {
          q: "Posso bloccare altri utenti?",
          a: "Sì, puoi bloccare utenti che ti disturbano dalle impostazioni privacy. Non potranno più vedere i tuoi contenuti o contattarti."
        },
        {
          q: "Come proteggersi dalle truffe?",
          a: "Non condividere mai dati personali/bancari fuori dalla piattaforma. Usa solo i sistemi di pagamento integrati. Segnala comportamenti sospetti."
        },
        {
          q: "Posso rendere privato il mio profilo?",
          a: "I profili venditori sono pubblici per natura commerciale, ma puoi controllare chi può contattarti privatamente dalle impostazioni privacy."
        }
      ]
    },
    {
      category: "⚙️ Problemi Tecnici",
      questions: [
        {
          q: "La live non si avvia, cosa faccio?",
          a: "Controlla la connessione internet, ricarica la pagina, verifica i permessi camera/microfono del browser. Se persiste, contatta il supporto."
        },
        {
          q: "Le immagini non si caricano",
          a: "Verifica che le immagini siano in formato JPG/PNG, sotto i 10MB. Prova a ridimensionare o comprimere le foto."
        },
        {
          q: "Non ricevo le notifiche",
          a: "Controlla le impostazioni notifiche del browser e dell'app. Assicurati di aver autorizzato le notifiche per BIDLi."
        },
        {
          q: "Il sito è lento, perché?",
          a: "Potrebbe essere la tua connessione o traffico elevato. Prova a ricaricare la pagina o pulire la cache del browser."
        },
        {
          q: "Come contattare il supporto tecnico?",
          a: "Usa il form di contatto nella sezione Help o scrivi a support@BIDLi. Rispondiamo entro 24 ore."
        }
      ]
    }
  ];

  const toggleFaq = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <>
      
      <main className="container" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <BackButton to="/discover" style={{ marginBottom: '32px' }} />
        {/* HERO SECTION */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 24,
          padding: 48,
          color: "white",
          textAlign: "center",
          marginBottom: 48,
          boxShadow: "0 12px 40px rgba(102, 126, 234, 0.3)"
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❓</div>
          <h1 style={{ 
            margin: "0 0 16px 0", 
            fontSize: 42, 
            fontWeight: 800,
            lineHeight: 1.1
          }}>
            Domande Frequenti
          </h1>
          <p style={{ 
            fontSize: 20, 
            opacity: 0.9, 
            maxWidth: 600,
            margin: "0 auto"
          }}>
            Tutto quello che devi sapere su BIDLi, boost, live streaming e vendite vintage
          </p>
        </div>

        {/* FAQ CATEGORIES */}
        {faqData.map((category, categoryIndex) => (
          <section key={categoryIndex} style={{ marginBottom: 48 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 24,
              color: "#2d3748",
              paddingBottom: 12,
              borderBottom: "3px solid #e2e8f0"
            }}>
              {category.category}
            </h2>
            
            <div style={{ display: "grid", gap: 16 }}>
              {category.questions.map((faq, questionIndex) => {
                const isOpen = openFaq === `${categoryIndex}-${questionIndex}`;
                
                return (
                  <div
                    key={questionIndex}
                    style={{
                      background: "#fff",
                      borderRadius: 16,
                      border: "2px solid #f0f0f0",
                      overflow: "hidden",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <button
                      onClick={() => toggleFaq(categoryIndex, questionIndex)}
                      style={{
                        width: "100%",
                        padding: 24,
                        background: isOpen ? "#f8fafc" : "white",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#2d3748",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <span>{faq.q}</span>
                      <span style={{
                        fontSize: 24,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: "#667eea"
                      }}>
                        ▼
                      </span>
                    </button>
                    
                    {isOpen && (
                      <div style={{
                        padding: "0 24px 24px 24px",
                        fontSize: 16,
                        lineHeight: 1.6,
                        color: "#4a5568",
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0"
                      }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* CTA SECTION */}
        <section style={{
          background: "linear-gradient(135deg, #6e3aff 0%, #4c2bd1 100%)",
          borderRadius: 24,
          padding: 48,
          textAlign: "center",
          color: "white",
          marginTop: 48
        }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 32, fontWeight: 700 }}>
            Non hai trovato la risposta?
          </h2>
          <p style={{ margin: "0 0 32px 0", fontSize: 18, opacity: 0.9 }}>
            Il nostro team è qui per aiutarti
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a 
              href="/help" 
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
              📞 Contatta il Supporto
            </a>
            <a 
              href="/how-boost-works" 
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
              🚀 Scopri i Boost
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
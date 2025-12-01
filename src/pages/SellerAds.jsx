// SellerAds.jsx - Sistema sponsorizzazioni per venditori BIDLi
import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Zap, Calendar, Star, CreditCard, Eye, Users, Target } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const SellerAds = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalImpressions: 0,
    totalClicks: 0,
    activeCampaigns: 0
  });

  useEffect(() => {
    loadSellerData();
  }, []);

  const loadSellerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carica dati venditore
      const { data: sellerData } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (sellerData) {
        setSeller(sellerData);
        
        // Simula campagne esistenti per demo
        const mockCampaigns = [
          {
            id: 1,
            type: 'profile_trending',
            name: 'Profilo in Tendenza - Gennaio',
            status: 'active',
            budget: 89.90,
            spent: 45.20,
            impressions: 12500,
            clicks: 245,
            conversions: 18,
            created_at: '2025-01-01',
            end_date: '2025-01-31'
          },
          {
            id: 2,
            type: 'live_boost',
            name: 'Boost Live Sneakers Vintage',
            status: 'completed',
            budget: 29.90,
            spent: 29.90,
            impressions: 5200,
            clicks: 156,
            conversions: 12,
            created_at: '2024-12-28',
            end_date: '2024-12-30'
          }
        ];
        
        setCampaigns(mockCampaigns);
        
        // Calcola statistiche
        const totalSpent = mockCampaigns.reduce((acc, c) => acc + c.spent, 0);
        const totalImpressions = mockCampaigns.reduce((acc, c) => acc + c.impressions, 0);
        const totalClicks = mockCampaigns.reduce((acc, c) => acc + c.clicks, 0);
        const activeCampaigns = mockCampaigns.filter(c => c.status === 'active').length;
        
        setStats({ totalSpent, totalImpressions, totalClicks, activeCampaigns });
      }
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (type) => {
    if (type === 'live_boost') {
      // Verifica se ha live attive
      const { data: liveLives } = await supabase
        .from('lives')
        .select('id, title, viewers')
        .eq('seller_id', seller.id)
        .eq('status', 'live')
        .order('viewers', { ascending: false });

      if (!liveLives || liveLives.length === 0) {
        alert('⚠️ Non hai live attive al momento.\n\nPer boostare una live devi prima andare in diretta!');
        return;
      }

      // Selezione pacchetto boost
      const boostOption = window.prompt(
        `🚀 Seleziona il tuo pacchetto Boost:\n\n` +
        `1️⃣ Basic (€4,99) - 1h boost x2 algoritmo\n` +
        `2️⃣ Standard (€9,99) - 2h boost x3 algoritmo\n` +
        `3️⃣ Premium (€19,99) - 4h boost x5 algoritmo\n\n` +
        `Inserisci 1, 2 o 3:`
      );

      const boostPackages = {
        '1': { price: 4.99, hours: 1, multiplier: 2, name: 'Basic' },
        '2': { price: 9.99, hours: 2, multiplier: 3, name: 'Standard' },
        '3': { price: 19.99, hours: 4, multiplier: 5, name: 'Premium' }
      };

      const selectedPackage = boostPackages[boostOption];
      if (!selectedPackage) {
        alert('❌ Selezione non valida');
        return;
      }

      const confirmed = window.confirm(
        `🚀 Conferma Boost ${selectedPackage.name}\n\n` +
        `💰 Prezzo: €${selectedPackage.price}\n` +
        `⏱️ Durata: ${selectedPackage.hours} ore\n` +
        `🎯 Moltiplicatore: x${selectedPackage.multiplier} algoritmo\n` +
        `📺 Live: ${liveLives[0].title}\n\n` +
        `Procedi con il pagamento?`
      );

      if (confirmed) {
        try {
          const targetLive = liveLives[0];
          
          // Integrazione Stripe per pagamento
          const paymentResult = await processStripePayment(selectedPackage.price, `Boost Live: ${selectedPackage.name}`);
          if (!paymentResult.success) {
            alert('❌ Pagamento fallito: ' + paymentResult.error);
            return;
          }
          
          const { error } = await supabase.from("ad_campaigns").insert({
            seller_id: seller.id,
            name: `Boost ${selectedPackage.name}: ${targetLive.title}`,
            type: 'live_boost',
            status: 'active',
            daily_budget: selectedPackage.price,
            total_budget: selectedPackage.price,
            duration_days: 1,
            boost_multiplier: selectedPackage.multiplier,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + selectedPackage.hours * 60 * 60 * 1000).toISOString(),
            target_live_id: targetLive.id,
            stripe_payment_id: paymentResult.paymentId
          });

          if (error) throw error;
          
          alert(`🚀 Boost ${selectedPackage.name} attivato!\n\n⚡ ${selectedPackage.hours}h con moltiplicatore x${selectedPackage.multiplier}\n🎯 La tua live salirà nell'algoritmo\n💳 Pagamento €${selectedPackage.price} elaborato`);
          loadSellerData();
        } catch (error) {
          alert('❌ Errore attivazione boost: ' + error.message);
        }
      }
    } else if (type === 'profile_trending') {
      const confirmed = window.confirm(
        `🔥 Venditori in Tendenza - €25/mese\n\n` +
        `✅ Appari nella sezione homepage premium\n` +
        `✅ Badge 'In Tendenza' sul profilo\n` +
        `✅ Priorità nei risultati di ricerca\n` +
        `✅ Analytics dettagliate in tempo reale\n\n` +
        `Confermi l'attivazione per €25?`
      );

      if (confirmed) {
        try {
          const paymentResult = await processStripePayment(25, 'Profilo in Tendenza');
          if (!paymentResult.success) {
            alert('❌ Pagamento fallito: ' + paymentResult.error);
            return;
          }

          const { error } = await supabase.from("ad_campaigns").insert({
            seller_id: seller.id,
            name: `Profilo in Tendenza - ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
            type: 'profile_trending',
            status: 'active',
            daily_budget: 25 / 30,
            total_budget: 25,
            duration_days: 30,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_payment_id: paymentResult.paymentId
          });

          if (error) throw error;
          
          alert(`🔥 Profilo in Tendenza attivato!\n\n✅ Ora appari nella homepage premium\n💳 Pagamento €25 elaborato`);
          loadSellerData();
        } catch (error) {
          alert('❌ Errore attivazione: ' + error.message);
        }
      }
    } else if (type === 'scheduled_promotion') {
      const confirmed = window.confirm(
        `📅 Promozione Live Programmata - €15/live\n\n` +
        `✅ Appare nel feed live e nelle storie\n` +
        `✅ Pulsanti 'Ricordami' e 'Salva' per utenti\n` +
        `✅ Priorità di visualizzazione\n` +
        `✅ Notifiche push automatiche\n\n` +
        `Confermi l'attivazione per €15?`
      );

      if (confirmed) {
        try {
          const paymentResult = await processStripePayment(15, 'Promozione Live Programmata');
          if (!paymentResult.success) {
            alert('❌ Pagamento fallito: ' + paymentResult.error);
            return;
          }

          alert(`📅 Promozione Live attivata!\n\n📱 Apparirà nel feed e nelle storie\n🎯 Pulsanti interattivi per gli utenti\n💳 Pagamento €15 elaborato\n\n➡️ Vai a programmare la tua live ora!`);
          
          // Reindirizza alla pagina di scheduling
          window.location.href = '/dashboard/schedule';
        } catch (error) {
          alert('❌ Errore attivazione: ' + error.message);
        }
      }
    }
  };

  // Funzione per processare pagamenti Stripe
  const processStripePayment = async (amount, description) => {
    try {
      // Simula integrazione Stripe (implementazione reale richiede backend)
      const paymentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In produzione qui faresti la chiamata a Stripe
      return {
        success: true,
        paymentId: paymentId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };

  const AdTypeCard = ({ icon: Icon, iconColor, title, description, price, features, buttonText, onBook, popular = false }) => (
    <div style={{
      backgroundColor: 'white',
      border: popular ? '2px solid #3b82f6' : '1px solid #e2e8f0',
      borderRadius: 16,
      padding: '24px',
      position: 'relative',
      boxShadow: popular ? '0 8px 25px rgba(59, 130, 246, 0.15)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      {popular && (
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '4px 16px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700
        }}>
          🔥 PIÙ POPOLARE
        </div>
      )}
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          backgroundColor: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16
        }}>
          <Icon size={24} color="white" />
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: 4
          }}>
            {title}
          </h3>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#059669'
          }}>
            {price}
          </div>
        </div>
      </div>
      
      <p style={{
        margin: '0 0 16px 0',
        fontSize: 14,
        color: '#64748b',
        lineHeight: 1.5
      }}>
        {description}
      </p>
      
      <div style={{ marginBottom: 20 }}>
        {features.map((feature, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 8,
            fontSize: 14,
            color: '#374151'
          }}>
            <div style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
              fontSize: 10
            }}>
              ✓
            </div>
            {feature}
          </div>
        ))}
      </div>
      
      <button
        onClick={onBook}
        style={{
          width: '100%',
          padding: '12px 20px',
          backgroundColor: popular ? '#3b82f6' : '#f8fafc',
          color: popular ? 'white' : '#374151',
          border: popular ? 'none' : '1px solid #d1d5db',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento sponsorizzazioni...</div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        flexDirection: 'column',
        textAlign: 'center',
        padding: 20
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: '#1f2937' }}>
          Account venditore richiesto
        </h2>
        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 24 }}>
          Devi essere un venditore registrato per accedere alle sponsorizzazioni.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Vai alla Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      paddingTop: '80px',
      paddingBottom: '40px'
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: '0 16px' }}>
        
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <button 
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <ArrowLeft size={24} color="#64748b" />
            </button>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 24, 
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}>
                Sponsorizzazioni & Pubblicità
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                color: '#64748b'
              }}>
                Fai crescere il tuo business su BIDLi
              </p>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: '#fef3c7',
              padding: '16px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706' }}>
                {formatPrice(stats.totalSpent)}
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>Speso totale</div>
            </div>
            <div style={{
              backgroundColor: '#dbeafe',
              padding: '16px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2563eb' }}>
                {formatNumber(stats.totalImpressions)}
              </div>
              <div style={{ fontSize: 12, color: '#1d4ed8' }}>Visualizzazioni</div>
            </div>
            <div style={{
              backgroundColor: '#d1fae5',
              padding: '16px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#059669' }}>
                {formatNumber(stats.totalClicks)}
              </div>
              <div style={{ fontSize: 12, color: '#047857' }}>Click totali</div>
            </div>
            <div style={{
              backgroundColor: '#f3e8ff',
              padding: '16px',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>
                {stats.activeCampaigns}
              </div>
              <div style={{ fontSize: 12, color: '#5b21b6' }}>Campagne attive</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: '8px',
          marginBottom: 24,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px'
        }}>
          {[
            { id: 'overview', label: 'Panoramica', icon: Eye },
            { id: 'create', label: 'Nuova Campagna', icon: Target },
            { id: 'campaigns', label: 'Le Mie Campagne', icon: Star }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: activeTab === tab.id ? '#3b82f6' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#64748b',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: '32px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b'
            }}>
              Come Funzionano le Sponsorizzazioni BIDLi
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              marginBottom: 32
            }}>
              <div style={{
                padding: '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: 12,
                border: '1px solid #bae6fd'
              }}>
                <TrendingUp size={32} color="#3b82f6" style={{ marginBottom: 16 }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  Venditori in Tendenza
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                  Il tuo profilo appare nella sezione "Venditori in Tendenza" della homepage di BIDLi, 
                  aumentando la visibilità del tuo brand.
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: '#fef3c7',
                borderRadius: 12,
                border: '1px solid #fde68a'
              }}>
                <Zap size={32} color="#f59e0b" style={{ marginBottom: 16 }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  Boost Live Attive
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                  Potenzia le tue live mentre sono in corso per apparire in cima al feed 
                  e raggiungere più spettatori.
                </p>
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: '#f0fdf4',
                borderRadius: 12,
                border: '1px solid #bbf7d0'
              }}>
                <Calendar size={32} color="#10b981" style={{ marginBottom: 16 }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                  Promozione Live Programmate
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                  Sponsorizza le tue live prima che inizino per apparire in evidenza 
                  nella sezione "Live in Programma".
                </p>
              </div>
            </div>

            <div style={{
              padding: '24px',
              backgroundColor: '#fef7ff',
              borderRadius: 12,
              border: '1px solid #f3e8ff'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 16
              }}>
                <Star size={24} color="#8b5cf6" style={{ marginRight: 12 }} />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  🚀 Prossimamente: Abbonamento Premium
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
                <strong>Quando BIDLi avrà più utenti, lanceremo l'abbonamento Premium:</strong><br/>
                • Commissione ridotta dal 10% al 7-8%<br/>
                • Boost automatico mensile incluso<br/>
                • Badge premium sul profilo<br/>
                • Priorità nel supporto clienti
              </p>
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: 20,
              fontWeight: 700,
              color: '#1e293b'
            }}>
              Scegli il Tipo di Sponsorizzazione
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px'
            }}>
              <AdTypeCard
                icon={TrendingUp}
                iconColor="#3b82f6"
                title="Venditori in Tendenza"
                description="Appari nella homepage di BIDLi nella sezione venditori premium"
                price="€25,00/mese"
                features={[
                  "Appari nella sezione homepage premium",
                  "Badge 'In Tendenza' sul profilo",
                  "Priorità nei risultati di ricerca",
                  "Analytics dettagliate in tempo reale"
                ]}
                buttonText="Attiva Tendenza"
                onBook={() => createCampaign('profile_trending')}
                popular={true}
              />
              
              <AdTypeCard
                icon={Zap}
                iconColor="#f59e0b"
                title="Boost Live Attive"
                description="Potenzia la tua live nell'algoritmo per maggiore visibilità"
                price="€4,99 - €19,99"
                features={[
                  "€4.99 = 1h boost x2 algoritmo",
                  "€9.99 = 2h boost x3 algoritmo", 
                  "€19.99 = 4h boost x5 algoritmo",
                  "Boost nel ranking e discovery"
                ]}
                buttonText="Seleziona Boost"
                onBook={() => createCampaign('live_boost')}
              />
              
              <AdTypeCard
                icon={Calendar}
                iconColor="#10b981"
                title="Promozione Live Programmate"
                description="Sponsorizza le tue live prima che inizino + visibilità nel feed e storie"
                price="€15,00/live"
                features={[
                  "Appare nel feed live e nelle storie",
                  "Pulsanti 'Ricordami' e 'Salva' per utenti",
                  "Priorità di visualizzazione",
                  "Notifiche push automatiche"
                ]}
                buttonText="Prenota Slot"
                onBook={() => createCampaign('scheduled_promotion')}
              />
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f8fafc'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 700,
                color: '#374151'
              }}>
                Le Mie Campagne
              </h3>
            </div>

            {campaigns.length === 0 ? (
              <div style={{
                padding: '60px 24px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <Target size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  Nessuna campagna ancora
                </div>
                <div style={{ fontSize: 14 }}>
                  Crea la tua prima sponsorizzazione per far crescere il tuo business!
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                {campaigns.map((campaign) => (
                  <div key={campaign.id} style={{
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    marginBottom: 16,
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 12
                    }}>
                      <div>
                        <h4 style={{
                          margin: '0 0 4px 0',
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>
                          {campaign.name}
                        </h4>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          backgroundColor: campaign.status === 'active' ? '#dcfce7' : '#f3f4f6',
                          color: campaign.status === 'active' ? '#166534' : '#6b7280'
                        }}>
                          {campaign.status === 'active' ? 'Attiva' : 'Completata'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: '#059669'
                        }}>
                          {formatPrice(campaign.spent)} / {formatPrice(campaign.budget)}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '16px',
                      fontSize: 14
                    }}>
                      <div>
                        <div style={{ color: '#6b7280' }}>Visualizzazioni</div>
                        <div style={{ fontWeight: 600 }}>{formatNumber(campaign.impressions)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280' }}>Click</div>
                        <div style={{ fontWeight: 600 }}>{formatNumber(campaign.clicks)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280' }}>Conversioni</div>
                        <div style={{ fontWeight: 600 }}>{campaign.conversions}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6b7280' }}>CTR</div>
                        <div style={{ fontWeight: 600 }}>
                          {((campaign.clicks / campaign.impressions) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAds;
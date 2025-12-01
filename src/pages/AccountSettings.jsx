// src/pages/AccountSettings.jsx - Centro account professionale
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { User, Shield, Bell, CreditCard, MapPin, Package, TrendingUp, DollarSign, Megaphone, Zap, Store, Banknote, Truck, HelpCircle, FileText, Lock, Mail, LogOut, Rocket } from "lucide-react";

export default function AccountSettings() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        setLoading(true);
        
        // 1) Auth check con Supabase (per user ID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.dispatchEvent(new Event("auth:open"));
          return;
        }

        setUser(user);

        // 2) Controllo seller nel database locale (STESSA LOGICA ALTRE PAGINE)
        const [sellerResponse, profileResponse] = await Promise.all([
          fetch(`/api/sellers/user/${user.id}`),
          fetch(`/api/profiles/${user.id}`)
        ]);

        let sellerData = null;
        let profile = null;

        if (sellerResponse.ok) {
          sellerData = await sellerResponse.json();
        }
        
        if (profileResponse.ok) {
          profile = await profileResponse.json();
        }

        if (sellerData) {
          console.log('✅ AccountSettings: VENDITORE TROVATO:', sellerData.display_name);
          setSeller(sellerData);
        } else if (profile?.role === 'seller') {
          console.log('⚠️ AccountSettings: Profilo seller ma senza record sellers');
          setSeller({
            id: 'temp-' + user.id,
            handle: 'temp-handle',
            display_name: profile.store_name || 'Nuovo Venditore',
            avatar_url: null
          });
        }

      } catch (err) {
        console.error("Errore caricamento account:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  // Componente per le voci del menu con icone eleganti
  const SettingsItem = ({ icon: Icon, iconColor, title, description, href }) => (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 24px',
        color: 'inherit',
        textDecoration: 'none',
        borderBottom: '1px solid #f0f0f0',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        border: '1px solid #e2e8f0'
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: 600, 
          fontSize: 16,
          color: '#1f2937',
          marginBottom: 2
        }}>
          {title}
        </div>
        <div style={{ 
          fontSize: 13, 
          color: '#64748b',
          lineHeight: 1.4
        }}>
          {description}
        </div>
      </div>
      
      <div style={{ 
        fontSize: 16, 
        color: '#cbd5e1' 
      }}>
        ›
      </div>
    </a>
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
        <div style={{ fontSize: 18, color: "#666" }}>Caricamento...</div>
      </div>
    );
  }

  if (!user) {
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
          Accesso richiesto
        </h2>
        <p style={{ color: '#64748b', fontSize: 16 }}>
          Devi effettuare l'accesso per gestire le impostazioni dell'account.
        </p>
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
      <div style={{ maxWidth: 600, margin: "0 auto", padding: '0 16px' }}>
        {/* HEADER PROFESSIONALE */}
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
            alignItems: 'center'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <User size={28} color="white" />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 24, 
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: 4
              }}>
                Impostazioni Account
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                color: '#64748b'
              }}>
                {user?.email || 'Gestisci le tue informazioni'}
              </p>
            </div>
          </div>
        </div>

        {/* MAIN SETTINGS SECTIONS */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: 24
        }}>
          
          {/* Account Section */}
          <div>
            <div style={{ 
              padding: '16px 24px', 
              fontSize: 16, 
              fontWeight: 700, 
              color: '#374151',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f8fafc'
            }}>
              Account
            </div>

            <SettingsItem
              icon={Lock}
              iconColor="#ef4444"
              title="Sicurezza"
              description="Password e impostazioni di sicurezza"
              href="/account/security"
            />
            
            <SettingsItem
              icon={User}
              iconColor="#3b82f6"
              title="Informazioni Personali"
              description="Nome, email e dati di contatto"
              href="/account/personal"
            />
            
            <SettingsItem
              icon={Bell}
              iconColor="#f59e0b"
              title="Notifiche"
              description="Preferenze email e notifiche push"
              href="/account/notifications"
            />
            
            <SettingsItem
              icon={Rocket}
              iconColor="#10b981"
              title="Completa Profilo"
              description="Compila il tuo profilo e diventa venditore"
              href="/account/complete-profile"
            />
          </div>

          {/* Shopping Section */}
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{ 
              padding: '16px 24px', 
              fontSize: 16, 
              fontWeight: 700, 
              color: '#374151',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f8fafc'
            }}>
              Shopping & Ordini
            </div>

            <SettingsItem
              icon={CreditCard}
              iconColor="#8b5cf6"
              title="Metodi di Pagamento"
              description="Carte salvate e checkout automatico"
              href="/account/payment-methods"
            />
            
            <SettingsItem
              icon={MapPin}
              iconColor="#06b6d4"
              title="Indirizzi"
              description="Indirizzi di spedizione salvati"
              href="/account/addresses"
            />
            
            <SettingsItem
              icon={Package}
              iconColor="#10b981"
              title="I Miei Ordini"
              description="Cronologia acquisti e spedizioni"
              href="/orders/my"
            />
          </div>

          {/* Seller Section (only if user is a seller) */}
          {seller && (
            <div style={{ borderTop: '1px solid #f0f0f0' }}>
              <div style={{ 
                padding: '16px 24px', 
                fontSize: 16, 
                fontWeight: 700, 
                color: '#374151',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#f8fafc'
              }}>
                Venditore
              </div>

              <SettingsItem
                icon={DollarSign}
                iconColor="#059669"
                title="Fatture e Commissioni"
                description="Gestisci fatture e commissioni BIDLi (10%)"
                href="/seller/invoices"
              />
              
              <SettingsItem
                icon={TrendingUp}
                iconColor="#3b82f6"
                title="Analytics"
                description="Performance e statistiche vendite"
                href="/seller/analytics"
              />
              
              <SettingsItem
                icon={Megaphone}
                iconColor="#f59e0b"
                title="Sponsorizzazioni"
                description="Promuovi i tuoi prodotti"
                href="/seller/ads"
              />
              
              <SettingsItem
                icon={Zap}
                iconColor="#8b5cf6"
                title="Boost Feed"
                description="Sponsorizza contenuti nel feed principale"
                href="/seller/boost"
              />
              
              <SettingsItem
                icon={Store}
                iconColor="#6366f1"
                title="Gestione Negozio"
                description="Profilo venditore e impostazioni shop"
                href="/dashboard/settings"
              />
              
              <SettingsItem
                icon={Banknote}
                iconColor="#059669"
                title="Pagamenti IBAN"
                description="Configura IBAN per ricevere pagamenti"
                href="/seller/payout-settings"
              />
              
              <SettingsItem
                icon={Truck}
                iconColor="#0ea5e9"
                title="Gestione Spedizioni"
                description="Centro ordini, etichette InPost automatiche"
                href="/orders/center"
              />
            </div>
          )}

          {/* Support Section */}
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{ 
              padding: '16px 24px', 
              fontSize: 16, 
              fontWeight: 700, 
              color: '#374151',
              borderBottom: '1px solid #f0f0f0',
              backgroundColor: '#f8fafc'
            }}>
              Supporto
            </div>

            <SettingsItem
              icon={HelpCircle}
              iconColor="#6366f1"
              title="Centro Assistenza"
              description="FAQ e supporto clienti"
              href="/help"
            />
            
            <SettingsItem
              icon={FileText}
              iconColor="#64748b"
              title="Termini e Privacy"
              description="Condizioni d'uso e informativa privacy"
              href="/terms"
            />
            
            <SettingsItem
              icon={Mail}
              iconColor="#0ea5e9"
              title="Contattaci"
              description="Assistenza diretta via email"
              href="/contact"
            />
          </div>
        </div>

        {/* Account Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          marginBottom: 24
        }}>
          {!seller && (
            <SettingsItem
              icon={Rocket}
              iconColor="#8b5cf6"
              title="Diventa Venditore"
              description="Inizia a vendere su BIDLi"
              href="/dashboard"
            />
          )}
          
          <div
            onClick={async () => {
              if (confirm("Sei sicuro di voler disconnetterti?")) {
                await supabase.auth.signOut();
                window.location.href = "/";
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '16px 24px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              borderTop: !seller ? '1px solid #f0f0f0' : 'none'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
              border: '1px solid #fecaca'
            }}>
              <LogOut size={20} color="#ef4444" />
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: 600, 
                fontSize: 16,
                color: '#ef4444',
                marginBottom: 2
              }}>
                Disconnetti
              </div>
              <div style={{ 
                fontSize: 13, 
                color: '#64748b',
                lineHeight: 1.4
              }}>
                Esci dal tuo account
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Gestendo callback autenticazione...');
        
        // Gestisci il callback OAuth (Google, Apple, etc.)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Errore callback auth:', error);
          setStatus('error');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (data?.session?.user) {
          console.log('✅ Utente autenticato:', data.session.user.email);
          setStatus('success');
          
          // Verifica se è un nuovo utente OAuth
          const isOAuth = data.session.user.app_metadata?.provider !== 'email';
          
          if (isOAuth) {
            console.log('🚀 Login OAuth completato, reindirizzamento al profilo...');
            navigate('/complete-buyer-profile?oauth=true', { replace: true });
          } else {
            console.log('📧 Verifica email completata, reindirizzamento...');
            navigate('/complete-buyer-profile?verified=true', { replace: true });
          }
        } else {
          console.log('⚠️ Nessuna sessione trovata, reindirizzamento home...');
          setStatus('no-session');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error('💥 Errore durante callback:', err);
        setStatus('error');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const statusMessages = {
    processing: {
      title: '🔄 Accesso in corso...',
      message: 'Stiamo completando l\'autenticazione con Google.',
      color: '#40e0d0'
    },
    success: {
      title: '✅ Accesso completato!',
      message: 'Reindirizzamento al tuo profilo...',
      color: '#4CAF50'
    },
    error: {
      title: '❌ Errore di autenticazione',
      message: 'Qualcosa è andato storto. Ritorno alla home...',
      color: '#f44336'
    },
    'no-session': {
      title: '⚠️ Sessione non trovata',
      message: 'Nessuna autenticazione rilevata. Ritorno alla home...',
      color: '#ff9800'
    }
  };

  const currentStatus = statusMessages[status];

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(64, 224, 208, 0.2)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 0 30px rgba(64, 224, 208, 0.3)'
      }}>
        <h2 style={{
          color: currentStatus.color,
          fontSize: '24px',
          marginBottom: '16px',
          textShadow: `0 0 10px ${currentStatus.color}`
        }}>
          {currentStatus.title}
        </h2>
        <p style={{
          color: '#40e0d0',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          {currentStatus.message}
        </p>
        
        {status === 'processing' && (
          <div style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(64, 224, 208, 0.3)',
              borderTop: '3px solid #40e0d0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
        
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}
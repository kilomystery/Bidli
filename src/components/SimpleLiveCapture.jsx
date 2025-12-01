import React, { useState, useRef, useEffect } from 'react';

// SOLUZIONE DRASTICA: Componente semplice per catturare video/audio
export default function SimpleLiveCapture({ onStreamReady, onStreamEnd }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  // Pulisci stream quando componente si smonta
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  async function startStream() {
    setError('');
    
    try {
      console.log('🚀 BOTTONE ROSSO CLICCATO - AVVIO LIVE STREAM DEFINITIVO!');
      
      // Step 1: FORZARE browser a chiedere permessi camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Step 1: Camera stream ottenuto:', mediaStream);
      console.log('Video tracks:', mediaStream.getVideoTracks());
      console.log('Audio tracks:', mediaStream.getAudioTracks());

      // Step 2: Imposta stream e mostra video locale
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Forza play del video
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Step 2: Video metadata caricato, avvio play...');
          videoRef.current.play().then(async () => {
            console.log('✅ Step 2: Video playing successfully!');
            setIsStreaming(true);
            
            // 🎯 STEP 3: CONNESSIONE E PUBLISHING LIVEKIT!
            try {
              console.log('🔗 Step 3: Connessione LiveKit per streaming...');
              
              // Importa LiveKit service
              const { LiveKitService } = await import('../lib/livekit.js');
              const liveKit = new LiveKitService();
              await liveKit.configure(
                'wss://bidli-hwm0eo5p.livekit.cloud',
                'devkey-hwm0eo5p',
                'MTJP5aR5G45zUEzNdtLY6HUcdccWy7kgC4CKA5bFwWGqwepVwHMBJJRKwBhNAJyGd1q0Y1L1rW8TCi1t3UYDdJMr'
              );
              
              // Get stream ID from URL
              const streamId = window.location.pathname.split('/').pop();
              const roomName = `live-${streamId}`;
              const participantName = `seller-${streamId}-fixed`;
              
              console.log('🔗 Connessione a room:', roomName, 'come:', participantName);
              
              await liveKit.connectToRoom(roomName, participantName, 'publisher', {
                onConnected: () => console.log('✅ Step 3: LiveKit connesso!'),
                onDisconnected: (reason) => console.log('❌ LiveKit disconnesso:', reason)
              });
              
              console.log('📡 Step 4: PUBLISHING VIDEO + AUDIO SU LIVEKIT...');
              await liveKit.startPublishing(true, true);
              console.log('🎉 Step 4: TRACKS PUBBLICATI SU LIVEKIT!');
              
              console.log('🎉 LIVE STREAM COMPLETAMENTE ATTIVO - BUYER DOVREBBERO VEDERE VIDEO!');
              
              onStreamReady?.(mediaStream);
              
            } catch (liveKitError) {
              console.error('❌ Errore LiveKit publishing:', liveKitError);
              // Continua comunque con video locale
              onStreamReady?.(mediaStream);
            }
            
          }).catch(err => {
            console.error('❌ Errore play video:', err);
            setError('Errore riproduzione video: ' + err.message);
          });
        };
        
        videoRef.current.onerror = (err) => {
          console.error('❌ Errore video element:', err);
          setError('Errore elemento video');
        };
      }

    } catch (err) {
      console.error('❌ Errore getUserMedia:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('🚫 Accesso camera/microfono negato. Abilita i permessi nelle impostazioni del browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('📷 Camera o microfono non trovati. Verifica che siano collegati.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('⚠️ Camera in uso da altra applicazione. Chiudi altre app che usano la camera.');
      } else if (err.name === 'NotSupportedError') {
        setError('❌ Browser non supporta accesso media. Usa Chrome/Firefox aggiornato.');
      } else {
        setError('❌ Errore accesso camera: ' + err.message);
      }
    }
  }

  function stopStream() {
    console.log('🛑 Fermando stream...');
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Track stopped:', track.kind);
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    const wasStreaming = isStreaming; // Salva lo stato prima di cambiarlo
    setIsStreaming(false);
    
    // Solo chiama onStreamEnd se lo stream era effettivamente attivo
    if (wasStreaming) {
      console.log('📱 Stream era attivo, chiamando onStreamEnd');
      onStreamEnd?.();
    } else {
      console.log('📱 Stream non era attivo, NON chiamando onStreamEnd');
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '20px',
      color: 'white'
    }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
          📹 Live Streaming Semplice
        </h3>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
          Soluzione diretta per accesso camera/microfono
        </p>
      </div>

      {/* Video Preview */}
      <div style={{
        background: '#000',
        borderRadius: '12px',
        marginBottom: '20px',
        position: 'relative',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        overflow: 'hidden'
      }}>
        <video
          ref={videoRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          autoPlay
          playsInline
          muted={false} // Il venditore deve sentirsi per controllare audio
        />
        
        {/* Live indicator */}
        {isStreaming && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: '#ef4444',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: 'white',
              borderRadius: '50%',
              animation: 'pulse 1s infinite'
            }} />
            LIVE
          </div>
        )}

        {/* Placeholder quando non streaming */}
        {!isStreaming && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.7)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📹</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>
              Anteprima Camera
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>
              Clicca "Vai Live" per iniziare
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!isStreaming ? (
          <button
            onClick={startStream}
            style={{
              flex: 1,
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
            }}
          >
            ▶️ Vai Live
          </button>
        ) : (
          <button
            onClick={stopStream}
            style={{
              flex: 1,
              padding: '16px 24px',
              borderRadius: '12px',
              border: '2px solid rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            ⏹️ Termina Live
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          color: '#fecaca',
          fontSize: '14px'
        }}>
          {error}
          
          {error.includes('negato') && (
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
              💡 <strong>Come risolvere:</strong><br/>
              1. Clicca l'icona 🔒 nella barra indirizzi<br/>
              2. Abilita Camera e Microfono<br/>
              3. Ricarica la pagina e riprova
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
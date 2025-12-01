import React, { useState, useRef, useEffect } from 'react';
import { Track, RemoteTrack } from 'livekit-client';
import liveKit from '../lib/livekit';

export default function LiveVideoPlayer({ 
  roomName, 
  participantName,
  onViewerJoin,
  onViewerLeave,
  className,
  style 
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState('');
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const isConfigured = liveKit.isConfigured;

  useEffect(() => {
    checkPiPSupport();
    
    // 🎯 OTTIMIZZAZIONE: Rate limiting per evitare "routes limit exceeded"
    if (isConfigured && roomName && participantName && !liveKit.isConnected()) {
      // Delay casuale per evitare connessioni simultanee
      const delay = Math.random() * 200 + 200; // 200-400ms delay
      const timeoutId = setTimeout(() => {
        connectToRoom();
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }

    return () => {
      // Cleanup spettatore quando componente unmounts
      if (liveKit.isConnected()) {
        (async () => {
          try {
            const liveId = roomName.replace('live-', '');
            await fetch(`/api/live/${liveId}/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ viewerId: participantName })
            });
            console.log('🧹 Cleanup: rimosso dal conteggio spettatori');
          } catch (err) {
            console.warn('⚠️ Errore cleanup spettatore:', err);
          }
        })();
        
        liveKit.disconnect();
      }
    };
  }, [roomName, participantName]);

  function checkPiPSupport() {
    setIsPiPSupported(
      document.pictureInPictureEnabled && 
      videoRef.current && 
      videoRef.current.requestPictureInPicture
    );
  }

  async function connectToRoom() {
    if (!isConfigured) return;

    try {
      setIsConnecting(true);
      setError('');

      const callbacks = {
        onConnected: async () => {
          setConnectionState('connected');
          
          // Registra spettatore nel database per conteggio real-time
          try {
            const liveId = roomName.replace('live-', '');
            const response = await fetch(`/api/live/${liveId}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ viewerId: participantName })
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`📈 Registrato come spettatore: ${data.viewers} viewers totali`);
            } else {
              console.warn('⚠️ Impossibile registrare spettatore nel conteggio');
            }
          } catch (err) {
            console.warn('⚠️ Errore registrazione spettatore:', err);
          }
          
          onViewerJoin?.();
        },
        onDisconnected: async (reason) => {
          setConnectionState('disconnected');
          setHasVideo(false);
          setHasAudio(false);
          
          // Rimuovi spettatore dal conteggio
          try {
            const liveId = roomName.replace('live-', '');
            await fetch(`/api/live/${liveId}/leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ viewerId: participantName })
            });
            console.log('📉 Rimosso dal conteggio spettatori');
          } catch (err) {
            console.warn('⚠️ Errore rimozione spettatore:', err);
          }
          
          onViewerLeave?.();
        },
        onReconnecting: () => {
          setConnectionState('reconnecting');
        },
        onReconnected: () => {
          setConnectionState('connected');
        },
        onTrackSubscribed: (track, publication, participant) => {
          handleTrackSubscribed(track, publication, participant);
        },
        onTrackUnsubscribed: (track, publication, participant) => {
          handleTrackUnsubscribed(track, publication, participant);
        },
        onReconnectionFailed: () => {
          console.log('🛑 Riconnessione fallita definitivamente - mantengo ultimo stato');
          // Non setto errore per evitare messaggi confusi - mantieni semplicemente l'ultimo stato
          setConnectionState('disconnected');
        }
      };

      await liveKit.connectToRoom(roomName, participantName, 'subscriber', callbacks);
      
    } catch (err) {
      console.error('Error connecting to room:', err);
      setError('Errore connessione live: ' + err.message);
      setConnectionState('error');
    } finally {
      setIsConnecting(false);
    }
  }

  function handleTrackSubscribed(track, publication, participant) {
    if (track.kind === Track.Kind.Video && videoRef.current) {
      track.attach(videoRef.current);
      setHasVideo(true);
      checkPiPSupport();
    } else if (track.kind === Track.Kind.Audio && audioRef.current) {
      track.attach(audioRef.current);
      setHasAudio(true);
      
      // Attempt autoplay, handle blocked autoplay
      audioRef.current.play().catch((error) => {
        console.log('Autoplay blocked:', error);
        setAudioBlocked(true);
      });
    }
  }

  function handleTrackUnsubscribed(track, publication, participant) {
    if (track.kind === Track.Kind.Video) {
      setHasVideo(false);
    } else if (track.kind === Track.Kind.Audio) {
      setHasAudio(false);
    }
  }

  async function resumeAudio() {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setAudioBlocked(false);
      } catch (error) {
        console.error('Failed to resume audio:', error);
      }
    }
  }

  async function togglePictureInPicture() {
    if (!videoRef.current || !isPiPSupported) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, []);

  function getConnectionIndicator() {
    const indicators = {
      disconnected: { color: '#6b7280', icon: '●', text: 'Disconnesso' },
      connecting: { color: '#f59e0b', icon: '●', text: 'Connessione...' },
      connected: { color: '#10b981', icon: '●', text: 'Live' },
      reconnecting: { color: '#f59e0b', icon: '●', text: 'Riconnessione...' },
      error: { color: '#ef4444', icon: '●', text: 'Errore' }
    };
    
    return indicators[connectionState] || indicators.disconnected;
  }

  if (!isConfigured) {
    return (
      <div 
        className={className}
        style={{
          background: '#000',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          ...style
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📹</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
            Video Non Disponibile
          </h3>
          <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
            Il servizio video non è configurato. Chat e offerte restano attive.
          </p>
        </div>
      </div>
    );
  }

  const indicator = getConnectionIndicator();

  return (
    <div 
      className={className}
      style={{
        background: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: hasVideo ? 'block' : 'none'
        }}
      />
      
      {/* Audio Element */}
      <audio
        ref={audioRef}
        autoPlay
        style={{ display: 'none' }}
      />

      {/* Live Badge */}
      {hasVideo && (
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: '#ef4444',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10
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

      {/* Connection Status */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(0,0,0,0.7)',
        color: indicator.color,
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        zIndex: 10
      }}>
        <span>{indicator.icon}</span>
        {indicator.text}
      </div>

      {/* Picture-in-Picture Button */}
      {isPiPSupported && hasVideo && (
        <button
          onClick={togglePictureInPicture}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
          aria-label={isPiPActive ? 'Esci da Picture-in-Picture' : 'Attiva Picture-in-Picture'}
        >
          {isPiPActive ? '📺' : '⏏️'}
        </button>
      )}

      {/* Audio Resume Button */}
      {audioBlocked && hasAudio && (
        <button
          onClick={resumeAudio}
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '25px',
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10
          }}
        >
          🔊 Riprendi Audio
        </button>
      )}

      {/* No Stream Placeholder */}
      {!hasVideo && connectionState !== 'connecting' && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📺</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
            In Attesa del Venditore
          </h3>
          <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
            Il live stream inizierà a breve
          </p>
        </div>
      )}

      {/* Connecting State */}
      {isConnecting && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '16px' }}>Connessione al live...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
            Errore Connessione
          </h3>
          <p style={{ margin: '0 0 16px 0', opacity: 0.8, fontSize: '14px' }}>
            {error}
          </p>
          <button
            onClick={connectToRoom}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Riprova
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
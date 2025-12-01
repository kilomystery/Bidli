import { useState, useEffect, useRef } from 'react';
import { liveKit } from '../lib/livekit.js';

export default function LiveVideoStream({ streamId, isSeller, autoPlay = true, controls = true, style, onStreamReady }) {
  console.log('🎥 LiveVideoStream RENDERED:', { streamId, isSeller });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceStream, setDeviceStream] = useState(null);
  const [liveKitInstance, setLiveKitInstance] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(false);

  // ✅ FALLBACK STATE per gestire errori
  const [fallbackMode, setFallbackMode] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // ✅ INITIALIZATION
  useEffect(() => {
    console.log('🔧 LiveVideoStream: Initializing...');
    
    // Reset states
    setIsLoading(true);
    setError(null);
    setFallbackMode(false);
    setPermissionDenied(false);

    if (isSeller) {
      initializeSellerStream();
    } else {
      initializeViewerStream();
    }
  }, [streamId, isSeller]);

  // ✅ SELLER STREAM INITIALIZATION - Semplificato
  const initializeSellerStream = async () => {
    console.log('🎯 SELLER: Initializing stream...');
    
    try {
      setIsLoading(true);
      setError('🎥 Inizializzazione live...');

      // ✅ Prima prova la camera reale
      const hasCamera = await tryRealCamera();
      
      if (hasCamera) {
        console.log('📹 Using real camera');
        await connectToLiveKit();
      } else {
        console.log('🎨 Using artificial stream');
        await createArtificialStream();
        await connectToLiveKit();
      }

      setIsLoading(false);
      setError(null);
      
    } catch (error) {
      console.error('❌ Seller initialization error:', error);
      handleStreamError(error);
    }
  };

  // ✅ VIEWER STREAM INITIALIZATION - Semplificato  
  const initializeViewerStream = async () => {
    console.log('👀 VIEWER: Connecting to stream...');
    
    try {
      setIsLoading(true);
      setError('📡 Connessione alla live...');

      if (!streamId || streamId === 'new') {
        setError('🔍 Nessuna live attiva');
        setIsLoading(false);
        return;
      }

      await connectToLiveKit();
      setIsLoading(false);
      setError(null);
      
    } catch (error) {
      console.error('❌ Viewer initialization error:', error);
      handleStreamError(error);
    }
  };

  // ✅ TRY REAL CAMERA - Con fallback robusto
  const tryRealCamera = async () => {
    try {
      console.log('📹 Trying real camera...');
      
      // Check basic support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      // Simple constraints
      const constraints = {
        video: { width: 640, height: 480, frameRate: 30 },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Real camera obtained');
      
      setDeviceStream(stream);
      setVideoEnabled(true);
      
      // Show in video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Autoplay blocked:', e.message));
      }
      
      return true;
      
    } catch (error) {
      console.log('⚠️ Real camera failed:', error.message);
      
      if (error.name === 'NotAllowedError') {
        setPermissionDenied(true);
      }
      
      return false;
    }
  };

  // ✅ CREATE ARTIFICIAL STREAM - Semplificato e robusto
  const createArtificialStream = async () => {
    try {
      console.log('🎨 Creating artificial stream...');
      
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      // ✅ SIMPLE ANIMATION
      const drawFrame = () => {
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // BIDLi logo
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BIDLi', canvas.width/2, canvas.height/2 - 60);
        
        // Live indicator
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px Arial';
        ctx.fillText('🔴 IN DIRETTA', canvas.width/2, canvas.height/2);
        
        // Timestamp
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px monospace';
        ctx.fillText(new Date().toLocaleTimeString(), canvas.width/2, canvas.height/2 + 60);
        
        // Animated pulse
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(50, 50, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // Draw frame and create stream
      drawFrame();
      const stream = canvas.captureStream(15); // 15 FPS
      
      setDeviceStream(stream);
      setVideoEnabled(true);
      
      // Show in video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Autoplay blocked:', e.message));
      }

      // Continue animation
      const animate = () => {
        drawFrame();
        requestAnimationFrame(animate);
      };
      animate();
      
      console.log('✅ Artificial stream created');
      
    } catch (error) {
      console.error('❌ Artificial stream creation failed:', error);
      throw error;
    }
  };

  // ✅ CONNECT TO LIVEKIT - Semplificato
  const connectToLiveKit = async () => {
    try {
      console.log('📡 Connecting to LiveKit...');
      
      if (!liveKit.isConfigured) {
        throw new Error('LiveKit not configured');
      }

      const roomName = `live-${streamId}`;
      const participantName = isSeller ? `seller-${Date.now()}` : `viewer-${Date.now()}`;
      
      await liveKit.connectToRoom(roomName, participantName, isSeller ? 'publisher' : 'subscriber', {
        onConnected: () => {
          console.log('✅ Connected to LiveKit!');
          setLiveKitInstance(liveKit);
          setIsStreaming(true);
          onStreamReady?.();
        },
        onDisconnected: (reason) => {
          console.log('❌ Disconnected from LiveKit:', reason);
          setIsStreaming(false);
          setError('🔌 Connessione persa. Riprova.');
        }
      });

      if (isSeller && deviceStream) {
        console.log('📡 Publishing stream...');
        await liveKit.startPublishing(true, true);
      }
      
    } catch (error) {
      console.error('❌ LiveKit connection failed:', error);
      throw error;
    }
  };

  // ✅ ERROR HANDLER - Robusto con fallback
  const handleStreamError = (error) => {
    console.error('🚨 Stream error:', error);
    
    setIsLoading(false);
    setFallbackMode(true);
    
    if (error.name === 'NotAllowedError') {
      setPermissionDenied(true);
      setError('📹 Autorizza l\'accesso alla camera per continuare');
    } else if (error.message.includes('LiveKit')) {
      setError('📡 Errore di connessione. Riprova tra poco.');
    } else {
      setError('⚠️ Errore nell\'avvio della live. Riprova.');
    }
  };

  // ✅ CLEANUP
  useEffect(() => {
    return () => {
      if (deviceStream) {
        deviceStream.getTracks().forEach(track => track.stop());
      }
      if (liveKitInstance) {
        liveKitInstance.disconnect().catch(console.error);
      }
    };
  }, [deviceStream, liveKitInstance]);

  // ✅ RENDER STATES

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        padding: 20,
        ...style
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid rgba(16, 185, 129, 0.1)',
          borderTop: '4px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 16
        }} />
        <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600 }}>
          {error || 'Caricamento live...'}
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Permission denied state
  if (permissionDenied) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        padding: 20,
        textAlign: 'center',
        ...style
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#10b981' }}>Camera richiesta</h3>
        <p style={{ margin: '0 0 16px 0', color: '#94a3b8' }}>
          Autorizza l'accesso alla camera per avviare la live
        </p>
        <button
          onClick={() => {
            setPermissionDenied(false);
            initializeSellerStream();
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Riprova
        </button>
      </div>
    );
  }

  // Error fallback state
  if (fallbackMode && error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        padding: 20,
        textAlign: 'center',
        ...style
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Errore Live</h3>
        <p style={{ margin: '0 0 16px 0', color: '#94a3b8' }}>
          {error}
        </p>
        <button
          onClick={() => {
            setFallbackMode(false);
            setError(null);
            if (isSeller) {
              initializeSellerStream();
            } else {
              initializeViewerStream();
            }
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Riprova
        </button>
      </div>
    );
  }

  // ✅ MAIN VIDEO RENDER
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000',
      borderRadius: 8,
      overflow: 'hidden',
      ...style
    }}>
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={isSeller} // Mute own video to prevent feedback
        controls={controls}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000'
        }}
      />
      
      {/* Stream status indicator */}
      {isStreaming && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: 16,
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'white',
            animation: 'pulse 2s infinite'
          }} />
          LIVE
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
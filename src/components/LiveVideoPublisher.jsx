import React, { useState, useRef, useEffect } from 'react';
import { Track } from 'livekit-client';
import liveKit from '../lib/livekit';

export default function LiveVideoPublisher({ 
  roomName, 
  participantName, 
  onPublishStart, 
  onPublishEnd,
  onError 
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  
  const videoRef = useRef(null);
  const isConfigured = liveKit.isConfigured;

  useEffect(() => {
    loadDevices();
    return () => {
      if (liveKit.isConnected()) {
        liveKit.disconnect();
      }
    };
  }, []);

  async function loadDevices() {
    if (!isConfigured) return;
    
    try {
      const mediaDevices = await liveKit.getMediaDevices();
      setDevices(mediaDevices);
      
      if (mediaDevices.cameras.length > 0) {
        setSelectedCamera(mediaDevices.cameras[0].deviceId);
      }
      if (mediaDevices.microphones.length > 0) {
        setSelectedMic(mediaDevices.microphones[0].deviceId);
      }
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  }

  async function startPublishing() {
    if (!isConfigured) {
      setError('Video streaming non configurato');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Il browser non supporta l\'accesso alla camera');
      }

      // FORCE browser to request camera/microphone permissions
      console.log('🎥 Requesting camera and microphone access...');
      
      // Force permission request with explicit user interaction
      const stream = await navigator.mediaDevices.getUserMedia({
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
      
      console.log('✅ Camera access granted, stream:', stream);
      console.log('Video tracks:', stream.getVideoTracks());
      console.log('Audio tracks:', stream.getAudioTracks());
      
      // Attach stream to video element for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded, playing...');
          videoRef.current.play();
        };
        console.log('✅ Video preview setup complete');
      }

      const callbacks = {
        onConnected: () => {
          setConnectionState('connected');
          publishTracks();
        },
        onDisconnected: (reason) => {
          setConnectionState('disconnected');
          setIsPublishing(false);
          onPublishEnd?.();
        },
        onReconnecting: () => {
          setConnectionState('reconnecting');
        },
        onReconnected: () => {
          setConnectionState('connected');
        },
        onLocalTrackPublished: (publication, participant) => {
          if (publication.track && publication.track.kind === Track.Kind.Video) {
            attachVideoTrack(publication.track);
          }
        },
        onReconnectionFailed: () => {
          setError('Impossibile riconnettersi al server video');
          setConnectionState('error');
        }
      };

      await liveKit.connectToRoom(roomName, participantName, 'publisher', callbacks);
      
    } catch (err) {
      console.error('Error starting publishing:', err);
      setError('Errore connessione video: ' + err.message);
      setConnectionState('error');
      onError?.(err);
    } finally {
      setIsConnecting(false);
    }
  }

  async function publishTracks() {
    try {
      const tracks = await liveKit.startPublishing(cameraEnabled, micEnabled);
      
      // Attach video track to preview
      const videoTrack = tracks.find(track => track.kind === Track.Kind.Video);
      if (videoTrack) {
        attachVideoTrack(videoTrack);
      }

      setIsPublishing(true);
      onPublishStart?.();
      
    } catch (err) {
      console.error('Error publishing tracks:', err);
      setError('Errore avvio streaming: ' + err.message);
    }
  }

  function attachVideoTrack(track) {
    if (videoRef.current && track) {
      track.attach(videoRef.current);
    }
  }

  async function stopPublishing() {
    try {
      await liveKit.stopPublishing();
      liveKit.disconnect();
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsPublishing(false);
      setConnectionState('disconnected');
      onPublishEnd?.();
      
    } catch (err) {
      console.error('Error stopping publishing:', err);
    }
  }

  async function toggleCamera() {
    const newState = !cameraEnabled;
    const success = await liveKit.toggleCamera(newState);
    if (success) {
      setCameraEnabled(newState);
    }
  }

  async function toggleMicrophone() {
    const newState = !micEnabled;
    const success = await liveKit.toggleMicrophone(newState);
    if (success) {
      setMicEnabled(newState);
    }
  }

  async function switchCamera(deviceId) {
    const success = await liveKit.switchCamera(deviceId);
    if (success) {
      setSelectedCamera(deviceId);
    }
  }

  async function switchMicrophone(deviceId) {
    const success = await liveKit.switchMicrophone(deviceId);
    if (success) {
      setSelectedMic(deviceId);
    }
  }

  function getConnectionIndicator() {
    const indicators = {
      disconnected: { color: '#6b7280', icon: '●', text: 'Disconnesso' },
      connecting: { color: '#f59e0b', icon: '●', text: 'Connessione...' },
      connected: { color: '#10b981', icon: '●', text: 'Connesso' },
      reconnecting: { color: '#f59e0b', icon: '●', text: 'Riconnessione...' },
      error: { color: '#ef4444', icon: '●', text: 'Errore' }
    };
    
    return indicators[connectionState] || indicators.disconnected;
  }

  if (!isConfigured) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📹</div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
            Video Streaming Non Configurato
          </h3>
          <p style={{ margin: '0 0 20px 0', opacity: 0.8, fontSize: '14px' }}>
            Il servizio video richiede configurazione. Le funzionalità di chat e offerte restano disponibili.
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            Configurazione richiesta: VITE_LIVEKIT_URL
          </div>
        </div>
      </div>
    );
  }

  const indicator = getConnectionIndicator();

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '24px',
      color: 'white'
    }}>
      
      {/* Header with Connection Status */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700 }}>
            📹 Live Video Studio
          </h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '12px',
            opacity: 0.9
          }}>
            <span style={{ color: indicator.color }}>{indicator.icon}</span>
            {indicator.text}
          </div>
        </div>
        
        <button
          onClick={() => setShowConfig(!showConfig)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          aria-label="Configurazioni dispositivi"
        >
          ⚙️
        </button>
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
          autoPlay
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        
        {isPublishing && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: '#ef4444',
            color: 'white',
            padding: '4px 12px',
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

        {!isPublishing && connectionState !== 'connecting' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              Anteprima video apparirà qui
            </div>
          </div>
        )}
      </div>

      {/* Device Configuration */}
      {showConfig && (
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600 }}>
            Dispositivi
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                📷 Camera
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                disabled={isPublishing}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                {devices.cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId} style={{ color: '#333' }}>
                    {camera.label || `Camera ${camera.deviceId.substr(-4)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px' }}>
                🎤 Microfono
              </label>
              <select
                value={selectedMic}
                onChange={(e) => switchMicrophone(e.target.value)}
                disabled={isPublishing}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              >
                {devices.microphones.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId} style={{ color: '#333' }}>
                    {mic.label || `Microfono ${mic.deviceId.substr(-4)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {!isPublishing ? (
          <button
            onClick={startPublishing}
            disabled={isConnecting || connectionState === 'connecting'}
            style={{
              flex: 1,
              padding: '16px 20px',
              borderRadius: '12px',
              border: 'none',
              background: isConnecting ? 
                'rgba(255,255,255,0.2)' : 
                'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 700,
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isConnecting ? (
              <>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Connessione...
              </>
            ) : (
              '▶️ Vai Live'
            )}
          </button>
        ) : (
          <>
            <button
              onClick={toggleCamera}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: cameraEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(239, 68, 68, 0.5)',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer'
              }}
              aria-label={cameraEnabled ? 'Disabilita camera' : 'Abilita camera'}
            >
              {cameraEnabled ? '📹' : '📹'}
            </button>
            
            <button
              onClick={toggleMicrophone}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: micEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(239, 68, 68, 0.5)',
                color: 'white',
                fontSize: '16px',
                cursor: 'pointer'
              }}
              aria-label={micEnabled ? 'Disabilita microfono' : 'Abilita microfono'}
            >
              {micEnabled ? '🎤' : '🔇'}
            </button>
            
            <button
              onClick={stopPublishing}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '8px',
                border: '2px solid rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⏹️ Termina Live
            </button>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          color: '#fecaca',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <style jsx>{`
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
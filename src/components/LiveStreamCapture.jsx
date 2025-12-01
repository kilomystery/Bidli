import React, { useState, useRef, useEffect } from 'react';
import liveKit from '../lib/livekit';
import LiveVideoPublisher from './LiveVideoPublisher';
import SimpleLiveCapture from './SimpleLiveCapture';

export default function LiveStreamCapture({ onStreamStart, onStreamEnd, isActive }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [error, setError] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    loadDevices();
    generateStreamKey();
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  async function loadDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setDevices({ cameras, microphones });
      
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0) setSelectedMic(microphones[0].deviceId);
    } catch (err) {
      console.error('Error loading devices:', err);
      setError('Impossibile accedere ai dispositivi audio/video');
    }
  }

  function generateStreamKey() {
    const key = 'live_' + Math.random().toString(36).substr(2, 12);
    setStreamKey(key);
  }

  async function startStream() {
    try {
      setIsConnecting(true);
      setError('');

      console.log('🎥 Avviando LiveKit streaming...');
      
      // Connetti a LiveKit room
      const roomName = `live_${Date.now()}`;
      const participantName = 'seller_' + Date.now();
      
      await liveKit.connectToRoom(roomName, participantName, 'publisher', {
        onConnected: () => {
          console.log('✅ LiveKit connesso con successo!');
        },
        onDisconnected: (reason) => {
          console.log('❌ LiveKit disconnesso:', reason);
          setIsStreaming(false);
          setIsConnecting(false);
        }
      });

      // Avvia pubblicazione video/audio
      const tracks = await liveKit.startPublishing(true, true);
      console.log('🎙️ Tracks pubblicati:', tracks);

      // Richiedi permessi e avvia stream locale per preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedCamera,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          deviceId: selectedMic,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setMediaStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsStreaming(true);
      setIsConnecting(false);
      
      // Notifica che lo streaming è attivo
      if (onStreamStart) {
        onStreamStart({
          id: roomName,
          stream_key: streamKey,
          status: 'live',
          started_at: new Date().toISOString(),
          title: 'Live Auction',
          category: 'general'
        });
      }

    } catch (err) {
      console.error('Error starting stream:', err);
      setError('Errore avvio streaming: ' + err.message);
      setIsConnecting(false);
    }
  }

  async function stopStream() {
    try {
      console.log('🛑 Fermando LiveKit streaming...');
      
      // Disconnetti da LiveKit
      await liveKit.stopPublishing();
      liveKit.disconnect();

      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }

      setIsStreaming(false);
      
      if (onStreamEnd) {
        onStreamEnd();
      }

    } catch (err) {
      console.error('Error stopping stream:', err);
      setError('Errore stop streaming');
    }
  }

  // LiveKit gestisce automaticamente la distribuzione del video

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '24px',
      color: 'white'
    }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>
          📹 Live Streaming Studio
        </h3>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
          Avvia la tua asta live per vendere in diretta ai tuoi followers
        </p>
      </div>

      {/* SOLUZIONE DRASTICA: Simple Live Capture */}
      <div style={{ marginBottom: '20px' }}>
        <SimpleLiveCapture
          onStreamReady={(stream) => {
            console.log('🎥 Stream ready in LiveStreamCapture:', stream);
            onStreamStart?.();
          }}
          onStreamEnd={() => {
            console.log('🛑 Stream ended in LiveStreamCapture');
            onStreamEnd?.();
          }}
        />
      </div>

      {/* Debug Info */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        marginBottom: '16px'
      }}>
        <div>🔑 Stream Key: {streamKey}</div>
        <div>📍 Soluzione Drastica Attiva</div>
        <div>🌐 getUserMedia Direct Access</div>
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
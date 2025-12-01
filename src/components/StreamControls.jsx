import { useState } from 'react';

export default function StreamControls({ 
  isStreaming, 
  onStartStream, 
  onStopStream,
  onToggleCamera,
  onToggleMicrophone,
  cameraEnabled = true,
  micEnabled = true
}) {
  const [quality, setQuality] = useState('hd');
  const [showSettings, setShowSettings] = useState(false);

  const qualities = [
    { value: 'sd', label: '480p (SD)', bandwidth: 'Basso' },
    { value: 'hd', label: '720p (HD)', bandwidth: 'Medio' },
    { value: 'fhd', label: '1080p (Full HD)', bandwidth: 'Alto' }
  ];

  return (
    <div style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '12px',
      padding: '16px',
      color: 'white'
    }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ fontWeight: '600', fontSize: '16px' }}>
          📹 Controlli Streaming
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {isStreaming ? (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontSize: '12px', color: '#10b981' }}>LIVE</span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>OFFLINE</span>
          )}
        </div>
      </div>

      {/* Controlli principali */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px'
      }}>
        
        {!isStreaming ? (
          <button
            onClick={onStartStream}
            style={{
              flex: 1,
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            ▶️ Inizia Live
          </button>
        ) : (
          <button
            onClick={onStopStream}
            style={{
              flex: 1,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
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

      {/* Controlli Dispositivi */}
      {isStreaming && (
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px'
        }}>
          
          <button
            onClick={onToggleCamera}
            style={{
              flex: 1,
              background: cameraEnabled ? '#374151' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {cameraEnabled ? '📹' : '📹'} Camera
          </button>
          
          <button
            onClick={onToggleMicrophone}
            style={{
              flex: 1,
              background: micEnabled ? '#374151' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {micEnabled ? '🎤' : '🔇'} Audio
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ⚙️
          </button>
        </div>
      )}

      {/* Impostazioni qualità */}
      {showSettings && (
        <div style={{
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '12px',
          background: '#111827',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
            Qualità Video
          </div>
          
          {qualities.map((q) => (
            <div key={q.value} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              borderRadius: '6px',
              background: quality === q.value ? '#3b82f6' : 'transparent',
              cursor: 'pointer',
              margin: '4px 0'
            }}
            onClick={() => setQuality(q.value)}
            >
              <input
                type="radio"
                checked={quality === q.value}
                onChange={() => setQuality(q.value)}
                style={{ marginRight: '8px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{q.label}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Banda: {q.bandwidth}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Stream */}
      {isStreaming && (
        <div style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Qualità:</span>
            <span style={{ color: 'white' }}>{qualities.find(q => q.value === quality)?.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Bitrate:</span>
            <span style={{ color: '#10b981' }}>2.5 Mbps</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Latenza:</span>
            <span style={{ color: '#10b981' }}>~0.8s</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
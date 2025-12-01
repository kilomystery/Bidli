import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import LiveVideoPlayer from './LiveVideoPlayer';

export default function LiveStreamViewer({ streamKey, onBid, onChatMessage }) {
  const [isConnected, setIsConnected] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [chatVisible, setChatVisible] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [user, setUser] = useState(null);
  const videoRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    initializeViewer();
    loadUserData();
    setupRealtimeConnection();
    
    return () => {
      // Cleanup connections
    };
  }, [streamKey]);

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  function initializeViewer() {
    // Simula connessione al stream video
    setIsConnected(true);
    
    // Simula caricamento video stream
    if (videoRef.current) {
      // In produzione: WebRTC peer connection o HLS stream
      videoRef.current.src = getStreamUrl();
    }
  }

  function getStreamUrl() {
    // Simula URL stream - in produzione verrebbe dal server streaming
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }

  function setupRealtimeConnection() {
    // Ascolta eventi live stream
    const streamChannel = supabase.channel(`live-stream-${streamKey}`)
      .on('broadcast', { event: 'video-chunk' }, (payload) => {
        // Gestisce chunks video in arrivo
        handleVideoChunk(payload);
      })
      .on('broadcast', { event: 'auction-started' }, (payload) => {
        setCurrentProduct(payload.product);
      })
      .on('broadcast', { event: 'auction-ended' }, () => {
        setCurrentProduct(null);
      })
      .subscribe();

    // Ascolta chat messages
    const chatChannel = supabase.channel(`live-chat-${streamKey}`)
      .on('broadcast', { event: 'new-message' }, (payload) => {
        setChatMessages(prev => [...prev, payload.message]);
        scrollChatToBottom();
      })
      .subscribe();

    // Simula viewers count
    const viewersInterval = setInterval(() => {
      setViewers(Math.floor(Math.random() * 200) + 50);
    }, 8000);

    return () => {
      streamChannel.unsubscribe();
      chatChannel.unsubscribe();
      clearInterval(viewersInterval);
    };
  }

  function handleVideoChunk(payload) {
    // In produzione: gestisce chunks video per playback in tempo reale
    console.log('Received video chunk:', payload);
  }

  function scrollChatToBottom() {
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 100);
  }

  async function sendChatMessage() {
    if (!newMessage.trim() || !user) return;

    const message = {
      id: Date.now(),
      user_name: user.email.split('@')[0],
      message: newMessage.trim(),
      created_at: new Date().toISOString()
    };

    // Invia via Supabase Realtime
    await supabase.channel(`live-chat-${streamKey}`)
      .send({
        type: 'broadcast',
        event: 'new-message',
        payload: { message }
      });

    setNewMessage('');
    if (onChatMessage) onChatMessage(message);
  }

  async function placeBid() {
    if (!bidAmount || !currentProduct || !user) return;

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) return;

    const bid = {
      id: Date.now(),
      amount,
      bidder_name: user.email.split('@')[0],
      product_id: currentProduct.id,
      created_at: new Date().toISOString()
    };

    // Invia bid al sistema
    try {
      await supabase
        .from('bids')
        .insert(bid);

      setBidAmount('');
      if (onBid) onBid(bid);

    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Errore nell\'invio dell\'offerta');
    }
  }

  return (
    <div style={{
      background: '#000',
      borderRadius: '16px',
      overflow: 'hidden',
      position: 'relative',
      height: '100%'
    }}>
      
      {/* WebRTC Video Player */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%', // 16:9 aspect ratio
        background: '#000'
      }}>
        <LiveVideoPlayer
          roomName={streamKey}
          participantName={`viewer-${Date.now()}`}
          onViewerJoin={() => console.log('Viewer joined')}
          onViewerLeave={() => console.log('Viewer left')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        />
        
        {/* Viewers Count Overlay */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: chatVisible ? '320px' : '16px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 20
        }}>
          👥 {viewers.toLocaleString()}
        </div>

        {/* Current Auction Product */}
        {currentProduct && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: chatVisible ? '320px' : '16px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '16px',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={currentProduct.image_url || '/placeholder-product.jpg'}
                alt={currentProduct.title}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  objectFit: 'cover'
                }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>
                  {currentProduct.title}
                </h4>
                <p style={{ margin: '0 0 8px 0', opacity: 0.8, fontSize: '12px' }}>
                  Prezzo base: €{currentProduct.starting_price}
                </p>
                
                {/* Bid Input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="€ Offerta"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={placeBid}
                    disabled={!bidAmount || !user}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: bidAmount && user ? '#10b981' : 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: bidAmount && user ? 'pointer' : 'not-allowed'
                    }}
                  >
                    🔨 Offri
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Toggle */}
        <button
          onClick={() => setChatVisible(!chatVisible)}
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
            justifyContent: 'center'
          }}
        >
          💬
        </button>
      </div>

      {/* Chat Sidebar */}
      {chatVisible && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          
          {/* Chat Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              💬 Chat Live
            </h4>
            <button
              onClick={() => setChatVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {chatMessages.map((message, index) => (
              <div key={message.id || index} style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}>
                <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px' }}>
                  {message.user_name}
                </div>
                <div style={{ fontSize: '14px' }}>
                  {message.message}
                </div>
              </div>
            ))}
            
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.6, padding: '40px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                <div style={{ fontSize: '12px' }}>
                  Sii il primo a scrivere nella chat!
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Scrivi un messaggio..."
                disabled={!user}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!newMessage.trim() || !user}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: newMessage.trim() && user ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '12px',
                  cursor: newMessage.trim() && user ? 'pointer' : 'not-allowed'
                }}
              >
                Invia
              </button>
            </div>
            
            {!user && (
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.6, 
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Accedi per partecipare alla chat
              </div>
            )}
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
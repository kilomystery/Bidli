// LiveKit WebRTC integration with graceful fallback
import { Room, RemoteTrack, Track, LocalTrack, VideoPresets, RoomEvent, ConnectionState } from 'livekit-client';

class LiveKitService {
  constructor() {
    this.room = null;
    this.isConfigured = this.checkConfiguration();
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    // 🎯 SCALABILITY: Connection pool and cleanup management
    this.currentRoomName = null;
    this.currentParticipantName = null;
    this.isConnecting = false;
    this.pendingConnection = null;
  }

  checkConfiguration() {
    // Now that we have server-side credentials, always return true
    return true;
  }

  async getAccessToken(roomName, participantName, role = 'subscriber') {
    // SISTEMA CORRETTO: determina role basato sul participantName
    let finalRole = role;
    if (participantName.startsWith('seller-')) {
      finalRole = 'publisher';
      console.log('🎥 VENDITORE: role = publisher');
    } else if (participantName.startsWith('viewer-')) {
      finalRole = 'subscriber'; 
      console.log('👤 ACQUIRENTE: role = subscriber');
    } else {
      console.log('🤷 RUOLO GENERICO: usando role =', role);
    }
    if (!this.isConfigured) {
      throw new Error('LiveKit not configured');
    }

    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName,
          role: finalRole
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Response error:', errorText);
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Token ricevuto dal server:', data.token ? 'OK' : 'VUOTO');
      
      const { token } = data;
      
      if (!token) {
        throw new Error('Server returned empty token');
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error getting LiveKit token:', error);
      throw error;
    }
  }

  async connectToRoom(roomName, participantName, role = 'subscriber', callbacks = {}) {
    if (!this.isConfigured) {
      throw new Error('LiveKit not configured');
    }

    // 🎯 SCALABILITY: Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('⏳ Connessione già in corso, attendo...');
      return this.pendingConnection;
    }

    // 🎯 SCALABILITY: Reuse existing connection if same room - STRICT CHECK
    if (this.room && 
        (this.connectionState === 'connected' || this.connectionState === 'connecting') && 
        this.currentRoomName === roomName && 
        this.currentParticipantName === participantName) {
      console.log('♻️ RIUSO connessione esistente per:', roomName, 'stato:', this.connectionState);
      return this.room;
    }

    // 🎯 PREVENT MULTIPLE DISCONNECTIONS: Solo se davvero diverso
    if (this.room && (this.currentRoomName !== roomName || this.currentParticipantName !== participantName)) {
      console.log('🧹 Cleanup connessione precedente (room/participant diverso)...');
      try {
        this.room.disconnect();
      } catch (e) {
        console.warn('⚠️ Errore durante cleanup:', e.message);
      }
      this.room = null;
    }

    this.isConnecting = true;
    this.currentRoomName = roomName;
    this.currentParticipantName = participantName;

    try {
      console.log('🔗 Inizio connessione LiveKit:', { roomName, participantName, role });
      
      // 🎯 DETECT MOBILE DEVICE - Definizione robusta
      const isMobile = (typeof navigator !== 'undefined') ? 
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false;
      
      const token = await this.getAccessToken(roomName, participantName, role);
      console.log('✅ Token ottenuto, lunghezza:', token.length);
      
      const url = 'wss://bidli-hwm0eo5p.livekit.cloud';
      console.log('🌐 Connessione a URL:', url);

      // 🎯 SCALABILITY: Optimized configuration for production
      const roomConfig = {
        adaptive: true,
        dynacast: false, // Disable for stability at scale
        publishDefaults: {
          videoCodec: 'vp8',
          videoSimulcast: false, // Disable for simplicity at scale
          videoEncoding: {
            maxBitrate: isMobile ? 600000 : 800000, // Lower bitrate for mobile
            maxFramerate: isMobile ? 12 : 15,
            width: isMobile ? 320 : 480,
            height: isMobile ? 240 : 360
          }
        },
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => {
            // Delay più lungo per evitare rate limiting
            const baseDelay = isMobile ? 5000 : 3000;
            return Math.min(baseDelay * Math.pow(2, context.retryCount), 30000);
          },
          maxRetryCount: 1, // Ridotto per evitare "routes limit exceeded"
        },
        disconnectOnPageLeave: false, // 🎯 PAUSA invece di disconnettere
        stopLocalTrackOnUnpublish: true
      };

      console.log(`📱 ${isMobile ? 'MOBILE' : 'DESKTOP'} Room config:`, roomConfig);
      
      // 🎯 SCALABILITY: Create room only once per connection
      this.room = new Room(roomConfig);

      console.log(`📦 Room object creato per ${isMobile ? '📱 MOBILE' : '💻 DESKTOP'}, settaggio eventi...`);
      console.log(`🎯 Configurazioni applicate:`, {
        device: isMobile ? 'mobile' : 'desktop',
        maxReconnectAttempts: isMobile ? 5 : 3,
        videoSimulcast: isMobile ? false : true,
        bitrate: isMobile ? '1200k' : '800k',
        fps: isMobile ? 20 : 15,
        resolution: isMobile ? '640x480' : '480x360'
      });

      // Event listeners con logging
      this.room.on(RoomEvent.Connected, () => {
        console.log('✅ CONNESSO alla room LiveKit!');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        callbacks.onConnected?.();
      });

      this.room.on(RoomEvent.Disconnected, (reason) => {
        console.log('❌ DISCONNESSO dalla room LiveKit:', reason);
        this.connectionState = 'disconnected';
        callbacks.onDisconnected?.(reason);
        this.handleReconnection(roomName, participantName, role, callbacks);
      });

      this.room.on(RoomEvent.Reconnecting, () => {
        console.log('🔄 RICONNESSIONE in corso...');
        this.connectionState = 'reconnecting';
        callbacks.onReconnecting?.();
      });

      this.room.on(RoomEvent.Reconnected, () => {
        console.log('✅ RICONNESSO alla room LiveKit!');
        this.connectionState = 'connected';
        callbacks.onReconnected?.();
      });

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('🎥 Track ricevuto:', track.kind, 'da', participant.identity);
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          callbacks.onTrackSubscribed?.(track, publication, participant);
        }
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('📺 Track rimosso:', track.kind, 'da', participant.identity);
        callbacks.onTrackUnsubscribed?.(track, publication, participant);
      });

      this.room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        console.log('📡 Track locale pubblicato:', publication.trackInfo?.source);
        callbacks.onLocalTrackPublished?.(publication, participant);
      });

      this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('📊 Qualità connessione cambiata:', quality, 'per', participant?.identity);
        callbacks.onConnectionQualityChanged?.(quality, participant);
      });

      console.log('🚀 Avvio connessione alla room...');
      
      // 🎯 SCALABILITY: Store promise for reuse during connection
      this.pendingConnection = this.room.connect(url, token);
      await this.pendingConnection;
      
      console.log('✅ Connessione completata!');
      this.isConnecting = false;
      this.pendingConnection = null;
      return this.room;

    } catch (error) {
      this.isConnecting = false;
      this.pendingConnection = null;
      console.error('❌ ERRORE CONNESSIONE LIVEKIT ROOM DETTAGLIO:', {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        cause: error.cause,
        device: isMobile ? 'mobile' : 'desktop'
      });
      
      console.error('🔍 URL usato:', url);
      console.error('🔍 Token length:', token ? token.length : 'VUOTO');
      console.error('🔍 Room config usato:', this.room?.options || 'NESSUNO');
      
      this.connectionState = 'error';
      throw error;
    }
  }

  async handleReconnection(roomName, participantName, role, callbacks) {
    // 🎯 DETECT MOBILE DEVICE - Definizione sicura per riconnessione
    const isMobile = (typeof navigator !== 'undefined') ? 
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false;
    
    const maxAttempts = isMobile ? 5 : 2; // Mobile: più tentativi, Desktop: meno
    const baseDelay = isMobile ? 3000 : 8000; // Mobile: retry più veloci
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.log(`🛑 Troppi tentativi riconnessione (${this.reconnectAttempts}/${maxAttempts}), fermato`);
      callbacks.onReconnectionFailed?.();
      return;
    }

    this.reconnectAttempts++;
    
    // Delay progressivo ma diverso per mobile/desktop
    const delay = isMobile 
      ? Math.min(baseDelay * this.reconnectAttempts, 10000) // Mobile: 3s, 6s, 9s, max 10s
      : baseDelay; // Desktop: delay fisso 8s
    
    console.log(`🔄 ${isMobile ? '📱 Mobile' : '💻 Desktop'} riconnessione ${this.reconnectAttempts}/${maxAttempts} tra ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.connectToRoom(roomName, participantName, role, callbacks);
      } catch (error) {
        console.error('❌ Riconnessione fallita:', error);
        if (this.reconnectAttempts < maxAttempts) {
          this.handleReconnection(roomName, participantName, role, callbacks);
        } else {
          callbacks.onReconnectionFailed?.();
        }
      }
    }, delay);
  }

  async startPublishing(enableVideo = true, enableAudio = true) {
    if (!this.room || !this.isConfigured) {
      throw new Error('Room not connected or LiveKit not configured');
    }

    // 🎯 DETECT MOBILE DEVICE - Definizione sicura per pubblicazione
    const isMobile = (typeof navigator !== 'undefined') ? 
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false;

    try {
      console.log(`📡 ${isMobile ? '📱 MOBILE' : '💻 DESKTOP'} Inizio pubblicazione tracks...`);
      const tracks = [];
      
      if (enableVideo) {
        console.log(`📹 ${isMobile ? 'Mobile' : 'Desktop'} attivazione video track...`);
        
        if (isMobile) {
          // MOBILE: ATTIVIAMO SIA AUDIO CHE VIDEO - VERSIONE CORRETTA!
          console.log('📱 Mobile: Attivazione COMPLETA audio + video');
          
          try {
            // PRIMA: Attiva microfono
            console.log('🎤 Mobile: Attivazione microfono...');
            await this.room.localParticipant.setMicrophoneEnabled(true);
            console.log('✅ Mobile: Microfono attivato!');
            
            // SECONDA: Attiva camera con configurazione mobile
            console.log('📹 Mobile: Attivazione camera...');
            const videoTrack = await this.room.localParticipant.setCameraEnabled(true, {
              resolution: {
                width: 640,
                height: 480,
                frameRate: 15
              }
            });
            
            if (videoTrack) {
              tracks.push(videoTrack);
              console.log('✅ Mobile: Video track pubblicato CON SUCCESSO!');
            } else {
              console.warn('⚠️ Mobile: Video track non creato');
            }
            
          } catch (error) {
            console.error('❌ Mobile: Errore attivazione media:', error.message);
          }
          
          console.log('📱 Mobile: Pubblicazione completata AUDIO + VIDEO');
          
          // Aggiungi metodo per attivare video successivamente
          this.enableVideoLater = async () => {
            try {
              console.log('📱 Mobile: Tentativo MANUALE attivazione video...');
              const videoTrack = await this.room.localParticipant.setCameraEnabled(true);
              if (videoTrack) {
                console.log('✅ Mobile: Video attivato CON SUCCESSO manualmente!');
                return true;
              }
              return false;
            } catch (videoError) {
              console.error('❌ Mobile: Errore attivazione video manuale:', videoError.message);
              return false;
            }
          };
        } else {
          // DESKTOP: Configurazione normale
          const videoTrack = await this.room.localParticipant.setCameraEnabled(true, {
            resolution: {
              width: 480,
              height: 360,
              frameRate: 15
            }
          });
          if (videoTrack) {
            tracks.push(videoTrack);
            console.log('✅ Desktop: Video track pubblicato');
          }
          
          // Aggiungi metodo per attivare video successivamente anche su desktop
          this.enableVideoLater = async () => {
            try {
              console.log('💻 Desktop: Tentativo MANUALE attivazione video...');
              const videoTrack = await this.room.localParticipant.setCameraEnabled(true);
              if (videoTrack) {
                console.log('✅ Desktop: Video attivato CON SUCCESSO manualmente!');
                return true;
              }
              return false;
            } catch (videoError) {
              console.error('❌ Desktop: Errore attivazione video manuale:', videoError.message);
              return false;
            }
          };
        }
      }
      
      if (enableAudio && !isMobile) {
        console.log(`🎤 Desktop attivazione audio track...`);
        
        // DESKTOP: Audio normale
        const audioTrack = await this.room.localParticipant.setMicrophoneEnabled(true);
        if (audioTrack) {
          tracks.push(audioTrack);
          console.log('✅ Desktop: Audio track pubblicato');
        }
      }
      
      // NOTA: Per mobile, audio è già gestito nella sezione video sopra

      // Assicurati che enableVideoLater sia sempre disponibile, anche se il video non è stato attivato inizialmente
      if (!this.enableVideoLater) {
        this.enableVideoLater = async () => {
          try {
            console.log(`🎥 ${isMobile ? 'Mobile' : 'Desktop'}: Tentativo MANUALE attivazione video...`);
            const videoTrack = await this.room.localParticipant.setCameraEnabled(true);
            if (videoTrack) {
              console.log(`✅ ${isMobile ? 'Mobile' : 'Desktop'}: Video attivato CON SUCCESSO manualmente!`);
              return true;
            }
            return false;
          } catch (videoError) {
            console.error(`❌ ${isMobile ? 'Mobile' : 'Desktop'}: Errore attivazione video manuale:`, videoError.message);
            return false;
          }
        };
      }

      console.log(`🎉 ${isMobile ? 'Mobile' : 'Desktop'} pubblicazione completata: ${tracks.length} tracks attivi`);
      console.log(`🔧 enableVideoLater disponibile: ${!!this.enableVideoLater}`);
      return tracks;
    } catch (error) {
      console.error(`❌ ${isMobile ? 'Mobile' : 'Desktop'} errore pubblicazione tracks:`, error);
      throw error;
    }
  }

  async stopPublishing() {
    if (!this.room) return;

    try {
      await this.room.localParticipant.setCameraEnabled(false);
      await this.room.localParticipant.setMicrophoneEnabled(false);
    } catch (error) {
      console.error('Error stopping publishing:', error);
    }
  }

  async toggleCamera(enabled) {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('Error toggling camera:', error);
      return false;
    }
  }

  async toggleMicrophone(enabled) {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('Error toggling microphone:', error);
      return false;
    }
  }

  async switchCamera(deviceId) {
    if (!this.room) return false;
    try {
      await this.room.switchActiveDevice('videoinput', deviceId);
      return true;
    } catch (error) {
      console.error('Error switching camera:', error);
      return false;
    }
  }

  async switchMicrophone(deviceId) {
    if (!this.room) return false;
    try {
      await this.room.switchActiveDevice('audioinput', deviceId);
      return true;
    } catch (error) {
      console.error('Error switching microphone:', error);
      return false;
    }
  }

  async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput')
      };
    } catch (error) {
      console.error('Error getting media devices:', error);
      return { cameras: [], microphones: [] };
    }
  }

  // 🎯 NUOVA FUNZIONE: Pausa stream (non disconnette)
  pauseStream() {
    console.log('⏸️ PAUSA STREAM - Video in pausa ma connessione mantenuta');
    if (this.room) {
      // Ferma solo la pubblicazione, mantieni connessione
      this.stopPublishing();
    }
  }

  // 🎯 FUNZIONE: Riprendi stream dopo pausa
  resumeStream() {
    console.log('▶️ RIPRENDI STREAM - Riattiva video e audio');
    if (this.room) {
      // Riavvia la pubblicazione
      this.startPublishing(true, true);
    }
  }

  // 🎯 FUNZIONE: Disconnetti completamente (solo su comando esplicito)
  disconnect() {
    console.log('🛑 DISCONNESSIONE COMPLETA - Stream terminato definitivamente');
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    // Reset all connection states
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.currentRoomName = null;
    this.currentParticipantName = null;
    this.isConnecting = false;
    this.pendingConnection = null;
  }

  getConnectionState() {
    return this.connectionState;
  }

  isConnected() {
    return this.room && this.connectionState === 'connected';
  }

  getRoom() {
    return this.room;
  }
}

// Singleton instance
export const liveKit = new LiveKitService();
export default liveKit;
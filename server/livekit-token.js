import { AccessToken } from 'livekit-server-sdk';

export function generateLiveKitToken(roomName, participantName, role = 'subscriber') {
  try {
    console.log('🔧 generateLiveKitToken called with:', { roomName, participantName, role });
    
    // Validate environment variables
    const livekitUrl = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const secretKey = process.env.LIVEKIT_SECRET_KEY;

    console.log('🔧 Environment check:', { 
      hasUrl: !!livekitUrl, 
      hasApiKey: !!apiKey, 
      hasSecretKey: !!secretKey 
    });

    if (!livekitUrl || !apiKey || !secretKey) {
      throw new Error('LiveKit credentials not configured');
    }

    console.log('🔧 Creating AccessToken...');
    
    // Create access token
    const token = new AccessToken(apiKey, secretKey, {
      identity: participantName,
      name: participantName,
    });

    console.log('🔧 Adding grants for role:', role);

    // Grant permissions based on role
    if (role === 'publisher') {
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
    } else {
      token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
      });
    }

    const jwt = token.toJwt();
    console.log('🔧 JWT generated:', jwt ? `${jwt.substring(0, 50)}...` : 'NULL');
    
    return jwt;
  } catch (error) {
    console.error('❌ Error in generateLiveKitToken:', error);
    throw error;
  }
}

// Express endpoint for token generation
export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomName, participantName, role } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ 
        error: 'roomName and participantName are required' 
      });
    }

    const token = generateLiveKitToken(roomName, participantName, role);
    
    res.status(200).json({ 
      token,
      configured: true,
      room: roomName,
      participant: participantName,
      role: role || 'subscriber',
      serverUrl: process.env.LIVEKIT_URL
    });
    
  } catch (error) {
    console.error('Token generation error:', error);
    
    // Check if it's a configuration error
    if (error.message.includes('credentials not configured')) {
      return res.status(500).json({ 
        error: 'LiveKit not configured on server',
        configured: false
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message,
      configured: true
    });
  }
}
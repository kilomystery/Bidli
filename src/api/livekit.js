// API endpoints for LiveKit token generation
import { AccessToken } from 'livekit-server-sdk';

export async function generateLiveKitToken(roomName, participantName, role = 'subscriber') {
  // Check if LiveKit is configured
  const livekitUrl = process.env.LIVEKIT_URL || import.meta.env.VITE_LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const secretKey = process.env.LIVEKIT_SECRET_KEY;

  if (!livekitUrl || !apiKey || !secretKey) {
    throw new Error('LiveKit not configured on server');
  }

  try {
    const at = new AccessToken(apiKey, secretKey, {
      identity: participantName,
      ttl: '10m', // 10 minutes token validity
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === 'publisher',
      canSubscribe: true,
      canPublishData: true,
    });

    return await at.toJwt();
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    throw error;
  }
}

// Express/Replit compatible handler
export default async function handler(req, res) {
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

    const token = await generateLiveKitToken(roomName, participantName, role);
    
    res.status(200).json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
}
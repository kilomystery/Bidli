// Import from server directory for real token generation
import { generateLiveKitToken } from '../../server/livekit-token.js';

// API endpoint for LiveKit token generation (Replit compatible)
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

    // Generate real LiveKit token
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
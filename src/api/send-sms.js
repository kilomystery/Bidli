// src/api/send-sms.js - Endpoint per invio SMS con Twilio
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'Phone number and message are required' });
  }

  try {
    const messageResponse = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber
    });

    res.status(200).json({
      success: true,
      messageSid: messageResponse.sid,
      status: messageResponse.status
    });

  } catch (error) {
    console.error('Twilio SMS error:', error);
    res.status(500).json({
      error: 'Failed to send SMS',
      details: error.message
    });
  }
}
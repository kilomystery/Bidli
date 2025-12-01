// src/utils/twilioSMS.js
export async function sendSMSCode(phoneNumber, code) {
  try {
    const API_BASE = window.location.origin.replace(':5000', ':3001');
    const response = await fetch(`${API_BASE}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber,
        message: `Il tuo codice di verifica BIDLi è: ${code}. Non condividerlo con nessuno.`
      })
    });

    if (!response.ok) {
      throw new Error('Errore invio SMS');
    }

    return await response.json();
  } catch (error) {
    console.error('Errore Twilio SMS:', error);
    throw error;
  }
}

// Genera codice OTP a 6 cifre
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Valida formato numero di telefono italiano
export function validatePhoneNumber(phone) {
  // Accetta formati: +39123456789, 0039123456789, 123456789
  const cleanPhone = phone.replace(/\s+/g, '');
  const italianPhoneRegex = /^(\+39|0039|39)?[0-9]{8,10}$/;
  return italianPhoneRegex.test(cleanPhone);
}

// Normalizza numero di telefono al formato internazionale
export function normalizePhoneNumber(phone) {
  let cleanPhone = phone.replace(/\s+/g, '');
  
  // Rimuovi prefissi esistenti
  if (cleanPhone.startsWith('+39')) {
    cleanPhone = cleanPhone.substring(3);
  } else if (cleanPhone.startsWith('0039')) {
    cleanPhone = cleanPhone.substring(4);
  } else if (cleanPhone.startsWith('39')) {
    cleanPhone = cleanPhone.substring(2);
  }
  
  // Aggiungi +39 per l'Italia
  return `+39${cleanPhone}`;
}
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { AccessToken } from 'livekit-server-sdk';

const app = express();
const port = 3001;

// Database connection
const { Pool } = pg;

// 👇 INCOLLA QUI SOTTO la tua URI di Supabase al posto di PASTE_SUPABASE_URL
const HARDCODED_DB_URL = 'postgresql://postgres.cpfhdkmqoayjyvybnlua:Iobbase93!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Usiamo prima l'env, se c'è, altrimenti la stringa hardcoded
const dbUrl = process.env.DATABASE_URL || HARDCODED_DB_URL;

if (!dbUrl) {
  console.error('❌ ERRORE: nessuna DATABASE_URL trovata (né .env né hardcoded)');
}

const useSSL =
  dbUrl &&
  (dbUrl.includes('supabase.co') ||
   dbUrl.includes('neon.tech') ||
   dbUrl.includes('render.com'));

console.log('🗄  DATABASE_URL in uso:', dbUrl ? dbUrl : 'MANCANTE');
console.log('🔐 SSL attivo per Postgres?', useSSL);

const pool = new Pool({
  connectionString: dbUrl,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});


// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    if (!dbUrl) {
      return res.status(500).json({
        error: 'DATABASE_URL non configurata sul server',
      });
    }

    const result = await pool.query('SELECT current_database(), current_user');
    res.json({
      status: 'Database connected!',
      database: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Database connection error in /api/test:', error.message);
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,   // 👈 così vediamo l’errore preciso nel browser
    });
  }
});


// Test complete profile flow
app.get('/api/test-profile-flow/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 1. Check if user exists
    const userCheck = await pool.query('SELECT id, email FROM profiles WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // 2. Test username check
    const usernameCheck = await pool.query(
      'SELECT id FROM profiles WHERE LOWER(username) = LOWER($1) AND id != $2',
      ['testuser', userId]
    );
    
    // 3. Simulate profile update
    const profileData = {
      username: 'testuser',
      phone: '+39123456789',
      shipping_address: 'Via Test 123',
      first_name: 'Test',
      last_name: 'User'
    };
    
    res.json({
      status: 'Profile flow test completed',
      results: {
        user_exists: userCheck.rows[0],
        username_available: usernameCheck.rows.length === 0,
        sample_profile_data: profileData,
        flow_status: 'Ready for testing'
      }
    });
    
  } catch (error) {
    console.error('Profile flow test error:', error);
    res.status(500).json({ error: 'Profile flow test failed' });
  }
});

// Check username availability
app.get('/api/profiles/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { userId } = req.query;
    
    let query = 'SELECT id FROM profiles WHERE LOWER(username) = LOWER($1)';
    let params = [username];
    
    if (userId) {
      query += ' AND id != $2';
      params.push(userId);
    }
    
    const result = await pool.query(query, params);
    
    res.json({ 
      available: result.rows.length === 0,
      exists: result.rows.length > 0 
    });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ error: 'Errore controllo username' });
  }
});

// Get profile by ID
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Errore recupero profilo' });
  }
});

// ENDPOINT DEDICATO PER UPGRADE A VENDITORE - DEVE ESSERE PRIMA DEL PARAMETRICO!
app.post('/api/profiles/upgrade', async (req, res) => {
  try {
    const { userId, ...data } = req.body;
    
    console.log('UPGRADE REQUEST:', { userId, data });
    
    // 1. UPSERT SICURO - FUNZIONA SEMPRE (CREA O AGGIORNA)
    const profileUpsertQuery = `
      INSERT INTO profiles (
        id, email, role, store_name, category, iban, phone,
        shipping_address, shipping_city, shipping_postal_code, 
        shipping_country, profile_completed
      ) VALUES (
        $1, $2, 'seller', $3, $4, $5, $6, $7, $8, $9, $10, true
      )
      ON CONFLICT (id) DO UPDATE SET
        role = 'seller',
        store_name = EXCLUDED.store_name,
        category = EXCLUDED.category,
        iban = EXCLUDED.iban,
        phone = EXCLUDED.phone,
        shipping_address = EXCLUDED.shipping_address,
        shipping_city = EXCLUDED.shipping_city,
        shipping_postal_code = EXCLUDED.shipping_postal_code,
        shipping_country = EXCLUDED.shipping_country,
        profile_completed = true
      RETURNING *
    `;
    
    const profileResult = await pool.query(profileUpsertQuery, [
      userId,
      data.business_email || `user-${userId}@bidli.live`,
      data.store_name || '',
      data.category || '',
      data.iban || '',
      data.phone || '',
      data.shipping_address || '',
      data.shipping_city || '',
      data.shipping_postal_code || '',
      data.shipping_country || 'Italy'
    ]);
    
    console.log('✅ PROFILO AGGIORNATO A SELLER:', profileResult.rows[0]);
    
    // 2. Crea record venditore se non esiste
    const handle = (data.store_name || 'seller').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
    
    try {
      const sellerInsertQuery = `
        INSERT INTO sellers (
          user_id, handle, display_name, store_name, bio, iban,
          category, shipping_address, shipping_city, shipping_postal_code,
          shipping_country, phone, business_email, profile_completed
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) 
        ON CONFLICT (user_id) DO UPDATE SET
          handle = EXCLUDED.handle,
          display_name = EXCLUDED.display_name,
          store_name = EXCLUDED.store_name,
          bio = EXCLUDED.bio,
          iban = EXCLUDED.iban,
          category = EXCLUDED.category,
          shipping_address = EXCLUDED.shipping_address,
          shipping_city = EXCLUDED.shipping_city,
          shipping_postal_code = EXCLUDED.shipping_postal_code,
          shipping_country = EXCLUDED.shipping_country,
          phone = EXCLUDED.phone,
          business_email = EXCLUDED.business_email,
          profile_completed = EXCLUDED.profile_completed
        RETURNING *
      `;
      
      const sellerResult = await pool.query(sellerInsertQuery, [
        userId,
        handle,
        data.store_name,
        data.store_name,
        data.store_description || '',
        data.iban,
        data.category,
        data.shipping_address,
        data.shipping_city,
        data.shipping_postal_code,
        data.shipping_country || 'Italy',
        data.phone,
        data.business_email,
        true
      ]);
      
      console.log('✅ SELLER CREATO/AGGIORNATO:', sellerResult.rows[0]);
      
      res.json({ 
        success: true, 
        profile: profileResult.rows[0],
        seller: sellerResult.rows[0],
        message: 'Upgrade a venditore completato con successo!' 
      });
      
    } catch (sellerError) {
      console.error('Errore creazione seller:', sellerError);
      // Anche se il seller fallisce, il profilo è stato aggiornato
      res.json({ 
        success: true, 
        profile: profileResult.rows[0],
        message: 'Upgrade completato (seller da completare)' 
      });
    }
    
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ 
      error: 'Errore durante upgrade a venditore',
      details: error.message 
    });
  }
});

// Update or create profile (GENERICO - DOPO QUELLO SPECIFICO)
app.post('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // First check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM profiles WHERE id = $1',
      [id]
    );
    
    if (existingProfile.rows.length === 0) {
      // Create new profile
      const insertQuery = `
        INSERT INTO profiles (
          id, email, username, phone, shipping_address, first_name, last_name,
          shipping_city, shipping_postal_code, shipping_country, store_name,
          category, iban, profile_picture, profile_completed, role
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        ) RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [
        id,
        data.email || `user-${id}@bidli.live`, // Email obbligatoria
        data.username,
        data.phone,
        data.shipping_address,
        data.first_name || '',
        data.last_name || '',
        data.shipping_city || '',
        data.shipping_postal_code || '',
        data.shipping_country || 'Italy',
        data.store_name || '',
        data.category || '',
        data.iban || '',
        data.profile_picture || '',
        true,
        'buyer'
      ]);
      
      res.json({ 
        success: true, 
        profile: result.rows[0],
        message: 'Profilo creato con successo!' 
      });
    } else {
      // Update existing profile
      const updateQuery = `
        UPDATE profiles SET 
          username = $2, phone = $3, shipping_address = $4,
          first_name = $5, last_name = $6, shipping_city = $7,
          shipping_postal_code = $8, shipping_country = $9,
          store_name = $10, category = $11, iban = $12,
          profile_picture = $13, profile_completed = $14, role = $15
        WHERE id = $1 
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [
        id,
        data.username,
        data.phone,
        data.shipping_address,
        data.first_name || '',
        data.last_name || '',
        data.shipping_city || '',
        data.shipping_postal_code || '',
        data.shipping_country || 'Italy',
        data.store_name || '',
        data.category || '',
        data.iban || '',
        data.profile_picture || '',
        true,
        'buyer'
      ]);
      
      res.json({ 
        success: true, 
        profile: result.rows[0],
        message: 'Profilo aggiornato con successo!' 
      });
    }
  } catch (error) {
    console.error('Profile save error:', error);
    
    if (error.code === '23505' && error.detail?.includes('username')) {
      res.status(400).json({ 
        error: 'Questo nome utente è già in uso. Scegline un altro.' 
      });
    } else {
      res.status(500).json({ error: 'Errore salvataggio profilo' });
    }
  }
});

// Skip profile completion (mark as completed without data)
app.post('/api/profiles/:id/skip', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'UPDATE profiles SET profile_completed = true WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profilo non trovato' });
    }
    
    res.json({ 
      success: true, 
      profile: result.rows[0],
      message: 'Profilo completato!' 
    });
  } catch (error) {
    console.error('Skip profile error:', error);
    res.status(500).json({ error: 'Errore completamento profilo' });
  }
});


// Create seller profile
app.post('/api/sellers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = req.body;
    
    const handle = data.store_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const insertQuery = `
      INSERT INTO sellers (
        user_id, handle, display_name, store_name, bio, iban, avatar_url,
        category, shipping_address, shipping_city, shipping_postal_code,
        shipping_country, phone, business_email, profile_completed
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      userId,
      handle,
      data.store_name,
      data.store_name,
      data.store_description || '',
      data.iban,
      data.avatar_url || '',
      data.category,
      data.shipping_address,
      data.shipping_city,
      data.shipping_postal_code,
      data.shipping_country,
      data.phone,
      data.business_email,
      true
    ]);
    
    res.json({ 
      success: true, 
      seller: result.rows[0],
      message: 'Venditore creato con successo!' 
    });
  } catch (error) {
    console.error('Create seller error:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ 
        error: 'Handle venditore già in uso. Prova con un nome diverso.' 
      });
    } else {
      res.status(500).json({ error: 'Errore creazione venditore' });
    }
  }
});

// SMS endpoint stub (prevenire errori JSON)
app.post('/api/send-sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    console.log('SMS simulated:', phoneNumber, message);
    
    // In produzione qui implementeresti Twilio
    res.json({ 
      success: true, 
      message: 'SMS inviato (simulato)',
      sid: 'fake_sid_' + Date.now()
    });
  } catch (error) {
    console.error('SMS error:', error);
    res.status(500).json({ error: 'Errore invio SMS' });
  }
});

// LiveKit token endpoint - REAL implementation
app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, participantName, role = 'subscriber' } = req.body;
    
    console.log('🎥 LiveKit token request:', { roomName, participantName, role });
    
    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName e participantName richiesti' });
    }
    
    // Validate environment variables first
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_SECRET_KEY) {
      console.error('❌ LiveKit credentials missing');
      return res.status(500).json({ 
        error: 'LiveKit non configurato',
        configured: false
      });
    }
    
    // Generate token directly with SDK (using static import)
    
    console.log('🔧 Creating AccessToken with API key:', process.env.LIVEKIT_API_KEY?.substring(0, 10) + '...');
    
    // Create token with proper options
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET_KEY, {
      identity: participantName,
      name: participantName,
      ttl: '24h', // Token expires in 24 hours
    });

    console.log('🔧 Token object created, adding grants...');

    // Add grants with proper room name and enhanced permissions for publisher
    const grant = {
      roomJoin: true,
      room: roomName,
      canPublish: role === 'publisher',
      canSubscribe: true,
      canPublishData: role === 'publisher',
      canUpdateOwnMetadata: role === 'publisher',
    };
    
    token.addGrant(grant);

    console.log('🔧 Grants added:', JSON.stringify(grant, null, 2));
    console.log('🔧 Calling toJwt()...');
    
    // Try different approaches to generate JWT
    let jwtToken;
    try {
      jwtToken = await token.toJwt();
      console.log('🔧 Async toJwt() result:', jwtToken ? `Token of ${jwtToken.length} chars` : 'Invalid/empty');
    } catch (asyncError) {
      console.log('🔧 Async toJwt() failed, trying sync...');
      try {
        jwtToken = token.toJwt();
        console.log('🔧 Sync toJwt() result:', jwtToken ? `Token of ${jwtToken.length} chars` : 'Invalid/empty');
      } catch (syncError) {
        console.error('🔧 Both JWT methods failed:', { asyncError, syncError });
        throw new Error('JWT generation failed with both async and sync methods');
      }
    }
    
    // Assicurati che il token sia una stringa valida
    if (!jwtToken || typeof jwtToken !== 'string' || jwtToken.length < 10) {
      throw new Error(`Token generation failed - invalid JWT: ${typeof jwtToken}, length: ${jwtToken?.length}`);
    }
    
    console.log('✅ Token generato con successo, lunghezza:', jwtToken.length);
    
    res.json({ 
      success: true,
      token: jwtToken,
      serverUrl: process.env.LIVEKIT_URL,
      message: 'Token LiveKit generato con successo'
    });
  } catch (error) {
    console.error('❌ LiveKit token error:', error);
    if (error.message.includes('LiveKit credentials not configured')) {
      res.status(500).json({ 
        error: 'LiveKit not configured on server',
        details: 'LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_SECRET_KEY required'
      });
    } else {
      res.status(500).json({ error: 'Errore generazione token LiveKit' });
    }
  }
});

// Endpoint di test semplificato per LiveKit
app.post('/api/livekit/test-token', async (req, res) => {
  try {
    console.log('🧪 Test token endpoint chiamato');
    
    // Token fisso per test
    const testToken = "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoidGVzdCIsInZpZGVvIjp7InJvb21Kb2luIjp0cnVlLCJyb29tIjoidGVzdCIsImNhblB1Ymxpc2giOmZhbHNlLCJjYW5TdWJzY3JpYmUiOnRydWV9LCJpc3MiOiJBUElETTZNcFlyRFpQc1ciLCJleHAiOjE3NTcyNDUxNDIsIm5iZiI6MCwic3ViIjoidGVzdCJ9.bg-XVVUkUMWchvySYyu3gDrjVP1rD6MpkuSqIXocsfU";
    
    res.json({
      success: true,
      token: testToken,
      message: "Test token OK"
    });
    
  } catch (error) {
    console.error('❌ Test token error:', error);
    res.status(500).json({ error: 'Test token failed' });
  }
});

// Stripe checkout endpoint stub (prevenire errori JSON)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, metadata } = req.body;
    console.log('Stripe checkout simulated:', items, metadata);
    
    // In produzione qui implementeresti Stripe
    res.json({ 
      success: true,
      checkout_url: 'https://checkout.stripe.com/fake_session_' + Date.now(),
      session_id: 'cs_fake_' + Date.now(),
      message: 'Sessione checkout creata (simulata)'
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Errore creazione checkout' });
  }
});

// Get live by ID 
app.get('/api/lives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ DEBUG UUID 
    console.log('🔍 API Live ID ricevuto:', JSON.stringify(id), 'lunghezza:', id.length);
    
    // ✅ VALIDAZIONE UUID - controllo formato base
    if (!id || id.length < 32) {
      console.log('❌ UUID invalido - troppo corto:', id);
      return res.status(400).json({ 
        error: 'UUID invalido', 
        received_id: id,
        length: id?.length || 0 
      });
    }
    
    const result = await pool.query(
      'SELECT l.*, s.user_id as seller_user_id, s.display_name as seller_display_name, s.handle as seller_handle, s.avatar_url as seller_avatar_url FROM lives l LEFT JOIN sellers s ON l.seller_id = s.id WHERE l.id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('⚠️ Live non trovata per ID:', id);
      return res.status(404).json({ error: 'Live not found', searched_id: id });
    }
    
    console.log('✅ Live trovata:', result.rows[0].id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get live error:', error);
    console.error('ID che ha causato errore:', req.params.id);
    res.status(500).json({ error: 'Errore recupero live', invalid_id: req.params.id });
  }
});

// Get seller by user_id  
app.get('/api/sellers/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT id, user_id, handle, display_name, avatar_url FROM sellers WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get seller error:', error);
    res.status(500).json({ error: 'Errore recupero seller' });
  }
});

// ===== REVIEW SYSTEM API ENDPOINTS =====

// Create a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { buyer_id, seller_id, rating, title, comment, purchase_reference } = req.body;
    
    // Validation
    if (!buyer_id || !seller_id || !rating) {
      return res.status(400).json({ error: 'buyer_id, seller_id e rating sono richiesti' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve essere tra 1 e 5' });
    }
    
    if (buyer_id === seller_id) {
      return res.status(400).json({ error: 'Non puoi recensire te stesso' });
    }
    
    // Check if buyer already reviewed this seller
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE buyer_id = $1 AND seller_id = $2',
      [buyer_id, seller_id]
    );
    
    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Hai già recensito questo venditore' });
    }
    
    // Insert review
    const result = await pool.query(`
      INSERT INTO reviews (buyer_id, seller_id, rating, title, comment, purchase_reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [buyer_id, seller_id, rating, title, comment, purchase_reference]);
    
    console.log('✅ Recensione creata:', result.rows[0]);
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Errore creazione recensione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Get reviews for a seller
app.get('/api/reviews/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    const offset = (page - 1) * limit;
    let orderBy = 'r.created_at DESC';
    
    if (sort === 'oldest') orderBy = 'r.created_at ASC';
    if (sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
    if (sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';
    
    const result = await pool.query(`
      SELECT 
        r.*,
        p.username as buyer_username,
        p.first_name as buyer_first_name,
        p.last_name as buyer_last_name,
        p.profile_picture as buyer_avatar
      FROM reviews r
      JOIN profiles p ON r.buyer_id = p.id
      WHERE r.seller_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `, [sellerId, limit, offset]);
    
    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE seller_id = $1',
      [sellerId]
    );
    
    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
    
  } catch (error) {
    console.error('Errore recupero recensioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Get seller rating statistics
app.get('/api/reviews/seller/:sellerId/stats', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        total_reviews,
        average_rating,
        rating_1_star,
        rating_2_star,
        rating_3_star,
        rating_4_star,
        rating_5_star
      FROM sellers 
      WHERE user_id = $1
    `, [sellerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venditore non trovato' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Errore recupero statistiche:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Update a review (only by the review author)
app.put('/api/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { buyer_id, rating, title, comment } = req.body;
    
    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve essere tra 1 e 5' });
    }
    
    // Check if review exists and belongs to buyer
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND buyer_id = $2',
      [reviewId, buyer_id]
    );
    
    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Recensione non trovata o non autorizzato' });
    }
    
    // Update review
    const result = await pool.query(`
      UPDATE reviews 
      SET rating = $1, title = $2, comment = $3, updated_at = NOW()
      WHERE id = $4 AND buyer_id = $5
      RETURNING *
    `, [rating, title, comment, reviewId, buyer_id]);
    
    console.log('✅ Recensione aggiornata:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Errore aggiornamento recensione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Delete a review (only by the review author)
app.delete('/api/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { buyer_id } = req.body;
    
    // Check if review exists and belongs to buyer
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND buyer_id = $2',
      [reviewId, buyer_id]
    );
    
    if (existingReview.rows.length === 0) {
      return res.status(404).json({ error: 'Recensione non trovata o non autorizzato' });
    }
    
    // Delete review
    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    
    console.log('✅ Recensione eliminata:', reviewId);
    res.json({ message: 'Recensione eliminata con successo' });
    
  } catch (error) {
    console.error('Errore eliminazione recensione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ===== ORDERS MANAGEMENT API ENDPOINTS =====

// Create order from auction win (automatic)
app.post('/api/orders/create-from-auction', async (req, res) => {
  try {
    const { auction_product_id, winner_user_id, final_price, shipping_address } = req.body;
    
    if (!auction_product_id || !winner_user_id || !final_price || !shipping_address) {
      return res.status(400).json({ error: 'Tutti i campi sono richiesti' });
    }
    
    const result = await pool.query(
      'SELECT create_order_from_auction($1, $2, $3, $4) as order_id',
      [auction_product_id, winner_user_id, final_price, JSON.stringify(shipping_address)]
    );
    
    const orderId = result.rows[0].order_id;
    
    // Recupera l'ordine creato
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    
    console.log('✅ Ordine automatico creato:', orderResult.rows[0]);
    res.status(201).json(orderResult.rows[0]);
    
  } catch (error) {
    console.error('Errore creazione ordine automatico:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Get orders for seller
app.get('/api/orders/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT o.*, 
             p.first_name as buyer_first_name, 
             p.last_name as buyer_last_name,
             p.email as buyer_email
      FROM orders o
      LEFT JOIN profiles p ON o.buyer_id = p.id
      WHERE o.seller_id = $1
    `;
    const params = [sellerId];
    
    if (status) {
      query += ` AND o.order_status = $${params.length + 1}`;
      params.push(status);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Errore recupero ordini venditore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Get orders for buyer
app.get('/api/orders/buyer/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await pool.query(`
      SELECT o.*, 
             s.display_name as seller_name,
             s.handle as seller_handle
      FROM orders o
      LEFT JOIN sellers s ON o.seller_id = s.id
      WHERE o.buyer_id = $1
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `, [buyerId, limit, offset]);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Errore recupero ordini acquirente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Update order status
app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, shipping_status, payment_status, tracking_number, notes } = req.body;
    
    const updates = [];
    const values = [orderId];
    let valueIndex = 2;
    
    if (order_status !== undefined) {
      updates.push(`order_status = $${valueIndex}`);
      values.push(order_status);
      valueIndex++;
    }
    
    if (shipping_status !== undefined) {
      updates.push(`shipping_status = $${valueIndex}`);
      values.push(shipping_status);
      valueIndex++;
      
      // Se spedito, aggiorna timestamp
      if (shipping_status === 'picked_up' || shipping_status === 'in_transit') {
        updates.push(`shipped_at = NOW()`);
      }
      
      // Se consegnato, aggiorna timestamp
      if (shipping_status === 'delivered') {
        updates.push(`delivered_at = NOW()`);
        updates.push(`actual_delivery_date = CURRENT_DATE`);
      }
    }
    
    if (payment_status !== undefined) {
      updates.push(`payment_status = $${valueIndex}`);
      values.push(payment_status);
      valueIndex++;
      
      // Se pagato, aggiorna timestamp
      if (payment_status === 'paid') {
        updates.push(`paid_at = NOW()`);
      }
    }
    
    if (tracking_number !== undefined) {
      updates.push(`tracking_number = $${valueIndex}`);
      values.push(tracking_number);
      valueIndex++;
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${valueIndex}`);
      values.push(notes);
      valueIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const query = `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ordine non trovato' });
    }
    
    const updatedOrder = result.rows[0];
    console.log('✅ Ordine aggiornato:', updatedOrder);
    
    // Invia notifiche automatiche sui cambi di stato importanti
    if (order_status || shipping_status || payment_status) {
      try {
        let notificationTitle = '';
        let notificationMessage = '';
        
        if (payment_status === 'paid') {
          notificationTitle = 'Pagamento Ricevuto!';
          notificationMessage = `Il pagamento per l'ordine #${updatedOrder.order_number} è stato ricevuto. L'ordine verrà elaborato a breve.`;
        } else if (order_status === 'processing') {
          notificationTitle = 'Ordine in Elaborazione';
          notificationMessage = `Il tuo ordine #${updatedOrder.order_number} è ora in elaborazione. Ti aggiorneremo appena verrà spedito.`;
        } else if (shipping_status === 'picked_up' || shipping_status === 'in_transit') {
          notificationTitle = 'Ordine Spedito!';
          notificationMessage = `Il tuo ordine #${updatedOrder.order_number} è stato spedito. ${tracking_number ? `Tracking: ${tracking_number}` : 'Riceverai il tracking a breve.'}`;
        } else if (shipping_status === 'delivered') {
          notificationTitle = 'Ordine Consegnato!';
          notificationMessage = `Il tuo ordine #${updatedOrder.order_number} è stato consegnato. Grazie per aver scelto BIDLi!`;
        }
        
        if (notificationTitle && notificationMessage) {
          await pool.query(`
            INSERT INTO order_notifications (order_id, user_id, notification_type, title, message, sent_via)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            updatedOrder.id,
            updatedOrder.buyer_id,
            'order_status_update',
            notificationTitle,
            notificationMessage,
            'app'
          ]);
          console.log('✅ Notifica automatica inviata per cambio stato ordine');
        }
      } catch (notifError) {
        console.error('Errore invio notifica automatica:', notifError);
      }
    }
    
    res.json(updatedOrder);
    
  } catch (error) {
    console.error('Errore aggiornamento ordine:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ===== NOTIFICATIONS API ENDPOINTS =====

// Create automatic notification
app.post('/api/notifications/create', async (req, res) => {
  try {
    const { user_id, type, title, message, order_id, sent_via = 'app' } = req.body;
    
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ error: 'user_id, type, title e message sono richiesti' });
    }
    
    const result = await pool.query(`
      INSERT INTO order_notifications (order_id, user_id, notification_type, title, message, sent_via)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [order_id || null, user_id, type, title, message, sent_via]);
    
    console.log('✅ Notifica creata:', result.rows[0]);
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Errore creazione notifica:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Get notifications for user
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, unread_only = false } = req.query;
    
    let query = `
      SELECT on.*, o.order_number, o.product_title
      FROM order_notifications on
      LEFT JOIN orders o ON on.order_id = o.id
      WHERE on.user_id = $1
    `;
    const params = [userId];
    
    if (unread_only === 'true') {
      query += ` AND on.is_sent = false`;
    }
    
    query += ` ORDER BY on.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    console.error('Errore recupero notifiche:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Mark notification as sent/read
app.patch('/api/notifications/:notificationId/mark-sent', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await pool.query(`
      UPDATE order_notifications 
      SET is_sent = true, sent_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `, [notificationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notifica non trovata' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Errore aggiornamento notifica:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Send live finish notifications automatically
app.post('/api/notifications/live-finished', async (req, res) => {
  try {
    const { live_id, seller_id, orders_created } = req.body;
    
    if (!live_id || !seller_id) {
      return res.status(400).json({ error: 'live_id e seller_id sono richiesti' });
    }
    
    // Notifica al venditore
    await pool.query(`
      INSERT INTO order_notifications (user_id, notification_type, title, message, sent_via)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      seller_id,
      'live_finished',
      'Live Terminata con Successo!',
      `La tua live session è terminata. ${orders_created || 0} ordini sono stati creati automaticamente.`,
      'app'
    ]);
    
    // Notifiche agli acquirenti per ogni ordine creato
    if (orders_created > 0) {
      const ordersResult = await pool.query(`
        SELECT o.*, p.id as buyer_id 
        FROM orders o
        JOIN profiles p ON o.buyer_id = p.id
        WHERE o.live_session_id = $1
      `, [live_id]);
      
      for (const order of ordersResult.rows) {
        await pool.query(`
          INSERT INTO order_notifications (order_id, user_id, notification_type, title, message, sent_via)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          order.id,
          order.buyer_id,
          'order_created',
          'Congratulazioni! Hai vinto un\'asta!',
          `Il tuo ordine #${order.order_number} per "${order.product_title}" è stato creato. Totale: €${order.total_amount}`,
          'app'
        ]);
      }
    }
    
    console.log(`✅ Notifiche live terminata inviate. Venditore: ${seller_id}, Ordini: ${orders_created}`);
    res.json({ 
      success: true, 
      message: `Notifiche inviate al venditore e ${orders_created} acquirenti` 
    });
    
  } catch (error) {
    console.error('Errore invio notifiche live terminata:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ===== ANALYTICS API ENDPOINTS =====

// Get seller analytics for dashboard
app.get('/api/analytics/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { period = '30', type = 'daily' } = req.query; // period in days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // KPI generali
    const kpiResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(DISTINCT o.buyer_id) as unique_customers,
        COUNT(DISTINCT ls.id) as total_live_sessions
      FROM orders o
      LEFT JOIN live_sessions ls ON o.live_session_id = ls.id
      WHERE o.seller_id = $1 AND o.created_at >= $2
    `, [sellerId, startDate.toISOString()]);
    
    // Analytics dettagliate per periodo
    const analyticsResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        SUM(total_amount) as daily_revenue,
        COUNT(DISTINCT buyer_id) as unique_buyers
      FROM orders 
      WHERE seller_id = $1 AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [sellerId, startDate.toISOString()]);
    
    // Top prodotti venduti
    const topProductsResult = await pool.query(`
      SELECT 
        product_title,
        COUNT(*) as sales_count,
        SUM(final_auction_price) as total_revenue,
        AVG(final_auction_price) as avg_price
      FROM orders 
      WHERE seller_id = $1 AND created_at >= $2
      GROUP BY product_title
      ORDER BY sales_count DESC
      LIMIT 10
    `, [sellerId, startDate.toISOString()]);
    
    // Stati ordini
    const orderStatusResult = await pool.query(`
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders 
      WHERE seller_id = $1 AND created_at >= $2
      GROUP BY order_status
    `, [sellerId, startDate.toISOString()]);
    
    res.json({
      kpi: kpiResult.rows[0],
      daily_analytics: analyticsResult.rows,
      top_products: topProductsResult.rows,
      order_status_breakdown: orderStatusResult.rows
    });
    
  } catch (error) {
    console.error('Errore analytics venditore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Finish live session and create orders automatically
app.post('/api/live/:liveId/finish', async (req, res) => {
  try {
    const { liveId } = req.params;
    
    // 1. Aggiorna stato live session
    await pool.query(
      'UPDATE live_sessions SET status = $1, ended_at = NOW() WHERE id = $2',
      ['ended', liveId]
    );
    
    // 2. Chiudi tutte le aste e crea ordini per i vincitori
    const auctionsResult = await pool.query(`
      SELECT ap.*, b.bidder_id, b.amount as winning_bid
      FROM auction_products ap
      LEFT JOIN bids b ON ap.id = b.auction_product_id AND b.is_winning = true
      WHERE ap.live_session_id = $1 AND ap.status = 'live'
    `, [liveId]);
    
    const createdOrders = [];
    
    for (const auction of auctionsResult.rows) {
      // Aggiorna stato asta
      await pool.query(
        'UPDATE auction_products SET status = $1, final_price = $2, winner_user_id = $3 WHERE id = $4',
        [auction.bidder_id ? 'sold' : 'ended', auction.winning_bid || auction.starting_price, auction.bidder_id, auction.id]
      );
      
      // Se c'è un vincitore, crea l'ordine
      if (auction.bidder_id && auction.winning_bid) {
        // Per ora usa indirizzo fittizio - in produzione recuperare da profilo utente
        const defaultShippingAddress = {
          name: "Da configurare",
          street: "Da configurare", 
          city: "Da configurare",
          zip: "00000",
          country: "Italy",
          phone: "Da configurare"
        };
        
        try {
          const orderResult = await pool.query(
            'SELECT create_order_from_auction($1, $2, $3, $4) as order_id',
            [auction.id, auction.bidder_id, auction.winning_bid, JSON.stringify(defaultShippingAddress)]
          );
          
          createdOrders.push(orderResult.rows[0].order_id);
        } catch (orderError) {
          console.error('Errore creazione ordine per asta:', auction.id, orderError);
        }
      }
    }
    
    // 3. Aggiorna analytics
    await pool.query('SELECT update_live_analytics($1)', [liveId]);
    
    // 4. Invia notifiche automatiche
    const liveResult = await pool.query('SELECT seller_id FROM live_sessions WHERE id = $1', [liveId]);
    if (liveResult.rows.length > 0) {
      const sellerId = liveResult.rows[0].seller_id;
      
      // Chiama endpoint notifiche
      try {
        await fetch(`${req.protocol}://${req.get('host')}/api/notifications/live-finished`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            live_id: liveId,
            seller_id: sellerId,
            orders_created: createdOrders.length
          })
        });
        console.log('✅ Notifiche automatiche inviate');
      } catch (notifError) {
        console.error('Errore invio notifiche automatiche:', notifError);
      }
    }
    
    console.log(`✅ Live ${liveId} terminata. Ordini creati: ${createdOrders.length}`);
    
    res.json({
      success: true,
      message: `Live terminata con successo. ${createdOrders.length} ordini creati automaticamente.`,
      orders_created: createdOrders.length,
      order_ids: createdOrders
    });
    
  } catch (error) {
    console.error('Errore termine live:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// SOCIAL POSTS API - DIRECT DATABASE (Bypasses Supabase cache issues)
// ============================================

// Create social post - DIRECT PostgreSQL INSERT
app.post('/api/social/posts', async (req, res) => {
  try {
    console.log('📝 [DIRECT DB] Creating social post:', req.body);
    
    const { user_id, content, images, live_id, visibility, tags, mentions } = req.body;

    // Direct PostgreSQL INSERT bypassing Supabase schema cache
    const result = await pool.query(`
      INSERT INTO social_posts (user_id, content, images, live_id, visibility, tags, mentions)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      user_id,
      content || '',
      JSON.stringify(images || []),
      live_id || null,
      visibility || 'public',
      JSON.stringify(tags || []),
      JSON.stringify(mentions || [])
    ]);

    console.log('✅ [DIRECT DB] Post created successfully:', result.rows[0].id);
    res.json({ success: true, post: result.rows[0] });

  } catch (error) {
    console.error('❌ [DIRECT DB] Create social post error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user social posts
app.get('/api/social/posts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT sp.*, 
             p.username, p.first_name, p.last_name, p.profile_picture
      FROM social_posts sp
      LEFT JOIN profiles p ON sp.user_id = p.id
      WHERE sp.user_id = $1 AND (sp.status IS NULL OR sp.status != 'deleted')
      ORDER BY sp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({ success: true, posts: result.rows });

  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ❤️ LIKE/DISLIKE POST API 
app.post('/api/social/posts/like', async (req, res) => {
  try {
    const { postId, userId } = req.body;
    
    if (!postId || !userId) {
      return res.status(400).json({ error: 'postId e userId richiesti' });
    }

    // Check se il like esiste già
    const existingLike = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike: rimuovi like
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      );

      // Aggiorna contatore
      await pool.query(
        'UPDATE social_posts SET likes_count = COALESCE(likes_count, 0) - 1 WHERE id = $1',
        [postId]
      );

      console.log('👎 Post unliked:', { postId, userId });
      res.json({ success: true, action: 'unliked', liked: false });
    } else {
      // Like: aggiungi like
      await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, userId]
      );

      // Aggiorna contatore
      await pool.query(
        'UPDATE social_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1',
        [postId]
      );

      console.log('❤️ Post liked:', { postId, userId });
      res.json({ success: true, action: 'liked', liked: true });
    }

  } catch (error) {
    console.error('❌ Like API error:', error);
    res.status(500).json({ error: 'Errore toggle like' });
  }
});

// 💬 COMMENTS API
app.post('/api/social/posts/comment', async (req, res) => {
  try {
    const { postId, userId, content } = req.body;
    
    if (!postId || !userId || !content?.trim()) {
      return res.status(400).json({ error: 'postId, userId e content richiesti' });
    }

    // Inserisci commento
    const result = await pool.query(`
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [postId, userId, content.trim()]);

    // Aggiorna contatore commenti
    await pool.query(
      'UPDATE social_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = $1',
      [postId]
    );

    console.log('💬 Comment added:', result.rows[0]);
    res.json({ success: true, comment: result.rows[0] });

  } catch (error) {
    console.error('❌ Comment API error:', error);
    res.status(500).json({ error: 'Errore aggiunta commento' });
  }
});

// 📈 INCREMENT VIEWS API
app.post('/api/social/posts/view', async (req, res) => {
  try {
    const { postId } = req.body;
    
    if (!postId) {
      return res.status(400).json({ error: 'postId richiesto' });
    }

    // Incrementa views
    await pool.query(
      'UPDATE social_posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1',
      [postId]
    );

    res.json({ success: true, action: 'view_incremented' });

  } catch (error) {
    console.error('❌ Views API error:', error);
    res.status(500).json({ error: 'Errore incremento views' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Profile API server running on port ${port}`);
  console.log(`📱 SMS endpoint: POST /api/send-sms`);
  console.log(`🎥 LiveKit endpoint: POST /api/livekit/token`);
  console.log(`💳 Stripe endpoint: POST /api/create-checkout-session`);
  console.log(`⭐ Review endpoints: GET/POST /api/reviews`);
  console.log(`📦 Orders endpoints: GET/POST /api/orders`);
  console.log(`📊 Analytics endpoints: GET /api/analytics`);
  console.log(`🔔 Notifications endpoints: GET/POST /api/notifications`);
  console.log(`🎬 Live automation: POST /api/live/:id/finish`);
  console.log(`📝 Social Posts: POST /api/social/posts - DIRECT DB`);
});

export default app;

import pg from 'pg';

// Database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// API Routes per il sistema upgrade venditore
export function setupAPI(app) {
  
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

  // Search sellers API endpoint for real-time search
  app.get('/api/sellers/search', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 1) {
        return res.json([]);
      }
      
      const result = await pool.query(`
        SELECT 
          s.id, 
          s.handle, 
          s.display_name, 
          s.avatar_url, 
          s.bio,
          s.followers,
          p.profile_picture,
          p.first_name,
          p.last_name
        FROM sellers s
        LEFT JOIN profiles p ON s.user_id = p.id
        WHERE 
          s.display_name ILIKE $1 OR 
          s.handle ILIKE $1 OR 
          s.bio ILIKE $1 OR
          p.first_name ILIKE $1 OR
          p.last_name ILIKE $1
        ORDER BY s.followers DESC, s.display_name ASC
        LIMIT 8
      `, [`%${q}%`]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Search sellers error:', error);
      res.status(500).json({ error: 'Errore ricerca venditori' });
    }
  });

  // Advanced search API endpoint with filters
  app.get('/api/search/advanced', async (req, res) => {
    try {
      const {
        q = '',
        category = '',
        priceRange = '',
        location = '',
        minRating = 0,
        hasLiveActive = 'false',
        onlyVerified = 'false',
        sortBy = 'relevance',
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const searchTerm = `%${q}%`;

      let baseQuery = `
        SELECT DISTINCT
          s.id,
          s.handle,
          s.display_name,
          s.avatar_url,
          s.bio,
          s.category,
          s.created_at,
          p.profile_picture,
          p.first_name,
          p.last_name,
          CASE WHEN l.id IS NOT NULL THEN true ELSE false END as live_active,
          COALESCE(l.viewers, 0) as current_viewers,
          0 as followers,
          false as verified,
          0 as rating
        FROM sellers s
        LEFT JOIN profiles p ON s.user_id = p.id
        LEFT JOIN lives l ON s.id = l.seller_id AND l.status = 'live'
      `;

      const conditions = [];
      const params = [];
      let paramCount = 0;

      // Text search
      if (q && q.trim()) {
        paramCount++;
        conditions.push(`(
          s.display_name ILIKE $${paramCount} OR 
          s.handle ILIKE $${paramCount} OR 
          s.bio ILIKE $${paramCount} OR
          p.first_name ILIKE $${paramCount} OR
          p.last_name ILIKE $${paramCount}
        )`);
        params.push(searchTerm);
      }

      // Category filter
      if (category) {
        paramCount++;
        conditions.push(`s.category ILIKE $${paramCount}`);
        params.push(`%${category}%`);
      }

      // Note: location and rating filters omitted since columns don't exist
      // These can be added later when the database schema is extended

      // Live active filter
      if (hasLiveActive === 'true') {
        conditions.push(`l.id IS NOT NULL`);
      }

      // Verified filter
      if (onlyVerified === 'true') {
        conditions.push(`s.verified = true`);
      }

      // Price range filter (based on average item prices)
      if (priceRange) {
        if (priceRange === '0-50') {
          conditions.push(`s.avg_item_price <= 50`);
        } else if (priceRange === '50-100') {
          conditions.push(`s.avg_item_price BETWEEN 50 AND 100`);
        } else if (priceRange === '100-250') {
          conditions.push(`s.avg_item_price BETWEEN 100 AND 250`);
        } else if (priceRange === '250-500') {
          conditions.push(`s.avg_item_price BETWEEN 250 AND 500`);
        } else if (priceRange === '500+') {
          conditions.push(`s.avg_item_price > 500`);
        }
      }

      // Build WHERE clause
      if (conditions.length > 0) {
        baseQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Order by
      let orderClause = '';
      switch (sortBy) {
        case 'followers':
          orderClause = 'ORDER BY s.display_name ASC';
          break;
        case 'rating':
          orderClause = 'ORDER BY s.display_name ASC';
          break;
        case 'recent':
          orderClause = 'ORDER BY s.created_at DESC';
          break;
        case 'live_active':
          orderClause = 'ORDER BY live_active DESC, COALESCE(l.viewers, 0) DESC, s.display_name ASC';
          break;
        default: // relevance
          orderClause = 'ORDER BY s.display_name ASC';
      }

      baseQuery += ` ${orderClause}`;

      // Add pagination
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      console.log('Advanced search query:', baseQuery);
      console.log('Parameters:', params);

      const result = await pool.query(baseQuery, params);

      // Check if there are more results
      const countQuery = baseQuery.replace(/SELECT DISTINCT[\s\S]*?FROM/, 'SELECT COUNT(DISTINCT s.id) FROM')
                                 .replace(/ORDER BY[\s\S]*$/, '')
                                 .replace(/LIMIT[\s\S]*$/, '');
      
      const countResult = await pool.query(countQuery, params.slice(0, -2)); // Remove LIMIT and OFFSET params
      const totalCount = parseInt(countResult.rows[0].count);
      const hasMore = offset + parseInt(limit) < totalCount;

      res.json({
        results: result.rows,
        hasMore,
        totalCount,
        page: parseInt(page),
        limit: parseInt(limit)
      });

    } catch (error) {
      console.error('Advanced search error:', error);
      res.status(500).json({ error: 'Errore ricerca avanzata' });
    }
  });

  // Get seller by handle
  app.get('/api/sellers/handle/:handle', async (req, res) => {
    try {
      const { handle } = req.params;
      
      const result = await pool.query(
        'SELECT id, user_id, handle, display_name, avatar_url FROM sellers WHERE handle = $1',
        [handle]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Seller not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get seller by handle error:', error);
      res.status(500).json({ error: 'Errore recupero seller' });
    }
  });

  // ENDPOINT DEDICATO PER UPGRADE A VENDITORE
  app.post('/api/profiles/upgrade', async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      
      console.log('🔥 UPGRADE REQUEST API VITE:', { userId, data });
      
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
      
      console.log('✅ PROFILO AGGIORNATO A SELLER (VITE):', profileResult.rows[0]);
      
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
        
        console.log('✅ SELLER CREATO/AGGIORNATO (VITE):', sellerResult.rows[0]);
        
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
          message: 'Upgrade completato! Profilo venditore sarà creato automaticamente.' 
        });
      }
      
    } catch (error) {
      console.error('❌ ERRORE UPGRADE (VITE):', error.message);
      res.status(500).json({ 
        success: false,
        error: 'Errore durante upgrade a venditore',
        details: error.message 
      });
    }
  });

  // GET LIVE BY ID
  app.get('/api/lives/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT l.*, s.user_id as seller_user_id, s.display_name as seller_display_name, s.handle as seller_handle, s.avatar_url as seller_avatar_url FROM lives l LEFT JOIN sellers s ON l.seller_id = s.id WHERE l.id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get live error:', error);
      res.status(500).json({ error: 'Errore recupero live' });
    }
  });

  // CREATE LIVE LOT (ADD PRODUCT TO LIVE)
  app.post('/api/live-lots', async (req, res) => {
    try {
      const { live_id, title, start_price, status = 'queued', image_url, buy_now_price, min_bid_increment } = req.body;
      
      if (!live_id || !title || !start_price) {
        return res.status(400).json({ error: 'live_id, title e start_price sono richiesti' });
      }
      
      const result = await pool.query(
        'INSERT INTO live_lots (live_id, title, start_price, status, image_url, buy_now_price, min_bid_increment) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [live_id, title, parseFloat(start_price), status, image_url || null, buy_now_price ? parseFloat(buy_now_price) : null, min_bid_increment ? parseFloat(min_bid_increment) : 1.00]
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Create live lot error:', error);
      res.status(500).json({ error: 'Errore creazione prodotto' });
    }
  });

  // GET LIVE LOTS FOR A LIVE
  app.get('/api/live-lots/live/:liveId', async (req, res) => {
    try {
      const { liveId } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM live_lots WHERE live_id = $1 ORDER BY created_at ASC',
        [liveId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get live lots error:', error);
      res.status(500).json({ error: 'Errore recupero prodotti' });
    }
  });

  // UPDATE LIVE LOT STATUS  
  app.patch('/api/live-lots/:lotId', async (req, res) => {
    try {
      const { lotId } = req.params;
      const { status, current_price, final_price, winner_user_id, buy_now_price, min_bid_increment } = req.body;
      
      const updates = [];
      const values = [lotId];
      let valueIndex = 2;
      
      if (status !== undefined) {
        updates.push(`status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }
      
      if (current_price !== undefined) {
        updates.push(`current_price = $${valueIndex}`);
        values.push(parseFloat(current_price));
        valueIndex++;
      }
      
      if (final_price !== undefined) {
        updates.push(`final_price = $${valueIndex}`);
        values.push(final_price ? parseFloat(final_price) : null);
        valueIndex++;
      }
      
      if (winner_user_id !== undefined) {
        updates.push(`winner_user_id = $${valueIndex}`);
        values.push(winner_user_id);
        valueIndex++;
      }
      
      if (buy_now_price !== undefined) {
        updates.push(`buy_now_price = $${valueIndex}`);
        values.push(buy_now_price ? parseFloat(buy_now_price) : null);
        valueIndex++;
      }
      
      if (min_bid_increment !== undefined) {
        updates.push(`min_bid_increment = $${valueIndex}`);
        values.push(min_bid_increment ? parseFloat(min_bid_increment) : 1.00);
        valueIndex++;
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nessun aggiornamento specificato' });
      }
      
      const result = await pool.query(
        `UPDATE live_lots SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lotto non trovato' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update live lot error:', error);
      res.status(500).json({ error: 'Errore aggiornamento lotto' });
    }
  });

  // GET POSTS FOR A LIVE
  app.get('/api/posts/live/:liveId', async (req, res) => {
    try {
      const { liveId } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM posts WHERE live_id = $1 ORDER BY created_at',
        [liveId]
      );
      
      res.json(result.rows || []);
    } catch (error) {
      console.error('Get posts for live error:', error);
      res.status(500).json({ error: 'Errore recupero posts per live' });
    }
  });

  // CREATE NEW LIVE
  app.post('/api/lives', async (req, res) => {
    try {
      const { seller_id, title, category_id, start_price, scheduled_at } = req.body;
      
      const result = await pool.query(
        `INSERT INTO lives (seller_id, title, category_id, start_price, scheduled_at, status, viewers, created_at) 
         VALUES ($1, $2, $3, $4, $5, 'scheduled', 0, NOW()) 
         RETURNING *`,
        [seller_id, title, category_id || null, start_price || 0, scheduled_at || 'NOW()']
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Create live error:', error);
      res.status(500).json({ error: 'Errore creazione live' });
    }
  });

  // UPDATE LIVE STATUS
  app.put('/api/lives/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await pool.query(
        'UPDATE lives SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live not found' });
      }
      
      // Se live è terminata, cleanup spettatori
      if (status === 'ended') {
        const { cleanupLive } = await import('./viewer-tracking.js');
        await cleanupLive(id);
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update live status error:', error);
      res.status(500).json({ error: 'Errore aggiornamento live' });
    }
  });

  // === VIEWER TRACKING ENDPOINTS ===
  
  // JOIN LIVE AS VIEWER
  app.post('/api/live/:liveId/join', async (req, res) => {
    try {
      const { liveId } = req.params;
      const { viewerId } = req.body;
      
      if (!viewerId) {
        return res.status(400).json({ error: 'viewerId richiesto' });
      }
      
      const { addViewer } = await import('./viewer-tracking.js');
      const result = await addViewer(liveId, viewerId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        viewers: result.viewers,
        totalViewers: result.totalViewers,
        message: 'Spettatore aggiunto con successo'
      });
      
    } catch (error) {
      console.error('Join live error:', error);
      res.status(500).json({ error: 'Errore ingresso live' });
    }
  });
  
  // LEAVE LIVE
  app.post('/api/live/:liveId/leave', async (req, res) => {
    try {
      const { liveId } = req.params;
      const { viewerId } = req.body;
      
      if (!viewerId) {
        return res.status(400).json({ error: 'viewerId richiesto' });
      }
      
      const { removeViewer } = await import('./viewer-tracking.js');
      const result = await removeViewer(liveId, viewerId);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      res.json({
        success: true,
        viewers: result.viewers,
        message: 'Spettatore rimosso con successo'
      });
      
    } catch (error) {
      console.error('Leave live error:', error);
      res.status(500).json({ error: 'Errore uscita live' });
    }
  });
  
  // GET VIEWER STATS
  app.get('/api/live/:liveId/viewers', async (req, res) => {
    try {
      const { liveId } = req.params;
      
      const { getViewerStats } = await import('./viewer-tracking.js');
      const stats = await getViewerStats(liveId);
      
      res.json(stats);
      
    } catch (error) {
      console.error('Get viewer stats error:', error);
      res.status(500).json({ error: 'Errore stats spettatori' });
    }
  });

  // GET LIVES BY SELLER
  app.get('/api/lives/seller/:sellerId', async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM lives WHERE seller_id = $1 ORDER BY created_at DESC',
        [sellerId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get lives error:', error);
      res.status(500).json({ error: 'Errore recupero live' });
    }
  });

  // DELETE LIVE
  app.delete('/api/lives/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'DELETE FROM lives WHERE id = $1 RETURNING id',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Live not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete live error:', error);
      res.status(500).json({ error: 'Errore eliminazione live' });
    }
  });

  // GET POSTS BY SELLER ID
  app.get('/api/posts/seller/:sellerId', async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      // ✅ Prima ottieni l'user_id del seller
      const sellerResult = await pool.query(
        'SELECT user_id FROM sellers WHERE id = $1',
        [sellerId]
      );
      
      if (sellerResult.rows.length === 0) {
        return res.json([]);
      }
      
      const userId = sellerResult.rows[0].user_id;
      
      // ✅ Ora cerca i post nella tabella social_posts
      const result = await pool.query(
        'SELECT * FROM social_posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60',
        [userId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ error: 'Errore recupero posts' });
    }
  });

  // GET STORIES BY SELLER ID  
  app.get('/api/stories/seller/:sellerId', async (req, res) => {
    try {
      const { sellerId } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM stories WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 20',
        [sellerId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get stories error:', error);
      res.status(500).json({ error: 'Errore recupero stories' });
    }
  });

  // GET STORY ITEMS BY STORY ID
  app.get('/api/story-items/:storyId', async (req, res) => {
    try {
      const { storyId } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM story_items WHERE story_id = $1 ORDER BY created_at ASC',
        [storyId]
      );
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get story items error:', error);
      res.status(500).json({ error: 'Errore recupero story items' });
    }
  });

  // === SOCIAL API ENDPOINTS ===
  
  // FOLLOW/UNFOLLOW USER
  app.post('/api/social/follow', async (req, res) => {
    try {
      const { followerId, followingId } = req.body;
      
      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId e followingId richiesti' });
      }
      
      const { toggleFollow } = await import('./social-api.js');
      const result = await toggleFollow(followerId, followingId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('Follow error:', error);
      res.status(500).json({ error: 'Errore follow/unfollow' });
    }
  });
  
  // GET USER SOCIAL STATS
  app.get('/api/social/stats/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { getUserSocialStats } = await import('./social-api.js');
      const stats = await getUserSocialStats(userId);
      
      res.json(stats);
      
    } catch (error) {
      console.error('Get social stats error:', error);
      res.status(500).json({ error: 'Errore recupero statistiche' });
    }
  });
  
  // GET USER NOTIFICATIONS
  app.get('/api/social/notifications/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, unreadOnly = false } = req.query;
      
      const { getUserNotifications } = await import('./social-api.js');
      const result = await getUserNotifications(userId, parseInt(limit), unreadOnly === 'true');
      
      res.json(result);
      
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Errore recupero notifiche' });
    }
  });
  
  // GET UNREAD NOTIFICATIONS COUNT
  app.get('/api/social/notifications/:userId/unread-count', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const { getUnreadNotificationsCount } = await import('./social-api.js');
      const result = await getUnreadNotificationsCount(userId);
      
      res.json(result);
      
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ error: 'Errore conteggio notifiche' });
    }
  });

  // LiveKit token endpoint
  app.post('/api/livekit/token', async (req, res) => {
    try {
      const { roomName, participantName, role = 'subscriber' } = req.body;
      
      console.log('🎥 LiveKit token request via Vite:', { roomName, participantName, role });
      
      // Importa AccessToken
      const { AccessToken } = await import('livekit-server-sdk');
      
      if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_SECRET_KEY || !process.env.LIVEKIT_URL) {
        throw new Error('LiveKit credentials not configured');
      }
      
      // Create token with proper options
      const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_SECRET_KEY, {
        identity: participantName,
        name: participantName,
        ttl: '24h',
      });

      // Add grants with proper room name
      const grant = {
        roomJoin: true,
        room: roomName,
        canPublish: role === 'publisher',
        canSubscribe: true,
        canPublishData: role === 'publisher',
      };
      
      token.addGrant(grant);

      // Generate JWT
      let jwtToken;
      try {
        jwtToken = await token.toJwt();
      } catch (asyncError) {
        jwtToken = token.toJwt();
      }
      
      if (!jwtToken || typeof jwtToken !== 'string' || jwtToken.length < 10) {
        throw new Error(`Token generation failed - invalid JWT: ${typeof jwtToken}, length: ${jwtToken?.length}`);
      }
      
      console.log('✅ Token generato via Vite, lunghezza:', jwtToken.length);
      
      res.json({ 
        success: true,
        token: jwtToken,
        serverUrl: process.env.LIVEKIT_URL,
        message: 'Token LiveKit generato con successo'
      });
      
    } catch (error) {
      console.error('❌ LiveKit token error via Vite:', error);
      res.status(500).json({ error: 'Errore generazione token LiveKit' });
    }
  });

  // NOTA: Endpoint LiveKit duplicato rimosso - usa quello principale in server/app.js

  console.log('✅ API Routes configurate nel server Vite!');
}
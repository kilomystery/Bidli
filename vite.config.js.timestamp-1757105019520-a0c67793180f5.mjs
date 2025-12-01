// vite.config.js
import { defineConfig } from "file:///home/runner/workspace/node_modules/vite/dist/node/index.js";
import react from "file:///home/runner/workspace/node_modules/@vitejs/plugin-react/dist/index.mjs";
import express from "file:///home/runner/workspace/node_modules/express/index.js";

// server/api.js
import pg from "file:///home/runner/workspace/node_modules/pg/esm/index.mjs";
var { Pool } = pg;
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : false
});
function setupAPI(app) {
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM profiles WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Profilo non trovato" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Errore recupero profilo" });
    }
  });
  app.get("/api/sellers/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        "SELECT id, handle, display_name, avatar_url FROM sellers WHERE user_id = $1",
        [userId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get seller error:", error);
      res.status(500).json({ error: "Errore recupero seller" });
    }
  });
  app.get("/api/sellers/handle/:handle", async (req, res) => {
    try {
      const { handle } = req.params;
      const result = await pool.query(
        "SELECT id, handle, display_name, avatar_url FROM sellers WHERE handle = $1",
        [handle]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Seller not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get seller by handle error:", error);
      res.status(500).json({ error: "Errore recupero seller" });
    }
  });
  app.post("/api/profiles/upgrade", async (req, res) => {
    try {
      const { userId, ...data } = req.body;
      console.log("\u{1F525} UPGRADE REQUEST API VITE:", { userId, data });
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
        data.store_name || "",
        data.category || "",
        data.iban || "",
        data.phone || "",
        data.shipping_address || "",
        data.shipping_city || "",
        data.shipping_postal_code || "",
        data.shipping_country || "Italy"
      ]);
      console.log("\u2705 PROFILO AGGIORNATO A SELLER (VITE):", profileResult.rows[0]);
      const handle = (data.store_name || "seller").toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.random().toString(36).substr(2, 5);
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
          data.store_description || "",
          data.iban,
          data.category,
          data.shipping_address,
          data.shipping_city,
          data.shipping_postal_code,
          data.shipping_country || "Italy",
          data.phone,
          data.business_email,
          true
        ]);
        console.log("\u2705 SELLER CREATO/AGGIORNATO (VITE):", sellerResult.rows[0]);
        res.json({
          success: true,
          profile: profileResult.rows[0],
          seller: sellerResult.rows[0],
          message: "Upgrade a venditore completato con successo!"
        });
      } catch (sellerError) {
        console.error("Errore creazione seller:", sellerError);
        res.json({
          success: true,
          profile: profileResult.rows[0],
          message: "Upgrade completato! Profilo venditore sar\xE0 creato automaticamente."
        });
      }
    } catch (error) {
      console.error("\u274C ERRORE UPGRADE (VITE):", error.message);
      res.status(500).json({
        success: false,
        error: "Errore durante upgrade a venditore",
        details: error.message
      });
    }
  });
  app.get("/api/lives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT l.*, s.user_id as seller_user_id, s.display_name as seller_display_name, s.handle as seller_handle, s.avatar_url as seller_avatar_url FROM lives l LEFT JOIN sellers s ON l.seller_id = s.id WHERE l.id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Get live error:", error);
      res.status(500).json({ error: "Errore recupero live" });
    }
  });
  app.post("/api/live-lots", async (req, res) => {
    try {
      const { live_id, title, start_price, status = "queued", image_url, buy_now_price, min_bid_increment } = req.body;
      if (!live_id || !title || !start_price) {
        return res.status(400).json({ error: "live_id, title e start_price sono richiesti" });
      }
      const result = await pool.query(
        "INSERT INTO live_lots (live_id, title, start_price, status, image_url, buy_now_price, min_bid_increment) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [live_id, title, parseFloat(start_price), status, image_url || null, buy_now_price ? parseFloat(buy_now_price) : null, min_bid_increment ? parseFloat(min_bid_increment) : 1]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Create live lot error:", error);
      res.status(500).json({ error: "Errore creazione prodotto" });
    }
  });
  app.get("/api/live-lots/live/:liveId", async (req, res) => {
    try {
      const { liveId } = req.params;
      const result = await pool.query(
        "SELECT * FROM live_lots WHERE live_id = $1 ORDER BY created_at ASC",
        [liveId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get live lots error:", error);
      res.status(500).json({ error: "Errore recupero prodotti" });
    }
  });
  app.patch("/api/live-lots/:lotId", async (req, res) => {
    try {
      const { lotId } = req.params;
      const { status, current_price, final_price, winner_user_id, buy_now_price, min_bid_increment } = req.body;
      const updates = [];
      const values = [lotId];
      let valueIndex = 2;
      if (status !== void 0) {
        updates.push(`status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }
      if (current_price !== void 0) {
        updates.push(`current_price = $${valueIndex}`);
        values.push(parseFloat(current_price));
        valueIndex++;
      }
      if (final_price !== void 0) {
        updates.push(`final_price = $${valueIndex}`);
        values.push(final_price ? parseFloat(final_price) : null);
        valueIndex++;
      }
      if (winner_user_id !== void 0) {
        updates.push(`winner_user_id = $${valueIndex}`);
        values.push(winner_user_id);
        valueIndex++;
      }
      if (buy_now_price !== void 0) {
        updates.push(`buy_now_price = $${valueIndex}`);
        values.push(buy_now_price ? parseFloat(buy_now_price) : null);
        valueIndex++;
      }
      if (min_bid_increment !== void 0) {
        updates.push(`min_bid_increment = $${valueIndex}`);
        values.push(min_bid_increment ? parseFloat(min_bid_increment) : 1);
        valueIndex++;
      }
      if (updates.length === 0) {
        return res.status(400).json({ error: "Nessun aggiornamento specificato" });
      }
      const result = await pool.query(
        `UPDATE live_lots SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lotto non trovato" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update live lot error:", error);
      res.status(500).json({ error: "Errore aggiornamento lotto" });
    }
  });
  app.get("/api/posts/live/:liveId", async (req, res) => {
    try {
      const { liveId } = req.params;
      const result = await pool.query(
        "SELECT * FROM posts WHERE live_id = $1 ORDER BY created_at",
        [liveId]
      );
      res.json(result.rows || []);
    } catch (error) {
      console.error("Get posts for live error:", error);
      res.status(500).json({ error: "Errore recupero posts per live" });
    }
  });
  app.post("/api/lives", async (req, res) => {
    try {
      const { seller_id, title, category_id, start_price, scheduled_at } = req.body;
      const result = await pool.query(
        `INSERT INTO lives (seller_id, title, category_id, start_price, scheduled_at, status, viewers, created_at) 
         VALUES ($1, $2, $3, $4, $5, 'scheduled', 0, NOW()) 
         RETURNING *`,
        [seller_id, title, category_id || null, start_price || 0, scheduled_at || "NOW()"]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Create live error:", error);
      res.status(500).json({ error: "Errore creazione live" });
    }
  });
  app.put("/api/lives/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await pool.query(
        "UPDATE lives SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update live status error:", error);
      res.status(500).json({ error: "Errore aggiornamento live" });
    }
  });
  app.get("/api/lives/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await pool.query(
        "SELECT * FROM lives WHERE seller_id = $1 ORDER BY created_at DESC",
        [sellerId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get lives error:", error);
      res.status(500).json({ error: "Errore recupero live" });
    }
  });
  app.delete("/api/lives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "DELETE FROM lives WHERE id = $1 RETURNING id",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Live not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete live error:", error);
      res.status(500).json({ error: "Errore eliminazione live" });
    }
  });
  app.get("/api/posts/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await pool.query(
        "SELECT * FROM posts WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 60",
        [sellerId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Errore recupero posts" });
    }
  });
  app.get("/api/stories/seller/:sellerId", async (req, res) => {
    try {
      const { sellerId } = req.params;
      const result = await pool.query(
        "SELECT * FROM stories WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 20",
        [sellerId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get stories error:", error);
      res.status(500).json({ error: "Errore recupero stories" });
    }
  });
  app.get("/api/story-items/:storyId", async (req, res) => {
    try {
      const { storyId } = req.params;
      const result = await pool.query(
        "SELECT * FROM story_items WHERE story_id = $1 ORDER BY created_at ASC",
        [storyId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Get story items error:", error);
      res.status(500).json({ error: "Errore recupero story items" });
    }
  });
  console.log("\u2705 API Routes configurate nel server Vite!");
}

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "api-middleware",
      configureServer(server) {
        const app = express();
        app.use(express.json());
        setupAPI(app);
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith("/api/")) {
            app(req, res, next);
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    host: "0.0.0.0",
    port: 5e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAic2VydmVyL2FwaS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgc2V0dXBBUEkgfSBmcm9tICcuL3NlcnZlci9hcGkuanMnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ2FwaS1taWRkbGV3YXJlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgY29uc3QgYXBwID0gZXhwcmVzcygpO1xuICAgICAgICBhcHAudXNlKGV4cHJlc3MuanNvbigpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYSB0dXR0ZSBsZSBBUEkgcm91dGVzXG4gICAgICAgIHNldHVwQVBJKGFwcCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlZ3JhIG5lbCBzZXJ2ZXIgVml0ZSBjb24gZ2VzdGlvbmUgY29ycmV0dGFcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybC5zdGFydHNXaXRoKCcvYXBpLycpKSB7XG4gICAgICAgICAgICBhcHAocmVxLCByZXMsIG5leHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiA1MDAwLFxuICB9XG59KVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL2FwaS5qc1wiO2ltcG9ydCBwZyBmcm9tICdwZyc7XG5cbi8vIERhdGFiYXNlIGNvbm5lY3Rpb25cbmNvbnN0IHsgUG9vbCB9ID0gcGc7XG5jb25zdCBwb29sID0gbmV3IFBvb2woe1xuICBjb25uZWN0aW9uU3RyaW5nOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwsXG4gIHNzbDogcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMLmluY2x1ZGVzKCduZW9uLnRlY2gnKSA/IHsgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSB9IDogZmFsc2Vcbn0pO1xuXG4vLyBBUEkgUm91dGVzIHBlciBpbCBzaXN0ZW1hIHVwZ3JhZGUgdmVuZGl0b3JlXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBBUEkoYXBwKSB7XG4gIFxuICAvLyBHZXQgcHJvZmlsZSBieSBJRFxuICBhcHAuZ2V0KCcvYXBpL3Byb2ZpbGVzLzppZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBwcm9maWxlcyBXSEVSRSBpZCA9ICQxJyxcbiAgICAgICAgW2lkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ1Byb2ZpbG8gbm9uIHRyb3ZhdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwcm9maWxlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gcHJvZmlsbycgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHZXQgc2VsbGVyIGJ5IHVzZXJfaWQgIFxuICBhcHAuZ2V0KCcvYXBpL3NlbGxlcnMvdXNlci86dXNlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUIGlkLCBoYW5kbGUsIGRpc3BsYXlfbmFtZSwgYXZhdGFyX3VybCBGUk9NIHNlbGxlcnMgV0hFUkUgdXNlcl9pZCA9ICQxJyxcbiAgICAgICAgW3VzZXJJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdTZWxsZXIgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc2VsbGVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gc2VsbGVyJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdldCBzZWxsZXIgYnkgaGFuZGxlXG4gIGFwcC5nZXQoJy9hcGkvc2VsbGVycy9oYW5kbGUvOmhhbmRsZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGhhbmRsZSB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCBpZCwgaGFuZGxlLCBkaXNwbGF5X25hbWUsIGF2YXRhcl91cmwgRlJPTSBzZWxsZXJzIFdIRVJFIGhhbmRsZSA9ICQxJyxcbiAgICAgICAgW2hhbmRsZV1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdTZWxsZXIgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc2VsbGVyIGJ5IGhhbmRsZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHNlbGxlcicgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBFTkRQT0lOVCBERURJQ0FUTyBQRVIgVVBHUkFERSBBIFZFTkRJVE9SRVxuICBhcHAucG9zdCgnL2FwaS9wcm9maWxlcy91cGdyYWRlJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkLCAuLi5kYXRhIH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REQyNSBVUEdSQURFIFJFUVVFU1QgQVBJIFZJVEU6JywgeyB1c2VySWQsIGRhdGEgfSk7XG4gICAgICBcbiAgICAgIC8vIDEuIFVQU0VSVCBTSUNVUk8gLSBGVU5aSU9OQSBTRU1QUkUgKENSRUEgTyBBR0dJT1JOQSlcbiAgICAgIGNvbnN0IHByb2ZpbGVVcHNlcnRRdWVyeSA9IGBcbiAgICAgICAgSU5TRVJUIElOVE8gcHJvZmlsZXMgKFxuICAgICAgICAgIGlkLCBlbWFpbCwgcm9sZSwgc3RvcmVfbmFtZSwgY2F0ZWdvcnksIGliYW4sIHBob25lLFxuICAgICAgICAgIHNoaXBwaW5nX2FkZHJlc3MsIHNoaXBwaW5nX2NpdHksIHNoaXBwaW5nX3Bvc3RhbF9jb2RlLCBcbiAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5LCBwcm9maWxlX2NvbXBsZXRlZFxuICAgICAgICApIFZBTFVFUyAoXG4gICAgICAgICAgJDEsICQyLCAnc2VsbGVyJywgJDMsICQ0LCAkNSwgJDYsICQ3LCAkOCwgJDksICQxMCwgdHJ1ZVxuICAgICAgICApXG4gICAgICAgIE9OIENPTkZMSUNUIChpZCkgRE8gVVBEQVRFIFNFVFxuICAgICAgICAgIHJvbGUgPSAnc2VsbGVyJyxcbiAgICAgICAgICBzdG9yZV9uYW1lID0gRVhDTFVERUQuc3RvcmVfbmFtZSxcbiAgICAgICAgICBjYXRlZ29yeSA9IEVYQ0xVREVELmNhdGVnb3J5LFxuICAgICAgICAgIGliYW4gPSBFWENMVURFRC5pYmFuLFxuICAgICAgICAgIHBob25lID0gRVhDTFVERUQucGhvbmUsXG4gICAgICAgICAgc2hpcHBpbmdfYWRkcmVzcyA9IEVYQ0xVREVELnNoaXBwaW5nX2FkZHJlc3MsXG4gICAgICAgICAgc2hpcHBpbmdfY2l0eSA9IEVYQ0xVREVELnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgc2hpcHBpbmdfcG9zdGFsX2NvZGUgPSBFWENMVURFRC5zaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5ID0gRVhDTFVERUQuc2hpcHBpbmdfY291bnRyeSxcbiAgICAgICAgICBwcm9maWxlX2NvbXBsZXRlZCA9IHRydWVcbiAgICAgICAgUkVUVVJOSU5HICpcbiAgICAgIGA7XG4gICAgICBcbiAgICAgIGNvbnN0IHByb2ZpbGVSZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KHByb2ZpbGVVcHNlcnRRdWVyeSwgW1xuICAgICAgICB1c2VySWQsXG4gICAgICAgIGRhdGEuYnVzaW5lc3NfZW1haWwgfHwgYHVzZXItJHt1c2VySWR9QGJpZGxpLmxpdmVgLFxuICAgICAgICBkYXRhLnN0b3JlX25hbWUgfHwgJycsXG4gICAgICAgIGRhdGEuY2F0ZWdvcnkgfHwgJycsXG4gICAgICAgIGRhdGEuaWJhbiB8fCAnJyxcbiAgICAgICAgZGF0YS5waG9uZSB8fCAnJyxcbiAgICAgICAgZGF0YS5zaGlwcGluZ19hZGRyZXNzIHx8ICcnLFxuICAgICAgICBkYXRhLnNoaXBwaW5nX2NpdHkgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfcG9zdGFsX2NvZGUgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfY291bnRyeSB8fCAnSXRhbHknXG4gICAgICBdKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBQUk9GSUxPIEFHR0lPUk5BVE8gQSBTRUxMRVIgKFZJVEUpOicsIHByb2ZpbGVSZXN1bHQucm93c1swXSk7XG4gICAgICBcbiAgICAgIC8vIDIuIENyZWEgcmVjb3JkIHZlbmRpdG9yZSBzZSBub24gZXNpc3RlXG4gICAgICBjb25zdCBoYW5kbGUgPSAoZGF0YS5zdG9yZV9uYW1lIHx8ICdzZWxsZXInKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XS9nLCAnXycpICsgJ18nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDUpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzZWxsZXJJbnNlcnRRdWVyeSA9IGBcbiAgICAgICAgICBJTlNFUlQgSU5UTyBzZWxsZXJzIChcbiAgICAgICAgICAgIHVzZXJfaWQsIGhhbmRsZSwgZGlzcGxheV9uYW1lLCBzdG9yZV9uYW1lLCBiaW8sIGliYW4sXG4gICAgICAgICAgICBjYXRlZ29yeSwgc2hpcHBpbmdfYWRkcmVzcywgc2hpcHBpbmdfY2l0eSwgc2hpcHBpbmdfcG9zdGFsX2NvZGUsXG4gICAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5LCBwaG9uZSwgYnVzaW5lc3NfZW1haWwsIHByb2ZpbGVfY29tcGxldGVkXG4gICAgICAgICAgKSBWQUxVRVMgKFxuICAgICAgICAgICAgJDEsICQyLCAkMywgJDQsICQ1LCAkNiwgJDcsICQ4LCAkOSwgJDEwLCAkMTEsICQxMiwgJDEzLCAkMTRcbiAgICAgICAgICApIFxuICAgICAgICAgIE9OIENPTkZMSUNUICh1c2VyX2lkKSBETyBVUERBVEUgU0VUXG4gICAgICAgICAgICBoYW5kbGUgPSBFWENMVURFRC5oYW5kbGUsXG4gICAgICAgICAgICBkaXNwbGF5X25hbWUgPSBFWENMVURFRC5kaXNwbGF5X25hbWUsXG4gICAgICAgICAgICBzdG9yZV9uYW1lID0gRVhDTFVERUQuc3RvcmVfbmFtZSxcbiAgICAgICAgICAgIGJpbyA9IEVYQ0xVREVELmJpbyxcbiAgICAgICAgICAgIGliYW4gPSBFWENMVURFRC5pYmFuLFxuICAgICAgICAgICAgY2F0ZWdvcnkgPSBFWENMVURFRC5jYXRlZ29yeSxcbiAgICAgICAgICAgIHNoaXBwaW5nX2FkZHJlc3MgPSBFWENMVURFRC5zaGlwcGluZ19hZGRyZXNzLFxuICAgICAgICAgICAgc2hpcHBpbmdfY2l0eSA9IEVYQ0xVREVELnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgICBzaGlwcGluZ19wb3N0YWxfY29kZSA9IEVYQ0xVREVELnNoaXBwaW5nX3Bvc3RhbF9jb2RlLFxuICAgICAgICAgICAgc2hpcHBpbmdfY291bnRyeSA9IEVYQ0xVREVELnNoaXBwaW5nX2NvdW50cnksXG4gICAgICAgICAgICBwaG9uZSA9IEVYQ0xVREVELnBob25lLFxuICAgICAgICAgICAgYnVzaW5lc3NfZW1haWwgPSBFWENMVURFRC5idXNpbmVzc19lbWFpbCxcbiAgICAgICAgICAgIHByb2ZpbGVfY29tcGxldGVkID0gRVhDTFVERUQucHJvZmlsZV9jb21wbGV0ZWRcbiAgICAgICAgICBSRVRVUk5JTkcgKlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2VsbGVyUmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShzZWxsZXJJbnNlcnRRdWVyeSwgW1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICBoYW5kbGUsXG4gICAgICAgICAgZGF0YS5zdG9yZV9uYW1lLFxuICAgICAgICAgIGRhdGEuc3RvcmVfbmFtZSxcbiAgICAgICAgICBkYXRhLnN0b3JlX2Rlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgIGRhdGEuaWJhbixcbiAgICAgICAgICBkYXRhLmNhdGVnb3J5LFxuICAgICAgICAgIGRhdGEuc2hpcHBpbmdfYWRkcmVzcyxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgZGF0YS5zaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX2NvdW50cnkgfHwgJ0l0YWx5JyxcbiAgICAgICAgICBkYXRhLnBob25lLFxuICAgICAgICAgIGRhdGEuYnVzaW5lc3NfZW1haWwsXG4gICAgICAgICAgdHJ1ZVxuICAgICAgICBdKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgU0VMTEVSIENSRUFUTy9BR0dJT1JOQVRPIChWSVRFKTonLCBzZWxsZXJSZXN1bHQucm93c1swXSk7XG4gICAgICAgIFxuICAgICAgICByZXMuanNvbih7IFxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgIHByb2ZpbGU6IHByb2ZpbGVSZXN1bHQucm93c1swXSxcbiAgICAgICAgICBzZWxsZXI6IHNlbGxlclJlc3VsdC5yb3dzWzBdLFxuICAgICAgICAgIG1lc3NhZ2U6ICdVcGdyYWRlIGEgdmVuZGl0b3JlIGNvbXBsZXRhdG8gY29uIHN1Y2Nlc3NvIScgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgIH0gY2F0Y2ggKHNlbGxlckVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yZSBjcmVhemlvbmUgc2VsbGVyOicsIHNlbGxlckVycm9yKTtcbiAgICAgICAgLy8gQW5jaGUgc2UgaWwgc2VsbGVyIGZhbGxpc2NlLCBpbCBwcm9maWxvIFx1MDBFOCBzdGF0byBhZ2dpb3JuYXRvXG4gICAgICAgIHJlcy5qc29uKHsgXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgcHJvZmlsZTogcHJvZmlsZVJlc3VsdC5yb3dzWzBdLFxuICAgICAgICAgIG1lc3NhZ2U6ICdVcGdyYWRlIGNvbXBsZXRhdG8hIFByb2ZpbG8gdmVuZGl0b3JlIHNhclx1MDBFMCBjcmVhdG8gYXV0b21hdGljYW1lbnRlLicgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFUlJPUkUgVVBHUkFERSAoVklURSk6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdFcnJvcmUgZHVyYW50ZSB1cGdyYWRlIGEgdmVuZGl0b3JlJyxcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSBcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIExJVkUgQlkgSURcbiAgYXBwLmdldCgnL2FwaS9saXZlcy86aWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBpZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCBsLiosIHMudXNlcl9pZCBhcyBzZWxsZXJfdXNlcl9pZCwgcy5kaXNwbGF5X25hbWUgYXMgc2VsbGVyX2Rpc3BsYXlfbmFtZSwgcy5oYW5kbGUgYXMgc2VsbGVyX2hhbmRsZSwgcy5hdmF0YXJfdXJsIGFzIHNlbGxlcl9hdmF0YXJfdXJsIEZST00gbGl2ZXMgbCBMRUZUIEpPSU4gc2VsbGVycyBzIE9OIGwuc2VsbGVyX2lkID0gcy5pZCBXSEVSRSBsLmlkID0gJDEnLFxuICAgICAgICBbaWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnTGl2ZSBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBsaXZlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBDUkVBVEUgTElWRSBMT1QgKEFERCBQUk9EVUNUIFRPIExJVkUpXG4gIGFwcC5wb3N0KCcvYXBpL2xpdmUtbG90cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVfaWQsIHRpdGxlLCBzdGFydF9wcmljZSwgc3RhdHVzID0gJ3F1ZXVlZCcsIGltYWdlX3VybCwgYnV5X25vd19wcmljZSwgbWluX2JpZF9pbmNyZW1lbnQgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBpZiAoIWxpdmVfaWQgfHwgIXRpdGxlIHx8ICFzdGFydF9wcmljZSkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oeyBlcnJvcjogJ2xpdmVfaWQsIHRpdGxlIGUgc3RhcnRfcHJpY2Ugc29ubyByaWNoaWVzdGknIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnSU5TRVJUIElOVE8gbGl2ZV9sb3RzIChsaXZlX2lkLCB0aXRsZSwgc3RhcnRfcHJpY2UsIHN0YXR1cywgaW1hZ2VfdXJsLCBidXlfbm93X3ByaWNlLCBtaW5fYmlkX2luY3JlbWVudCkgVkFMVUVTICgkMSwgJDIsICQzLCAkNCwgJDUsICQ2LCAkNykgUkVUVVJOSU5HIConLFxuICAgICAgICBbbGl2ZV9pZCwgdGl0bGUsIHBhcnNlRmxvYXQoc3RhcnRfcHJpY2UpLCBzdGF0dXMsIGltYWdlX3VybCB8fCBudWxsLCBidXlfbm93X3ByaWNlID8gcGFyc2VGbG9hdChidXlfbm93X3ByaWNlKSA6IG51bGwsIG1pbl9iaWRfaW5jcmVtZW50ID8gcGFyc2VGbG9hdChtaW5fYmlkX2luY3JlbWVudCkgOiAxLjAwXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdDcmVhdGUgbGl2ZSBsb3QgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBjcmVhemlvbmUgcHJvZG90dG8nIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIExJVkUgTE9UUyBGT1IgQSBMSVZFXG4gIGFwcC5nZXQoJy9hcGkvbGl2ZS1sb3RzL2xpdmUvOmxpdmVJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGxpdmVJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gbGl2ZV9sb3RzIFdIRVJFIGxpdmVfaWQgPSAkMSBPUkRFUiBCWSBjcmVhdGVkX2F0IEFTQycsXG4gICAgICAgIFtsaXZlSWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBsaXZlIGxvdHMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBwcm9kb3R0aScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBVUERBVEUgTElWRSBMT1QgU1RBVFVTICBcbiAgYXBwLnBhdGNoKCcvYXBpL2xpdmUtbG90cy86bG90SWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBsb3RJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIGNvbnN0IHsgc3RhdHVzLCBjdXJyZW50X3ByaWNlLCBmaW5hbF9wcmljZSwgd2lubmVyX3VzZXJfaWQsIGJ1eV9ub3dfcHJpY2UsIG1pbl9iaWRfaW5jcmVtZW50IH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgY29uc3QgdXBkYXRlcyA9IFtdO1xuICAgICAgY29uc3QgdmFsdWVzID0gW2xvdElkXTtcbiAgICAgIGxldCB2YWx1ZUluZGV4ID0gMjtcbiAgICAgIFxuICAgICAgaWYgKHN0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgc3RhdHVzID0gJCR7dmFsdWVJbmRleH1gKTtcbiAgICAgICAgdmFsdWVzLnB1c2goc3RhdHVzKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoY3VycmVudF9wcmljZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgY3VycmVudF9wcmljZSA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcnNlRmxvYXQoY3VycmVudF9wcmljZSkpO1xuICAgICAgICB2YWx1ZUluZGV4Kys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChmaW5hbF9wcmljZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgZmluYWxfcHJpY2UgPSAkJHt2YWx1ZUluZGV4fWApO1xuICAgICAgICB2YWx1ZXMucHVzaChmaW5hbF9wcmljZSA/IHBhcnNlRmxvYXQoZmluYWxfcHJpY2UpIDogbnVsbCk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKHdpbm5lcl91c2VyX2lkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGB3aW5uZXJfdXNlcl9pZCA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHdpbm5lcl91c2VyX2lkKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoYnV5X25vd19wcmljZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHVwZGF0ZXMucHVzaChgYnV5X25vd19wcmljZSA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKGJ1eV9ub3dfcHJpY2UgPyBwYXJzZUZsb2F0KGJ1eV9ub3dfcHJpY2UpIDogbnVsbCk7XG4gICAgICAgIHZhbHVlSW5kZXgrKztcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKG1pbl9iaWRfaW5jcmVtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXBkYXRlcy5wdXNoKGBtaW5fYmlkX2luY3JlbWVudCA9ICQke3ZhbHVlSW5kZXh9YCk7XG4gICAgICAgIHZhbHVlcy5wdXNoKG1pbl9iaWRfaW5jcmVtZW50ID8gcGFyc2VGbG9hdChtaW5fYmlkX2luY3JlbWVudCkgOiAxLjAwKTtcbiAgICAgICAgdmFsdWVJbmRleCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAodXBkYXRlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICdOZXNzdW4gYWdnaW9ybmFtZW50byBzcGVjaWZpY2F0bycgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgIGBVUERBVEUgbGl2ZV9sb3RzIFNFVCAke3VwZGF0ZXMuam9pbignLCAnKX0sIHVwZGF0ZWRfYXQgPSBDVVJSRU5UX1RJTUVTVEFNUCBXSEVSRSBpZCA9ICQxIFJFVFVSTklORyAqYCxcbiAgICAgICAgdmFsdWVzXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnTG90dG8gbm9uIHRyb3ZhdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VwZGF0ZSBsaXZlIGxvdCBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIGFnZ2lvcm5hbWVudG8gbG90dG8nIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIFBPU1RTIEZPUiBBIExJVkVcbiAgYXBwLmdldCgnL2FwaS9wb3N0cy9saXZlLzpsaXZlSWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBsaXZlSWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIHBvc3RzIFdIRVJFIGxpdmVfaWQgPSAkMSBPUkRFUiBCWSBjcmVhdGVkX2F0JyxcbiAgICAgICAgW2xpdmVJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzIHx8IFtdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHBvc3RzIGZvciBsaXZlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gcG9zdHMgcGVyIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gQ1JFQVRFIE5FVyBMSVZFXG4gIGFwcC5wb3N0KCcvYXBpL2xpdmVzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc2VsbGVyX2lkLCB0aXRsZSwgY2F0ZWdvcnlfaWQsIHN0YXJ0X3ByaWNlLCBzY2hlZHVsZWRfYXQgfSA9IHJlcS5ib2R5O1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICBgSU5TRVJUIElOVE8gbGl2ZXMgKHNlbGxlcl9pZCwgdGl0bGUsIGNhdGVnb3J5X2lkLCBzdGFydF9wcmljZSwgc2NoZWR1bGVkX2F0LCBzdGF0dXMsIHZpZXdlcnMsIGNyZWF0ZWRfYXQpIFxuICAgICAgICAgVkFMVUVTICgkMSwgJDIsICQzLCAkNCwgJDUsICdzY2hlZHVsZWQnLCAwLCBOT1coKSkgXG4gICAgICAgICBSRVRVUk5JTkcgKmAsXG4gICAgICAgIFtzZWxsZXJfaWQsIHRpdGxlLCBjYXRlZ29yeV9pZCB8fCBudWxsLCBzdGFydF9wcmljZSB8fCAwLCBzY2hlZHVsZWRfYXQgfHwgJ05PVygpJ11cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignQ3JlYXRlIGxpdmUgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSBjcmVhemlvbmUgbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBVUERBVEUgTElWRSBTVEFUVVNcbiAgYXBwLnB1dCgnL2FwaS9saXZlcy86aWQvc3RhdHVzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgaWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBjb25zdCB7IHN0YXR1cyB9ID0gcmVxLmJvZHk7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdVUERBVEUgbGl2ZXMgU0VUIHN0YXR1cyA9ICQxIFdIRVJFIGlkID0gJDIgUkVUVVJOSU5HIConLFxuICAgICAgICBbc3RhdHVzLCBpZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdMaXZlIG5vdCBmb3VuZCcgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzWzBdKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignVXBkYXRlIGxpdmUgc3RhdHVzIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgYWdnaW9ybmFtZW50byBsaXZlJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBMSVZFUyBCWSBTRUxMRVJcbiAgYXBwLmdldCgnL2FwaS9saXZlcy9zZWxsZXIvOnNlbGxlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc2VsbGVySWQgfSA9IHJlcS5wYXJhbXM7XG4gICAgICBcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBvb2wucXVlcnkoXG4gICAgICAgICdTRUxFQ1QgKiBGUk9NIGxpdmVzIFdIRVJFIHNlbGxlcl9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQycsXG4gICAgICAgIFtzZWxsZXJJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IGxpdmVzIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gbGl2ZScgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBERUxFVEUgTElWRVxuICBhcHAuZGVsZXRlKCcvYXBpL2xpdmVzLzppZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnREVMRVRFIEZST00gbGl2ZXMgV0hFUkUgaWQgPSAkMSBSRVRVUk5JTkcgaWQnLFxuICAgICAgICBbaWRdXG4gICAgICApO1xuICAgICAgXG4gICAgICBpZiAocmVzdWx0LnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwNCkuanNvbih7IGVycm9yOiAnTGl2ZSBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbih7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0RlbGV0ZSBsaXZlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgZWxpbWluYXppb25lIGxpdmUnIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gR0VUIFBPU1RTIEJZIFNFTExFUiBJRFxuICBhcHAuZ2V0KCcvYXBpL3Bvc3RzL3NlbGxlci86c2VsbGVySWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBzZWxsZXJJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gcG9zdHMgV0hFUkUgc2VsbGVyX2lkID0gJDEgT1JERVIgQlkgY3JlYXRlZF9hdCBERVNDIExJTUlUIDYwJyxcbiAgICAgICAgW3NlbGxlcklkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgcG9zdHMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBwb3N0cycgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHRVQgU1RPUklFUyBCWSBTRUxMRVIgSUQgIFxuICBhcHAuZ2V0KCcvYXBpL3N0b3JpZXMvc2VsbGVyLzpzZWxsZXJJZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IHNlbGxlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBzdG9yaWVzIFdIRVJFIHNlbGxlcl9pZCA9ICQxIE9SREVSIEJZIGNyZWF0ZWRfYXQgREVTQyBMSU1JVCAyMCcsXG4gICAgICAgIFtzZWxsZXJJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIHJlcy5qc29uKHJlc3VsdC5yb3dzKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignR2V0IHN0b3JpZXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzdG9yaWVzJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdFVCBTVE9SWSBJVEVNUyBCWSBTVE9SWSBJRFxuICBhcHAuZ2V0KCcvYXBpL3N0b3J5LWl0ZW1zLzpzdG9yeUlkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgc3RvcnlJZCB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCAqIEZST00gc3RvcnlfaXRlbXMgV0hFUkUgc3RvcnlfaWQgPSAkMSBPUkRFUiBCWSBjcmVhdGVkX2F0IEFTQycsXG4gICAgICAgIFtzdG9yeUlkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc3RvcnkgaXRlbXMgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBlcnJvcjogJ0Vycm9yZSByZWN1cGVybyBzdG9yeSBpdGVtcycgfSk7XG4gICAgfVxuICB9KTtcblxuICBjb25zb2xlLmxvZygnXHUyNzA1IEFQSSBSb3V0ZXMgY29uZmlndXJhdGUgbmVsIHNlcnZlciBWaXRlIScpO1xufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1AsU0FBUyxvQkFBb0I7QUFDalIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sYUFBYTs7O0FDRnFPLE9BQU8sUUFBUTtBQUd4USxJQUFNLEVBQUUsS0FB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

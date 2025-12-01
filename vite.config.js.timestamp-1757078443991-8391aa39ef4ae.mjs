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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAic2VydmVyL2FwaS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3J1bm5lci93b3Jrc3BhY2Uvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVubmVyL3dvcmtzcGFjZS92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgc2V0dXBBUEkgfSBmcm9tICcuL3NlcnZlci9hcGkuanMnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ2FwaS1taWRkbGV3YXJlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgY29uc3QgYXBwID0gZXhwcmVzcygpO1xuICAgICAgICBhcHAudXNlKGV4cHJlc3MuanNvbigpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYSB0dXR0ZSBsZSBBUEkgcm91dGVzXG4gICAgICAgIHNldHVwQVBJKGFwcCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlZ3JhIG5lbCBzZXJ2ZXIgVml0ZSBjb24gZ2VzdGlvbmUgY29ycmV0dGFcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybC5zdGFydHNXaXRoKCcvYXBpLycpKSB7XG4gICAgICAgICAgICBhcHAocmVxLCByZXMsIG5leHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiA1MDAwLFxuICB9XG59KVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydW5uZXIvd29ya3NwYWNlL3NlcnZlclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVubmVyL3dvcmtzcGFjZS9zZXJ2ZXIvYXBpLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3J1bm5lci93b3Jrc3BhY2Uvc2VydmVyL2FwaS5qc1wiO2ltcG9ydCBwZyBmcm9tICdwZyc7XG5cbi8vIERhdGFiYXNlIGNvbm5lY3Rpb25cbmNvbnN0IHsgUG9vbCB9ID0gcGc7XG5jb25zdCBwb29sID0gbmV3IFBvb2woe1xuICBjb25uZWN0aW9uU3RyaW5nOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwsXG4gIHNzbDogcHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMLmluY2x1ZGVzKCduZW9uLnRlY2gnKSA/IHsgcmVqZWN0VW5hdXRob3JpemVkOiBmYWxzZSB9IDogZmFsc2Vcbn0pO1xuXG4vLyBBUEkgUm91dGVzIHBlciBpbCBzaXN0ZW1hIHVwZ3JhZGUgdmVuZGl0b3JlXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBBUEkoYXBwKSB7XG4gIFxuICAvLyBHZXQgcHJvZmlsZSBieSBJRFxuICBhcHAuZ2V0KCcvYXBpL3Byb2ZpbGVzLzppZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGlkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUICogRlJPTSBwcm9maWxlcyBXSEVSRSBpZCA9ICQxJyxcbiAgICAgICAgW2lkXVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgaWYgKHJlc3VsdC5yb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDQpLmpzb24oeyBlcnJvcjogJ1Byb2ZpbG8gbm9uIHRyb3ZhdG8nIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXMuanNvbihyZXN1bHQucm93c1swXSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBwcm9maWxlIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gcHJvZmlsbycgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBHZXQgc2VsbGVyIGJ5IHVzZXJfaWQgIFxuICBhcHAuZ2V0KCcvYXBpL3NlbGxlcnMvdXNlci86dXNlcklkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkIH0gPSByZXEucGFyYW1zO1xuICAgICAgXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KFxuICAgICAgICAnU0VMRUNUIGlkLCBoYW5kbGUsIGRpc3BsYXlfbmFtZSwgYXZhdGFyX3VybCBGUk9NIHNlbGxlcnMgV0hFUkUgdXNlcl9pZCA9ICQxJyxcbiAgICAgICAgW3VzZXJJZF1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdTZWxsZXIgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc2VsbGVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdFcnJvcmUgcmVjdXBlcm8gc2VsbGVyJyB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEdldCBzZWxsZXIgYnkgaGFuZGxlXG4gIGFwcC5nZXQoJy9hcGkvc2VsbGVycy9oYW5kbGUvOmhhbmRsZScsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB7IGhhbmRsZSB9ID0gcmVxLnBhcmFtcztcbiAgICAgIFxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShcbiAgICAgICAgJ1NFTEVDVCBpZCwgaGFuZGxlLCBkaXNwbGF5X25hbWUsIGF2YXRhcl91cmwgRlJPTSBzZWxsZXJzIFdIRVJFIGhhbmRsZSA9ICQxJyxcbiAgICAgICAgW2hhbmRsZV1cbiAgICAgICk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQucm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgZXJyb3I6ICdTZWxsZXIgbm90IGZvdW5kJyB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmVzLmpzb24ocmVzdWx0LnJvd3NbMF0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHZXQgc2VsbGVyIGJ5IGhhbmRsZSBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnRXJyb3JlIHJlY3VwZXJvIHNlbGxlcicgfSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBFTkRQT0lOVCBERURJQ0FUTyBQRVIgVVBHUkFERSBBIFZFTkRJVE9SRVxuICBhcHAucG9zdCgnL2FwaS9wcm9maWxlcy91cGdyYWRlJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHsgdXNlcklkLCAuLi5kYXRhIH0gPSByZXEuYm9keTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REQyNSBVUEdSQURFIFJFUVVFU1QgQVBJIFZJVEU6JywgeyB1c2VySWQsIGRhdGEgfSk7XG4gICAgICBcbiAgICAgIC8vIDEuIFVQU0VSVCBTSUNVUk8gLSBGVU5aSU9OQSBTRU1QUkUgKENSRUEgTyBBR0dJT1JOQSlcbiAgICAgIGNvbnN0IHByb2ZpbGVVcHNlcnRRdWVyeSA9IGBcbiAgICAgICAgSU5TRVJUIElOVE8gcHJvZmlsZXMgKFxuICAgICAgICAgIGlkLCBlbWFpbCwgcm9sZSwgc3RvcmVfbmFtZSwgY2F0ZWdvcnksIGliYW4sIHBob25lLFxuICAgICAgICAgIHNoaXBwaW5nX2FkZHJlc3MsIHNoaXBwaW5nX2NpdHksIHNoaXBwaW5nX3Bvc3RhbF9jb2RlLCBcbiAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5LCBwcm9maWxlX2NvbXBsZXRlZFxuICAgICAgICApIFZBTFVFUyAoXG4gICAgICAgICAgJDEsICQyLCAnc2VsbGVyJywgJDMsICQ0LCAkNSwgJDYsICQ3LCAkOCwgJDksICQxMCwgdHJ1ZVxuICAgICAgICApXG4gICAgICAgIE9OIENPTkZMSUNUIChpZCkgRE8gVVBEQVRFIFNFVFxuICAgICAgICAgIHJvbGUgPSAnc2VsbGVyJyxcbiAgICAgICAgICBzdG9yZV9uYW1lID0gRVhDTFVERUQuc3RvcmVfbmFtZSxcbiAgICAgICAgICBjYXRlZ29yeSA9IEVYQ0xVREVELmNhdGVnb3J5LFxuICAgICAgICAgIGliYW4gPSBFWENMVURFRC5pYmFuLFxuICAgICAgICAgIHBob25lID0gRVhDTFVERUQucGhvbmUsXG4gICAgICAgICAgc2hpcHBpbmdfYWRkcmVzcyA9IEVYQ0xVREVELnNoaXBwaW5nX2FkZHJlc3MsXG4gICAgICAgICAgc2hpcHBpbmdfY2l0eSA9IEVYQ0xVREVELnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgc2hpcHBpbmdfcG9zdGFsX2NvZGUgPSBFWENMVURFRC5zaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5ID0gRVhDTFVERUQuc2hpcHBpbmdfY291bnRyeSxcbiAgICAgICAgICBwcm9maWxlX2NvbXBsZXRlZCA9IHRydWVcbiAgICAgICAgUkVUVVJOSU5HICpcbiAgICAgIGA7XG4gICAgICBcbiAgICAgIGNvbnN0IHByb2ZpbGVSZXN1bHQgPSBhd2FpdCBwb29sLnF1ZXJ5KHByb2ZpbGVVcHNlcnRRdWVyeSwgW1xuICAgICAgICB1c2VySWQsXG4gICAgICAgIGRhdGEuYnVzaW5lc3NfZW1haWwgfHwgYHVzZXItJHt1c2VySWR9QGJpZGxpLmxpdmVgLFxuICAgICAgICBkYXRhLnN0b3JlX25hbWUgfHwgJycsXG4gICAgICAgIGRhdGEuY2F0ZWdvcnkgfHwgJycsXG4gICAgICAgIGRhdGEuaWJhbiB8fCAnJyxcbiAgICAgICAgZGF0YS5waG9uZSB8fCAnJyxcbiAgICAgICAgZGF0YS5zaGlwcGluZ19hZGRyZXNzIHx8ICcnLFxuICAgICAgICBkYXRhLnNoaXBwaW5nX2NpdHkgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfcG9zdGFsX2NvZGUgfHwgJycsXG4gICAgICAgIGRhdGEuc2hpcHBpbmdfY291bnRyeSB8fCAnSXRhbHknXG4gICAgICBdKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBQUk9GSUxPIEFHR0lPUk5BVE8gQSBTRUxMRVIgKFZJVEUpOicsIHByb2ZpbGVSZXN1bHQucm93c1swXSk7XG4gICAgICBcbiAgICAgIC8vIDIuIENyZWEgcmVjb3JkIHZlbmRpdG9yZSBzZSBub24gZXNpc3RlXG4gICAgICBjb25zdCBoYW5kbGUgPSAoZGF0YS5zdG9yZV9uYW1lIHx8ICdzZWxsZXInKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XS9nLCAnXycpICsgJ18nICsgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDUpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzZWxsZXJJbnNlcnRRdWVyeSA9IGBcbiAgICAgICAgICBJTlNFUlQgSU5UTyBzZWxsZXJzIChcbiAgICAgICAgICAgIHVzZXJfaWQsIGhhbmRsZSwgZGlzcGxheV9uYW1lLCBzdG9yZV9uYW1lLCBiaW8sIGliYW4sXG4gICAgICAgICAgICBjYXRlZ29yeSwgc2hpcHBpbmdfYWRkcmVzcywgc2hpcHBpbmdfY2l0eSwgc2hpcHBpbmdfcG9zdGFsX2NvZGUsXG4gICAgICAgICAgICBzaGlwcGluZ19jb3VudHJ5LCBwaG9uZSwgYnVzaW5lc3NfZW1haWwsIHByb2ZpbGVfY29tcGxldGVkXG4gICAgICAgICAgKSBWQUxVRVMgKFxuICAgICAgICAgICAgJDEsICQyLCAkMywgJDQsICQ1LCAkNiwgJDcsICQ4LCAkOSwgJDEwLCAkMTEsICQxMiwgJDEzLCAkMTRcbiAgICAgICAgICApIFxuICAgICAgICAgIE9OIENPTkZMSUNUICh1c2VyX2lkKSBETyBVUERBVEUgU0VUXG4gICAgICAgICAgICBoYW5kbGUgPSBFWENMVURFRC5oYW5kbGUsXG4gICAgICAgICAgICBkaXNwbGF5X25hbWUgPSBFWENMVURFRC5kaXNwbGF5X25hbWUsXG4gICAgICAgICAgICBzdG9yZV9uYW1lID0gRVhDTFVERUQuc3RvcmVfbmFtZSxcbiAgICAgICAgICAgIGJpbyA9IEVYQ0xVREVELmJpbyxcbiAgICAgICAgICAgIGliYW4gPSBFWENMVURFRC5pYmFuLFxuICAgICAgICAgICAgY2F0ZWdvcnkgPSBFWENMVURFRC5jYXRlZ29yeSxcbiAgICAgICAgICAgIHNoaXBwaW5nX2FkZHJlc3MgPSBFWENMVURFRC5zaGlwcGluZ19hZGRyZXNzLFxuICAgICAgICAgICAgc2hpcHBpbmdfY2l0eSA9IEVYQ0xVREVELnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgICBzaGlwcGluZ19wb3N0YWxfY29kZSA9IEVYQ0xVREVELnNoaXBwaW5nX3Bvc3RhbF9jb2RlLFxuICAgICAgICAgICAgc2hpcHBpbmdfY291bnRyeSA9IEVYQ0xVREVELnNoaXBwaW5nX2NvdW50cnksXG4gICAgICAgICAgICBwaG9uZSA9IEVYQ0xVREVELnBob25lLFxuICAgICAgICAgICAgYnVzaW5lc3NfZW1haWwgPSBFWENMVURFRC5idXNpbmVzc19lbWFpbCxcbiAgICAgICAgICAgIHByb2ZpbGVfY29tcGxldGVkID0gRVhDTFVERUQucHJvZmlsZV9jb21wbGV0ZWRcbiAgICAgICAgICBSRVRVUk5JTkcgKlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2VsbGVyUmVzdWx0ID0gYXdhaXQgcG9vbC5xdWVyeShzZWxsZXJJbnNlcnRRdWVyeSwgW1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICBoYW5kbGUsXG4gICAgICAgICAgZGF0YS5zdG9yZV9uYW1lLFxuICAgICAgICAgIGRhdGEuc3RvcmVfbmFtZSxcbiAgICAgICAgICBkYXRhLnN0b3JlX2Rlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgIGRhdGEuaWJhbixcbiAgICAgICAgICBkYXRhLmNhdGVnb3J5LFxuICAgICAgICAgIGRhdGEuc2hpcHBpbmdfYWRkcmVzcyxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX2NpdHksXG4gICAgICAgICAgZGF0YS5zaGlwcGluZ19wb3N0YWxfY29kZSxcbiAgICAgICAgICBkYXRhLnNoaXBwaW5nX2NvdW50cnkgfHwgJ0l0YWx5JyxcbiAgICAgICAgICBkYXRhLnBob25lLFxuICAgICAgICAgIGRhdGEuYnVzaW5lc3NfZW1haWwsXG4gICAgICAgICAgdHJ1ZVxuICAgICAgICBdKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgU0VMTEVSIENSRUFUTy9BR0dJT1JOQVRPIChWSVRFKTonLCBzZWxsZXJSZXN1bHQucm93c1swXSk7XG4gICAgICAgIFxuICAgICAgICByZXMuanNvbih7IFxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgIHByb2ZpbGU6IHByb2ZpbGVSZXN1bHQucm93c1swXSxcbiAgICAgICAgICBzZWxsZXI6IHNlbGxlclJlc3VsdC5yb3dzWzBdLFxuICAgICAgICAgIG1lc3NhZ2U6ICdVcGdyYWRlIGEgdmVuZGl0b3JlIGNvbXBsZXRhdG8gY29uIHN1Y2Nlc3NvIScgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgIH0gY2F0Y2ggKHNlbGxlckVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yZSBjcmVhemlvbmUgc2VsbGVyOicsIHNlbGxlckVycm9yKTtcbiAgICAgICAgLy8gQW5jaGUgc2UgaWwgc2VsbGVyIGZhbGxpc2NlLCBpbCBwcm9maWxvIFx1MDBFOCBzdGF0byBhZ2dpb3JuYXRvXG4gICAgICAgIHJlcy5qc29uKHsgXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgcHJvZmlsZTogcHJvZmlsZVJlc3VsdC5yb3dzWzBdLFxuICAgICAgICAgIG1lc3NhZ2U6ICdVcGdyYWRlIGNvbXBsZXRhdG8hIFByb2ZpbG8gdmVuZGl0b3JlIHNhclx1MDBFMCBjcmVhdG8gYXV0b21hdGljYW1lbnRlLicgXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFUlJPUkUgVVBHUkFERSAoVklURSk6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6ICdFcnJvcmUgZHVyYW50ZSB1cGdyYWRlIGEgdmVuZGl0b3JlJyxcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZSBcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc29sZS5sb2coJ1x1MjcwNSBBUEkgUm91dGVzIGNvbmZpZ3VyYXRlIG5lbCBzZXJ2ZXIgVml0ZSEnKTtcbn0iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9QLFNBQVMsb0JBQW9CO0FBQ2pSLE9BQU8sV0FBVztBQUNsQixPQUFPLGFBQWE7OztBQ0ZxTyxPQUFPLFFBQVE7QUFHeFEsSUFBTSxFQUFFLEtBQUssSUFBSTtBQUNqQixJQUFNLE9BQU8sSUFBSSxLQUFLO0FBQUEsRUFDcEIsa0JBQWtCLFFBQVEsSUFBSTtBQUFBLEVBQzlCLEtBQUssUUFBUSxJQUFJLGFBQWEsU0FBUyxXQUFXLElBQUksRUFBRSxvQkFBb0IsTUFBTSxJQUFJO0FBQ3hGLENBQUM7QUFHTSxTQUFTLFNBQVMsS0FBSztBQUc1QixNQUFJLElBQUkscUJBQXFCLE9BQU8sS0FBSyxRQUFRO0FBQy9DLFFBQUk7QUFDRixZQUFNLEVBQUUsR0FBRyxJQUFJLElBQUk7QUFFbkIsWUFBTSxTQUFTLE1BQU0sS0FBSztBQUFBLFFBQ3hCO0FBQUEsUUFDQSxDQUFDLEVBQUU7QUFBQSxNQUNMO0FBRUEsVUFBSSxPQUFPLEtBQUssV0FBVyxHQUFHO0FBQzVCLGVBQU8sSUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxzQkFBc0IsQ0FBQztBQUFBLE1BQzlEO0FBRUEsVUFBSSxLQUFLLE9BQU8sS0FBSyxDQUFDLENBQUM7QUFBQSxJQUN6QixTQUFTLE9BQU87QUFDZCxjQUFRLE1BQU0sc0JBQXNCLEtBQUs7QUFDekMsVUFBSSxPQUFPLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTywwQkFBMEIsQ0FBQztBQUFBLElBQzNEO0FBQUEsRUFDRixDQUFDO0FBR0QsTUFBSSxJQUFJLDZCQUE2QixPQUFPLEtBQUssUUFBUTtBQUN2RCxRQUFJO0FBQ0YsWUFBTSxFQUFFLE9BQU8sSUFBSSxJQUFJO0FBRXZCLFlBQU0sU0FBUyxNQUFNLEtBQUs7QUFBQSxRQUN4QjtBQUFBLFFBQ0EsQ0FBQyxNQUFNO0FBQUEsTUFDVDtBQUVBLFVBQUksT0FB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

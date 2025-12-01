-- Live Streaming Tables for BIDLi
-- Creazione tabelle per il sistema di live streaming e aste

-- Tabella per le sessioni live
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stream_key VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per i prodotti in asta durante le live
CREATE TABLE IF NOT EXISTS auction_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url TEXT,
  starting_price DECIMAL(10,2) NOT NULL,
  current_bid DECIMAL(10,2) DEFAULT 0,
  min_increment DECIMAL(10,2) DEFAULT 1.00,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'ended', 'sold')),
  auction_started_at TIMESTAMPTZ,
  auction_ended_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per le offerte in tempo reale
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  auction_product_id UUID REFERENCES auction_products(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bidder_name VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  is_winning BOOLEAN DEFAULT FALSE,
  bid_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per la chat live
CREATE TABLE IF NOT EXISTS live_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system', 'bid')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per i follower delle live sessions
CREATE TABLE IF NOT EXISTS live_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE(live_session_id, user_id)
);

-- Tabella per le notifiche live
CREATE TABLE IF NOT EXISTS live_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_seller_id ON live_sessions(seller_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_category ON live_sessions(category);
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_at ON live_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_auction_products_live_session_id ON auction_products(live_session_id);
CREATE INDEX IF NOT EXISTS idx_auction_products_status ON auction_products(status);

CREATE INDEX IF NOT EXISTS idx_bids_live_session_id ON bids(live_session_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_product_id ON bids(auction_product_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON bids(bid_time);

CREATE INDEX IF NOT EXISTS idx_live_chat_live_session_id ON live_chat(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_created_at ON live_chat(created_at);

CREATE INDEX IF NOT EXISTS idx_live_followers_user_id ON live_followers(user_id);
CREATE INDEX IF NOT EXISTS idx_live_notifications_user_id ON live_notifications(user_id);

-- Trigger per aggiornare timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_live_sessions_updated_at 
BEFORE UPDATE ON live_sessions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_products_updated_at 
BEFORE UPDATE ON auction_products 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funzione per aggiornare l'offerta vincente
CREATE OR REPLACE FUNCTION update_winning_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset tutte le offerte come non vincenti per questo prodotto
  UPDATE bids 
  SET is_winning = FALSE 
  WHERE auction_product_id = NEW.auction_product_id;
  
  -- Imposta la nuova offerta come vincente
  UPDATE bids 
  SET is_winning = TRUE 
  WHERE id = NEW.id;
  
  -- Aggiorna l'offerta corrente nel prodotto
  UPDATE auction_products 
  SET current_bid = NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.auction_product_id;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_winning_bid 
AFTER INSERT ON bids 
FOR EACH ROW EXECUTE FUNCTION update_winning_bid();

-- Funzione per contare i viewer
CREATE OR REPLACE FUNCTION increment_viewer_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions 
  SET viewer_count = viewer_count + 1,
      total_viewers = total_viewers + 1
  WHERE id = session_id;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION decrement_viewer_count(session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE live_sessions 
  SET viewer_count = GREATEST(viewer_count - 1, 0)
  WHERE id = session_id;
END;
$$ language 'plpgsql';

-- 👇 QUI C'ERA IL SEED DI ESEMPIO: LO ABBIAMO TOLTO
-- (non necessario per il funzionamento dell'app)

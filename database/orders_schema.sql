-- Orders and Analytics Schema for BIDLi
-- Sistema completo di gestione ordini automatizzati post-live e analytics

-- Tabella per gli ordini generati automaticamente dalle aste
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL, -- Numero ordine univoco (es. BDL-240105-001)
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE SET NULL,
  auction_product_id UUID REFERENCES auction_products(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Dettagli prodotto al momento dell'ordine
  product_title VARCHAR(200) NOT NULL,
  product_description TEXT,
  product_image_url TEXT,
  
  -- Prezzi e pagamento
  final_auction_price DECIMAL(10,2) NOT NULL, -- Prezzo finale dell'asta
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL, -- finale + spedizione
  
  -- Stati dell'ordine
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  order_status VARCHAR(20) DEFAULT 'confirmed' CHECK (order_status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
  shipping_status VARCHAR(30) DEFAULT 'pending' CHECK (shipping_status IN ('pending', 'label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery')),
  
  -- Dati spedizione
  shipping_method VARCHAR(50) DEFAULT 'standard', -- standard, express, pickup
  tracking_number VARCHAR(100),
  shipping_carrier VARCHAR(50) DEFAULT 'InPost',
  estimated_delivery DATE,
  actual_delivery_date DATE,
  
  -- Indirizzi
  shipping_address JSONB NOT NULL, -- {name, street, city, zip, country, phone}
  billing_address JSONB, -- Se diverso da spedizione
  
  -- Metadati
  payment_method VARCHAR(50), -- stripe, paypal, etc
  payment_transaction_id VARCHAR(100),
  notes TEXT, -- Note del venditore
  buyer_notes TEXT, -- Note dell'acquirente
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Tabella per tracking dettagliato spedizioni
CREATE TABLE IF NOT EXISTS shipping_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- label_created, picked_up, in_transit, delivered, etc
  event_description TEXT NOT NULL,
  location VARCHAR(200),
  event_timestamp TIMESTAMPTZ DEFAULT NOW(),
  carrier_event_id VARCHAR(100), -- ID evento del corriere
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella per analytics dettagliate live sessions
CREATE TABLE IF NOT EXISTS live_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL, -- Per aggregazioni giornaliere
  
  -- Statistiche spettatori
  peak_viewers INTEGER DEFAULT 0,
  average_viewers DECIMAL(5,2) DEFAULT 0,
  total_unique_viewers INTEGER DEFAULT 0,
  total_view_time_minutes INTEGER DEFAULT 0, -- Tempo totale visualizzazione
  
  -- Statistiche vendite
  total_items_sold INTEGER DEFAULT 0,
  total_items_listed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_sale_price DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0, -- % spettatori che hanno comprato
  
  -- Engagement
  total_bids INTEGER DEFAULT 0,
  unique_bidders INTEGER DEFAULT 0,
  chat_messages INTEGER DEFAULT 0,
  active_chatters INTEGER DEFAULT 0,
  
  -- Durata
  session_duration_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(live_session_id, date)
);

-- Tabella per analytics aggregati venditori (giornaliere, settimanali, mensili)
CREATE TABLE IF NOT EXISTS seller_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- KPI Vendite
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  
  -- KPI Live Streaming
  total_live_sessions INTEGER DEFAULT 0,
  total_live_minutes INTEGER DEFAULT 0,
  average_viewers DECIMAL(5,2) DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  
  -- KPI Engagement
  total_followers_gained INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Conversion metrics
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  repeat_customer_rate DECIMAL(5,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, period_type, period_start)
);

-- Tabella per notifiche ordini automatiche
CREATE TABLE IF NOT EXISTS order_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Destinatario
  notification_type VARCHAR(50) NOT NULL, -- order_confirmed, payment_received, shipped, delivered
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  sent_via VARCHAR(20) DEFAULT 'app' CHECK (sent_via IN ('app', 'email', 'sms', 'push')),
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_created ON orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_live_session ON orders(live_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_shipping_events_order ON shipping_events(order_id, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_live_analytics_session_date ON live_analytics(live_session_id, date);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_seller_period ON seller_analytics(seller_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_order_notifications_user_type ON order_notifications(user_id, notification_type, is_sent);

-- Trigger per auto-aggiornamento timestamp
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seller_analytics_updated_at BEFORE UPDATE ON seller_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funzione per generare numero ordine univoco
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  order_num VARCHAR(20);
  date_part VARCHAR(6);
  counter INTEGER;
BEGIN
  -- Formato: BDL-YYMMDD-XXX (es. BDL-240105-001)
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Conta ordini di oggi per numero progressivo
  SELECT COALESCE(MAX(CAST(RIGHT(order_number, 3) AS INTEGER)), 0) + 1
  INTO counter
  FROM orders 
  WHERE order_number LIKE 'BDL-' || date_part || '-%';
  
  order_num := 'BDL-' || date_part || '-' || LPAD(counter::TEXT, 3, '0');
  
  RETURN order_num;
END;
$$ language 'plpgsql';

-- Funzione per creare ordine automatico da asta vinta
CREATE OR REPLACE FUNCTION create_order_from_auction(
  auction_product_uuid UUID,
  winner_user_uuid UUID,
  final_price DECIMAL(10,2),
  shipping_address_json JSONB
)
RETURNS UUID AS $$
DECLARE
  order_uuid UUID;
  auction_product RECORD;
  live_session RECORD;
BEGIN
  -- Recupera dettagli prodotto e live session
  SELECT ap.*, ls.seller_id
  INTO auction_product
  FROM auction_products ap
  JOIN live_sessions ls ON ap.live_session_id = ls.id
  WHERE ap.id = auction_product_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction product not found';
  END IF;
  
  -- Crea l'ordine
  INSERT INTO orders (
    order_number,
    live_session_id,
    auction_product_id,
    seller_id,
    buyer_id,
    product_title,
    product_description,
    product_image_url,
    final_auction_price,
    total_amount,
    shipping_address
  ) VALUES (
    generate_order_number(),
    auction_product.live_session_id,
    auction_product_uuid,
    auction_product.seller_id,
    winner_user_uuid,
    auction_product.title,
    auction_product.description,
    auction_product.image_url,
    final_price,
    final_price, -- TODO: + shipping cost calculation
    shipping_address_json
  )
  RETURNING id INTO order_uuid;
  
  RETURN order_uuid;
END;
$$ language 'plpgsql';

-- Funzione per aggiornare analytics live al termine
CREATE OR REPLACE FUNCTION update_live_analytics(live_session_uuid UUID)
RETURNS void AS $$
DECLARE
  analytics_record RECORD;
  session_record RECORD;
BEGIN
  -- Recupera dati della sessione
  SELECT * INTO session_record FROM live_sessions WHERE id = live_session_uuid;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcola analytics
  SELECT 
    session_record.total_viewers as total_unique_viewers,
    COALESCE(MAX(viewer_count), 0) as peak_viewers,
    COUNT(DISTINCT ap.id) as total_items_listed,
    COUNT(DISTINCT CASE WHEN ap.status = 'sold' THEN ap.id END) as total_items_sold,
    COALESCE(SUM(CASE WHEN ap.status = 'sold' THEN ap.current_bid ELSE 0 END), 0) as total_revenue,
    COUNT(DISTINCT b.id) as total_bids,
    COUNT(DISTINCT b.bidder_id) as unique_bidders,
    COUNT(DISTINCT lc.id) as chat_messages,
    COUNT(DISTINCT lc.user_id) as active_chatters,
    CASE 
      WHEN session_record.ended_at IS NOT NULL AND session_record.started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (session_record.ended_at - session_record.started_at))/60 
      ELSE 0 
    END as session_duration_minutes
  INTO analytics_record
  FROM live_sessions ls
  LEFT JOIN auction_products ap ON ls.id = ap.live_session_id
  LEFT JOIN bids b ON ap.id = b.auction_product_id
  LEFT JOIN live_chat lc ON ls.id = lc.live_session_id
  WHERE ls.id = live_session_uuid
  GROUP BY ls.id;
  
  -- Inserisci/aggiorna analytics
  INSERT INTO live_analytics (
    live_session_id,
    date,
    peak_viewers,
    total_unique_viewers,
    total_items_sold,
    total_items_listed,
    total_revenue,
    total_bids,
    unique_bidders,
    chat_messages,
    active_chatters,
    session_duration_minutes,
    conversion_rate
  ) VALUES (
    live_session_uuid,
    session_record.started_at::DATE,
    analytics_record.peak_viewers,
    analytics_record.total_unique_viewers,
    analytics_record.total_items_sold,
    analytics_record.total_items_listed,
    analytics_record.total_revenue,
    analytics_record.total_bids,
    analytics_record.unique_bidders,
    analytics_record.chat_messages,
    analytics_record.active_chatters,
    analytics_record.session_duration_minutes,
    CASE 
      WHEN analytics_record.total_unique_viewers > 0 
      THEN analytics_record.unique_bidders::DECIMAL / analytics_record.total_unique_viewers::DECIMAL 
      ELSE 0 
    END
  )
  ON CONFLICT (live_session_id, date) DO UPDATE SET
    peak_viewers = EXCLUDED.peak_viewers,
    total_unique_viewers = EXCLUDED.total_unique_viewers,
    total_items_sold = EXCLUDED.total_items_sold,
    total_items_listed = EXCLUDED.total_items_listed,
    total_revenue = EXCLUDED.total_revenue,
    total_bids = EXCLUDED.total_bids,
    unique_bidders = EXCLUDED.unique_bidders,
    chat_messages = EXCLUDED.chat_messages,
    active_chatters = EXCLUDED.active_chatters,
    session_duration_minutes = EXCLUDED.session_duration_minutes,
    conversion_rate = EXCLUDED.conversion_rate;
END;
$$ language 'plpgsql';
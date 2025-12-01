-- ===== SUPABASE STORAGE SETUP =====
-- Script per configurare buckets e policy

-- 1. Crea bucket uploads per media (se non esiste)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy per upload autenticati
CREATE POLICY "Users can upload files" ON storage.objects 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Policy per leggere files pubblici
CREATE POLICY "Public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'uploads');

-- 4. Policy per aggiornare propri files
CREATE POLICY "Users can update own files" ON storage.objects 
FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Policy per cancellare propri files
CREATE POLICY "Users can delete own files" ON storage.objects 
FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ===== ALTERNATIVE: Storage buckets via SQL =====

-- Verifica bucket esistenti
SELECT id, name, public FROM storage.buckets;

-- Se il bucket uploads esiste ma ha problemi policy:
-- DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
-- DROP POLICY IF EXISTS "Public read access" ON storage.objects;
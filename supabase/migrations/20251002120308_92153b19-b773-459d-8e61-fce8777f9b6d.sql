-- Drop existing bucket and recreate
DELETE FROM storage.buckets WHERE id = 'test-cvs';

-- Create bucket with correct schema
INSERT INTO storage.buckets (id, name) 
VALUES ('test-cvs', 'test-cvs');

-- Recreate all storage policies
DROP POLICY IF EXISTS "Authenticated users can upload test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete test CVs" ON storage.objects;

CREATE POLICY "Authenticated users can upload test CVs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can read test CVs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can update test CVs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can delete test CVs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'test-cvs');
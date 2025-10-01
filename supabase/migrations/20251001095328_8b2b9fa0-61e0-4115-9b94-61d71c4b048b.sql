-- Ensure the cvs storage bucket exists (without public column)
INSERT INTO storage.buckets (id, name)
VALUES ('cvs', 'cvs')
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own CV" ON storage.objects;

-- Create storage policies for the cvs bucket
CREATE POLICY "Users can upload their own CV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own CV"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own CV"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cvs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own CV"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cvs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
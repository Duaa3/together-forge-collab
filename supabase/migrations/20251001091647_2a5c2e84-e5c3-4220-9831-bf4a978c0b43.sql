-- Create storage bucket for CVs (without public column as it may not exist in this version)
INSERT INTO storage.buckets (id, name)
VALUES ('cvs', 'cvs')
ON CONFLICT (id) DO NOTHING;

-- Add cv_path column to candidates table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'candidates' 
    AND column_name = 'cv_path'
  ) THEN
    ALTER TABLE public.candidates ADD COLUMN cv_path TEXT;
  END IF;
END $$;

-- Create RLS policies for CV storage
CREATE POLICY "Users can upload their own CVs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cvs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own CVs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cvs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "HR can view all CVs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cvs' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'hr'
  )
);
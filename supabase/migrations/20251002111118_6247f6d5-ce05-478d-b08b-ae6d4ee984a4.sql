-- Create or update test-cvs storage bucket
INSERT INTO storage.buckets (id, name)
VALUES ('test-cvs', 'test-cvs')
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update test CVs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete test CVs" ON storage.objects;

-- Storage policies for test-cvs bucket
CREATE POLICY "Authenticated users can upload test CVs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can read test CVs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can update test CVs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can delete test CVs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'test-cvs');

-- Create test_cv_files table if not exists
CREATE TABLE IF NOT EXISTS public.test_cv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_case_id, filename)
);

-- Enable RLS on test_cv_files
ALTER TABLE public.test_cv_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view test CV files" ON public.test_cv_files;
DROP POLICY IF EXISTS "Authenticated users can insert test CV files" ON public.test_cv_files;
DROP POLICY IF EXISTS "Authenticated users can delete their test CV files" ON public.test_cv_files;

-- RLS policies for test_cv_files
CREATE POLICY "Authenticated users can view test CV files"
ON public.test_cv_files
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert test CV files"
ON public.test_cv_files
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can delete their test CV files"
ON public.test_cv_files
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Create test_results table if not exists
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_file_id UUID REFERENCES public.test_cv_files(id) ON DELETE CASCADE,
  test_case_id TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  field_results JSONB,
  extracted_data JSONB,
  expected_data JSONB,
  accuracy_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on test_results
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view test results" ON public.test_results;
DROP POLICY IF EXISTS "Authenticated users can insert test results" ON public.test_results;
DROP POLICY IF EXISTS "Authenticated users can delete test results" ON public.test_results;

-- RLS policies for test_results
CREATE POLICY "Authenticated users can view test results"
ON public.test_results
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert test results"
ON public.test_results
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete test results"
ON public.test_results
FOR DELETE
TO authenticated
USING (true);
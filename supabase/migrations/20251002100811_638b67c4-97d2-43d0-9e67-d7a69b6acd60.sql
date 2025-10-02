-- Create storage bucket for test CVs (using only id and name)
INSERT INTO storage.buckets (id, name) 
VALUES ('test-cvs', 'test-cvs')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for test CVs
CREATE POLICY "Authenticated users can upload test CVs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'test-cvs');

CREATE POLICY "Anyone can view test CVs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'test-cvs');

CREATE POLICY "Authenticated users can delete test CVs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'test-cvs');

-- Create test_cv_files table
CREATE TABLE public.test_cv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_cv_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_cv_files
CREATE POLICY "Anyone can view test CV files"
ON public.test_cv_files
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert test CV files"
ON public.test_cv_files
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own uploads"
ON public.test_cv_files
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Create test_results table
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL,
  test_case_id TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  expected_data JSONB NOT NULL,
  actual_data JSONB NOT NULL,
  field_results JSONB NOT NULL,
  run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  run_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_results
CREATE POLICY "Anyone can view test results"
ON public.test_results
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert test results"
ON public.test_results
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_test_results_run_id ON public.test_results(test_run_id);
CREATE INDEX idx_test_results_test_case_id ON public.test_results(test_case_id);
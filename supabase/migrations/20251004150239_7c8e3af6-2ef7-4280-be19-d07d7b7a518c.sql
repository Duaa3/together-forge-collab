-- Add job category fields to candidates table for ML-based categorization
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS job_category TEXT,
ADD COLUMN IF NOT EXISTS category_confidence NUMERIC;
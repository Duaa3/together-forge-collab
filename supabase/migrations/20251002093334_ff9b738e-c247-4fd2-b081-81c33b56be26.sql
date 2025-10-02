-- First, check if foreign keys exist and drop them if they do
DO $$ 
BEGIN
    -- Drop existing foreign key constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'candidates_job_id_fkey' 
        AND table_name = 'candidates'
    ) THEN
        ALTER TABLE public.candidates DROP CONSTRAINT candidates_job_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ml_scores_job_id_fkey' 
        AND table_name = 'ml_scores'
    ) THEN
        ALTER TABLE public.ml_scores DROP CONSTRAINT ml_scores_job_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ml_scores_candidate_id_fkey' 
        AND table_name = 'ml_scores'
    ) THEN
        ALTER TABLE public.ml_scores DROP CONSTRAINT ml_scores_candidate_id_fkey;
    END IF;
END $$;

-- Add foreign keys with CASCADE delete for candidates table
ALTER TABLE public.candidates
ADD CONSTRAINT candidates_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

-- Add foreign keys with CASCADE delete for ml_scores table
ALTER TABLE public.ml_scores
ADD CONSTRAINT ml_scores_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.ml_scores
ADD CONSTRAINT ml_scores_candidate_id_fkey 
FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;
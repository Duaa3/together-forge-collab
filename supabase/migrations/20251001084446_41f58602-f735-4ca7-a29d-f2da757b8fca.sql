-- Add comment to jobs table
COMMENT ON TABLE public.jobs IS 'Stores the criteria and definitions for each job role, including user context and skill requirements';

-- Add comment to candidates table
COMMENT ON TABLE public.candidates IS 'Stores extracted candidate data, match scores, and the final Accept/Reject decision for each job application';

-- Ensure decision column has proper check constraint
ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_decision_check;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_decision_check 
CHECK (decision IN ('pending', 'accepted', 'rejected') OR decision IS NULL);
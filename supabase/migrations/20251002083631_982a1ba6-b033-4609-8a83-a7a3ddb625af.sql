-- Update the decision column to have a default value of 'pending'
ALTER TABLE candidates 
ALTER COLUMN decision SET DEFAULT 'pending';

-- Update any existing NULL decision values to 'pending'
UPDATE candidates 
SET decision = 'pending' 
WHERE decision IS NULL;

-- Add a CHECK constraint to ensure only valid decision values
ALTER TABLE candidates
ADD CONSTRAINT valid_decision_values 
CHECK (decision IN ('pending', 'accepted', 'rejected'));
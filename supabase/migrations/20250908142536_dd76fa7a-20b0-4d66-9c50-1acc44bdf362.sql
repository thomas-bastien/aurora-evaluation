-- Update existing data to use standardized status values
UPDATE startups 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startups 
SET status = 'under_review' 
WHERE status = 'under-review';

-- Drop and recreate check constraints with standardized values
ALTER TABLE startups DROP CONSTRAINT IF EXISTS startups_status_check;
ALTER TABLE startup_round_statuses DROP CONSTRAINT IF EXISTS startup_round_statuses_status_check;

ALTER TABLE startups ADD CONSTRAINT startups_status_check 
CHECK (status IN ('pending', 'under_review', 'selected', 'rejected'));

ALTER TABLE startup_round_statuses ADD CONSTRAINT startup_round_statuses_status_check 
CHECK (status IN ('pending', 'under_review', 'selected', 'rejected'));
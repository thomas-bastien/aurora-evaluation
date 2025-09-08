-- First, drop existing check constraints that prevent status updates
ALTER TABLE startups DROP CONSTRAINT IF EXISTS startups_status_check;
ALTER TABLE startup_round_statuses DROP CONSTRAINT IF EXISTS startup_round_statuses_status_check;

-- Create new check constraints with standardized status values
ALTER TABLE startups ADD CONSTRAINT startups_status_check 
CHECK (status IN ('pending', 'under_review', 'selected', 'rejected'));

ALTER TABLE startup_round_statuses ADD CONSTRAINT startup_round_statuses_status_check 
CHECK (status IN ('pending', 'under_review', 'selected', 'rejected'));

-- Now update the data to use standardized values
UPDATE startups 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startups 
SET status = 'under_review' 
WHERE status = 'under-review';

UPDATE startup_round_statuses 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startup_round_statuses 
SET status = 'under_review' 
WHERE status = 'under-review';
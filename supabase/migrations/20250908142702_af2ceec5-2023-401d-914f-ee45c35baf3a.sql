-- Drop the existing constraint that's blocking updates
ALTER TABLE startups DROP CONSTRAINT IF EXISTS startups_status_check;

-- Update the data to standardized values  
UPDATE startups 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startups 
SET status = 'under_review' 
WHERE status = 'under-review';
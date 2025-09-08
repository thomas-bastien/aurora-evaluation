-- Standardize startup statuses to use consistent values
UPDATE startups 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startups 
SET status = 'under_review' 
WHERE status = 'under-review';

-- Standardize startup_round_statuses to use consistent values  
UPDATE startup_round_statuses 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startup_round_statuses 
SET status = 'under_review' 
WHERE status = 'under-review';
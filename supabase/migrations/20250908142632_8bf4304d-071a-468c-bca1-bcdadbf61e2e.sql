-- Just update the data without touching constraints
UPDATE startups 
SET status = 'selected' 
WHERE status = 'shortlisted';

UPDATE startups 
SET status = 'under_review' 
WHERE status = 'under-review';

UPDATE startup_round_statuses 
SET status = 'under_review' 
WHERE status = 'under-review';
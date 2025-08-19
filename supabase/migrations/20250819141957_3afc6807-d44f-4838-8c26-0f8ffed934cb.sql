-- First, normalize existing stage values to Title Case
UPDATE startups 
SET stage = CASE 
  WHEN stage = 'pre-seed' THEN 'Pre-Seed'
  WHEN stage = 'seed' THEN 'Seed'
  WHEN stage = 'series-a' THEN 'Series A'
  WHEN stage = 'series-b' THEN 'Series B' 
  WHEN stage = 'series-c' THEN 'Series C'
  WHEN stage = 'growth' THEN 'Growth'
  WHEN stage = 'ipo' THEN 'IPO'
  ELSE stage
END
WHERE stage IS NOT NULL;

-- Then update the check constraint
ALTER TABLE startups DROP CONSTRAINT startups_stage_check;

ALTER TABLE startups ADD CONSTRAINT startups_stage_check 
CHECK (stage = ANY (ARRAY['Pre-Seed'::text, 'Seed'::text, 'Series A'::text, 'Series B'::text, 'Series C'::text, 'Growth'::text, 'IPO'::text]));
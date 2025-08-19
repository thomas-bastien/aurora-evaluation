-- Update the stage check constraint to allow Title Case values
ALTER TABLE startups DROP CONSTRAINT startups_stage_check;

ALTER TABLE startups ADD CONSTRAINT startups_stage_check 
CHECK (stage = ANY (ARRAY['Pre-Seed'::text, 'Seed'::text, 'Series A'::text, 'Series B'::text, 'Series C'::text, 'Growth'::text, 'IPO'::text]));

-- Normalize existing stage values to Title Case
UPDATE startups 
SET stage = CASE 
  WHEN LOWER(stage) = 'pre-seed' THEN 'Pre-Seed'
  WHEN LOWER(stage) = 'seed' THEN 'Seed'
  WHEN LOWER(stage) = 'series-a' OR LOWER(stage) = 'series a' THEN 'Series A'
  WHEN LOWER(stage) = 'series-b' OR LOWER(stage) = 'series b' THEN 'Series B' 
  WHEN LOWER(stage) = 'series-c' OR LOWER(stage) = 'series c' THEN 'Series C'
  WHEN LOWER(stage) = 'growth' THEN 'Growth'
  WHEN LOWER(stage) = 'ipo' THEN 'IPO'
  ELSE stage
END
WHERE stage IS NOT NULL;
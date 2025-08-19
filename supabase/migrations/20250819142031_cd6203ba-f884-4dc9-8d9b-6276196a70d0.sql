-- Temporarily store stage values in a new column
ALTER TABLE startups ADD COLUMN temp_stage TEXT;

-- Copy current stage values
UPDATE startups SET temp_stage = stage WHERE stage IS NOT NULL;

-- Set all stage values to NULL
UPDATE startups SET stage = NULL;

-- Drop and recreate the constraint with Title Case values
ALTER TABLE startups DROP CONSTRAINT startups_stage_check;
ALTER TABLE startups ADD CONSTRAINT startups_stage_check 
CHECK (stage = ANY (ARRAY['Pre-Seed'::text, 'Seed'::text, 'Series A'::text, 'Series B'::text, 'Series C'::text, 'Growth'::text, 'IPO'::text]));

-- Update stage values to Title Case
UPDATE startups 
SET stage = CASE 
  WHEN temp_stage = 'pre-seed' THEN 'Pre-Seed'
  WHEN temp_stage = 'seed' THEN 'Seed'
  WHEN temp_stage = 'series-a' THEN 'Series A'
  WHEN temp_stage = 'series-b' THEN 'Series B' 
  WHEN temp_stage = 'series-c' THEN 'Series C'
  WHEN temp_stage = 'growth' THEN 'Growth'
  WHEN temp_stage = 'ipo' THEN 'IPO'
  ELSE temp_stage
END
WHERE temp_stage IS NOT NULL;

-- Drop the temporary column
ALTER TABLE startups DROP COLUMN temp_stage;
-- Migrate data from old region field to new regions array
UPDATE startups 
SET regions = ARRAY[region]::text[]
WHERE region IS NOT NULL 
  AND region != '' 
  AND (regions IS NULL OR regions = '{}');

-- Add comment for clarity
COMMENT ON COLUMN startups.regions IS 'Primary regions field (array) - used for matchmaking. Replaces legacy region field.';
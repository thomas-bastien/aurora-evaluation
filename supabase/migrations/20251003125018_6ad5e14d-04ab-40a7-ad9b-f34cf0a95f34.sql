-- Migrate legacy region data to regions array
-- Copy singular 'region' to 'regions' array where regions is empty/null
UPDATE startups 
SET regions = ARRAY[region]
WHERE region IS NOT NULL 
  AND region != ''
  AND (regions IS NULL OR array_length(regions, 1) IS NULL OR array_length(regions, 1) = 0);
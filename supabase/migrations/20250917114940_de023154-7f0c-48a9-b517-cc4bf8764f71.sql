-- Clean up corrupted preferred_regions data by removing vertical names that got mixed in
UPDATE jurors 
SET preferred_regions = ARRAY(
  SELECT UNNEST(preferred_regions) 
  WHERE UNNEST(preferred_regions) IN (
    'Africa',
    'Asia Pacific (APAC)', 
    'Europe',
    'Latin America (LATAM)',
    'Middle East & North Africa (MENA)',
    'North America'
  )
)
WHERE preferred_regions IS NOT NULL;

-- Standardize vertical names to match Aurora taxonomy exactly
UPDATE jurors 
SET target_verticals = ARRAY(
  SELECT CASE 
    WHEN UNNEST(target_verticals) = 'Artificial Intelligence' THEN 'Artificial Intelligence (AI/ML)'
    WHEN UNNEST(target_verticals) = 'AI/ML' THEN 'Artificial Intelligence (AI/ML)'
    ELSE UNNEST(target_verticals)
  END
)
WHERE target_verticals IS NOT NULL;

-- Standardize stage names to match constants exactly
UPDATE jurors 
SET preferred_stages = ARRAY(
  SELECT CASE 
    WHEN UNNEST(preferred_stages) = 'Pre-Seed' THEN 'Pre-seed'
    ELSE UNNEST(preferred_stages)
  END
)
WHERE preferred_stages IS NOT NULL;
-- Standardize legacy region values in jurors table using temporary table approach
WITH region_mapping AS (
  SELECT 
    id,
    ARRAY_AGG(DISTINCT 
      CASE region_elem
        WHEN 'MENA (Middle East + Africa)' THEN 'Middle East & North Africa (MENA)'
        WHEN 'LATAM' THEN 'Latin America (LATAM)'
        WHEN 'NORAM' THEN 'North America'
        WHEN 'APAC (Asia + Pacific)' THEN 'Asia Pacific (APAC)'
        WHEN 'CEE (Central and Eastern Europe)' THEN 'Europe'
        WHEN 'GCC' THEN 'Middle East & North Africa (MENA)'
        ELSE region_elem
      END
    ) AS normalized_regions
  FROM jurors
  CROSS JOIN LATERAL unnest(COALESCE(preferred_regions, ARRAY[]::text[])) AS region_elem
  WHERE preferred_regions IS NOT NULL
  GROUP BY id
)
UPDATE jurors j
SET preferred_regions = rm.normalized_regions
FROM region_mapping rm
WHERE j.id = rm.id;

-- Standardize legacy stage values in jurors table
WITH stage_mapping AS (
  SELECT 
    id,
    ARRAY_AGG(DISTINCT 
      CASE stage_elem
        WHEN 'Pre-seed' THEN 'Pre-Seed'
        WHEN 'Preseed' THEN 'Pre-Seed'
        WHEN 'preseed' THEN 'Pre-Seed'
        WHEN 'pre-seed' THEN 'Pre-Seed'
        ELSE stage_elem
      END
    ) AS normalized_stages
  FROM jurors
  CROSS JOIN LATERAL unnest(COALESCE(preferred_stages, ARRAY[]::text[])) AS stage_elem
  WHERE preferred_stages IS NOT NULL
  GROUP BY id
)
UPDATE jurors j
SET preferred_stages = sm.normalized_stages
FROM stage_mapping sm
WHERE j.id = sm.id;

-- Standardize legacy region values in startups table
WITH region_mapping AS (
  SELECT 
    id,
    ARRAY_AGG(DISTINCT 
      CASE region_elem
        WHEN 'MENA (Middle East + Africa)' THEN 'Middle East & North Africa (MENA)'
        WHEN 'LATAM' THEN 'Latin America (LATAM)'
        WHEN 'NORAM' THEN 'North America'
        WHEN 'APAC (Asia + Pacific)' THEN 'Asia Pacific (APAC)'
        WHEN 'CEE (Central and Eastern Europe)' THEN 'Europe'
        WHEN 'GCC' THEN 'Middle East & North Africa (MENA)'
        ELSE region_elem
      END
    ) AS normalized_regions
  FROM startups
  CROSS JOIN LATERAL unnest(COALESCE(regions, ARRAY[]::text[])) AS region_elem
  WHERE regions IS NOT NULL
  GROUP BY id
)
UPDATE startups s
SET regions = rm.normalized_regions
FROM region_mapping rm
WHERE s.id = rm.id;

-- Standardize legacy stage values in startups table (normalize capitalization)
UPDATE startups
SET stage = CASE stage
  WHEN 'Pre-seed' THEN 'Pre-Seed'
  WHEN 'Preseed' THEN 'Pre-Seed'
  WHEN 'preseed' THEN 'Pre-Seed'
  WHEN 'pre-seed' THEN 'Pre-Seed'
  WHEN 'seed' THEN 'Seed'
  WHEN 'series-a' THEN 'Series A'
  WHEN 'series a' THEN 'Series A'
  WHEN 'seriesa' THEN 'Series A'
  WHEN 'series-b' THEN 'Series B'
  WHEN 'series b' THEN 'Series B'
  WHEN 'seriesb' THEN 'Series B'
  WHEN 'series-c' THEN 'Series C'
  WHEN 'series c' THEN 'Series C'
  WHEN 'seriesc' THEN 'Series C'
  WHEN 'growth' THEN 'Growth'
  WHEN 'ipo' THEN 'IPO'
  ELSE stage
END
WHERE stage IS NOT NULL
  AND stage IN (
    'Pre-seed', 'Preseed', 'preseed', 'pre-seed',
    'seed', 'series-a', 'series a', 'seriesa',
    'series-b', 'series b', 'seriesb',
    'series-c', 'series c', 'seriesc',
    'growth', 'ipo'
  );
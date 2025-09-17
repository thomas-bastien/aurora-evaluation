-- Clean up corrupted preferred_regions data by manually identifying and fixing the mixed data
-- First, let's clear all corrupted entries that contain vertical names instead of regions
UPDATE jurors 
SET preferred_regions = '{}' 
WHERE preferred_regions && ARRAY[
  'FinTech', 'HealthTech', 'PropTech', 'FoodTech', 'EdTech', 'CleanTech',
  'AI/ML', 'Artificial Intelligence', 'Web3', 'Blockchain', 'Crypto',
  'RetailTech', 'E-commerce', 'Enterprise Software', 'Cybersecurity',
  'Productivity Tools', 'Transportation', 'Mobility', 'Energy', 'Sustainability',
  'AgriTech', 'Food Tech', 'Media', 'Entertainment', 'AdTech', 'MarTech',
  'Real Estate', 'Education Technology', 'Logistics', 'Supply Chain',
  'Construction Tech', 'Space Technology', 'Semiconductors', 'Hardware',
  'Data Infrastructure', 'Analytics', 'Industrial Automation', 'Robotics',
  'Aerospace', 'Defense', 'Gaming', 'Visual Assets', 'SportTech', 'TravelTech'
];

-- Standardize vertical names to match Aurora taxonomy exactly
UPDATE jurors 
SET target_verticals = ARRAY_REPLACE(target_verticals, 'Artificial Intelligence', 'Artificial Intelligence (AI/ML)')
WHERE target_verticals @> ARRAY['Artificial Intelligence'];

UPDATE jurors 
SET target_verticals = ARRAY_REPLACE(target_verticals, 'AI/ML', 'Artificial Intelligence (AI/ML)')
WHERE target_verticals @> ARRAY['AI/ML'];

-- Standardize stage names to match constants exactly
UPDATE jurors 
SET preferred_stages = ARRAY_REPLACE(preferred_stages, 'Pre-Seed', 'Pre-seed')
WHERE preferred_stages @> ARRAY['Pre-Seed'];
-- Add regions array field to startups table for consistent matchmaking
ALTER TABLE public.startups 
ADD COLUMN regions TEXT[] DEFAULT '{}';

-- Create index for better performance on regions filtering
CREATE INDEX idx_startups_regions ON public.startups USING GIN(regions);

-- Populate regions field based on existing region/location data
UPDATE public.startups 
SET regions = CASE 
  WHEN region = 'Africa' THEN ARRAY['Africa']
  WHEN region = 'Asia Pacific (APAC)' THEN ARRAY['Asia Pacific (APAC)']
  WHEN region = 'Europe' THEN ARRAY['Europe']
  WHEN region = 'Latin America (LATAM)' THEN ARRAY['Latin America (LATAM)']
  WHEN region = 'Middle East & North Africa (MENA)' THEN ARRAY['Middle East & North Africa (MENA)']
  WHEN region = 'North America' THEN ARRAY['North America']
  WHEN location ILIKE '%uk%' OR location ILIKE '%united kingdom%' OR location ILIKE '%england%' OR location ILIKE '%scotland%' OR location ILIKE '%wales%' OR country ILIKE '%uk%' OR country ILIKE '%united kingdom%' THEN ARRAY['Europe']
  WHEN location ILIKE '%usa%' OR location ILIKE '%united states%' OR location ILIKE '%america%' OR country ILIKE '%usa%' OR country ILIKE '%united states%' THEN ARRAY['North America']
  WHEN location ILIKE '%canada%' OR country ILIKE '%canada%' THEN ARRAY['North America']
  WHEN location ILIKE '%germany%' OR location ILIKE '%france%' OR location ILIKE '%italy%' OR location ILIKE '%spain%' OR location ILIKE '%netherlands%' OR country ILIKE '%germany%' OR country ILIKE '%france%' THEN ARRAY['Europe']
  WHEN location ILIKE '%china%' OR location ILIKE '%japan%' OR location ILIKE '%singapore%' OR location ILIKE '%australia%' OR country ILIKE '%china%' OR country ILIKE '%japan%' THEN ARRAY['Asia Pacific (APAC)']
  WHEN location ILIKE '%brazil%' OR location ILIKE '%mexico%' OR location ILIKE '%argentina%' OR country ILIKE '%brazil%' OR country ILIKE '%mexico%' THEN ARRAY['Latin America (LATAM)']
  WHEN location ILIKE '%south africa%' OR location ILIKE '%nigeria%' OR location ILIKE '%kenya%' OR country ILIKE '%south africa%' OR country ILIKE '%nigeria%' THEN ARRAY['Africa']
  WHEN location ILIKE '%uae%' OR location ILIKE '%saudi%' OR location ILIKE '%israel%' OR country ILIKE '%uae%' OR country ILIKE '%saudi arabia%' THEN ARRAY['Middle East & North Africa (MENA)']
  ELSE ARRAY['Europe'] -- Default fallback
END
WHERE regions = '{}' OR regions IS NULL;
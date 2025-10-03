-- Add new array column
ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS business_model_arr TEXT[];

-- Populate from existing text column (safe casting)
UPDATE public.startups 
SET business_model_arr = (
  CASE 
    WHEN business_model IS NULL OR trim(business_model) = '' THEN NULL
    WHEN position(',' in business_model) > 0 THEN string_to_array(business_model, ',')
    ELSE ARRAY[business_model]
  END
);

-- Drop old text column and rename new one
ALTER TABLE public.startups DROP COLUMN IF EXISTS business_model;
ALTER TABLE public.startups RENAME COLUMN business_model_arr TO business_model;

-- Remove industry column completely
ALTER TABLE public.startups DROP COLUMN IF EXISTS industry;
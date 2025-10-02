-- Add 9 new columns to startups table for enhanced juror evaluation
ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS founder_first_name text,
ADD COLUMN IF NOT EXISTS founder_last_name text,
ADD COLUMN IF NOT EXISTS founder_linkedin text,
ADD COLUMN IF NOT EXISTS serviceable_obtainable_market text,
ADD COLUMN IF NOT EXISTS full_time_team_members integer,
ADD COLUMN IF NOT EXISTS paying_customers_per_year text,
ADD COLUMN IF NOT EXISTS countries_operating text,
ADD COLUMN IF NOT EXISTS countries_expansion_plan text,
ADD COLUMN IF NOT EXISTS business_risks_mitigation text;

-- Add comment to clarify that description field now stores value proposition
COMMENT ON COLUMN public.startups.description IS 'Primary value proposition and startup pitch description';
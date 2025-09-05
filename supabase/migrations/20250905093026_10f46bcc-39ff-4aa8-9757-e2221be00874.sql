-- Add preference fields to jurors table for better matchmaking
ALTER TABLE public.jurors 
ADD COLUMN preferred_regions text[] DEFAULT NULL,
ADD COLUMN target_verticals text[] DEFAULT NULL, 
ADD COLUMN preferred_stages text[] DEFAULT NULL,
ADD COLUMN linkedin_url text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.jurors.preferred_regions IS 'Multi-select regions for matchmaking (Africa, LATAM, Europe, MENA, North America, APAC)';
COMMENT ON COLUMN public.jurors.target_verticals IS 'Multi-select investment verticals from Aurora taxonomy';
COMMENT ON COLUMN public.jurors.preferred_stages IS 'Multi-select startup stages (Pre-seed, Seed, Series A, etc.)';
COMMENT ON COLUMN public.jurors.linkedin_url IS 'Optional LinkedIn profile URL for display';
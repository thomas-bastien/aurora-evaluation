-- Add new fields to startups table (skipping linkedin_url which already exists)
ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS total_investment_received BIGINT,
ADD COLUMN IF NOT EXISTS investment_currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS business_model TEXT,
ADD COLUMN IF NOT EXISTS verticals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS other_vertical_description TEXT;

-- Drop existing constraints if they exist and recreate them
ALTER TABLE public.startups DROP CONSTRAINT IF EXISTS check_business_model;
ALTER TABLE public.startups DROP CONSTRAINT IF EXISTS check_investment_amount;
ALTER TABLE public.startups DROP CONSTRAINT IF EXISTS check_linkedin_url;

-- Add check constraints for validation
ALTER TABLE public.startups 
ADD CONSTRAINT check_business_model CHECK (
  business_model IS NULL OR 
  business_model IN ('B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'Hardware', 'Services', 'Platform')
);

ALTER TABLE public.startups 
ADD CONSTRAINT check_investment_amount CHECK (
  total_investment_received IS NULL OR total_investment_received >= 0
);

ALTER TABLE public.startups 
ADD CONSTRAINT check_linkedin_url CHECK (
  linkedin_url IS NULL OR 
  linkedin_url ~* '^https?://.+'
);
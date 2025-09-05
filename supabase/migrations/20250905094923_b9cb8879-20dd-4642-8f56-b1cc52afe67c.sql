-- Add new fields to startups table
ALTER TABLE public.startups 
ADD COLUMN linkedin_url TEXT,
ADD COLUMN total_investment_received BIGINT,
ADD COLUMN investment_currency TEXT DEFAULT 'GBP',
ADD COLUMN business_model TEXT,
ADD COLUMN verticals TEXT[] DEFAULT '{}',
ADD COLUMN other_vertical_description TEXT;

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
  linkedin_url ~* '^https?://.*linkedin\.com/.*'
);
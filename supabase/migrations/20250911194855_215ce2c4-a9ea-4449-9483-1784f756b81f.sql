-- Migrate expertise and investment_stages from profiles to jurors table
-- First, update jurors table with data from profiles where user_id matches
UPDATE jurors 
SET 
  preferred_regions = profiles.expertise,
  preferred_stages = profiles.investment_stages
FROM profiles 
WHERE jurors.user_id = profiles.user_id 
  AND (profiles.expertise IS NOT NULL OR profiles.investment_stages IS NOT NULL);

-- Clear the migrated fields from profiles table
UPDATE profiles 
SET 
  expertise = NULL,
  investment_stages = NULL 
WHERE expertise IS NOT NULL OR investment_stages IS NOT NULL;
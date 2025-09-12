-- Remove legacy columns from profiles table since juror data is now in jurors table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS expertise,
DROP COLUMN IF EXISTS investment_stages;
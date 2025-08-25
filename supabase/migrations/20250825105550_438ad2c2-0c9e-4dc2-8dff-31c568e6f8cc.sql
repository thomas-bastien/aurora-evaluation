-- Drop existing evaluation columns and add new evaluation structure
-- First, add new columns for the updated evaluation criteria

-- Add new fields to support startup overview
ALTER TABLE startups ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS country text;

-- Drop the old evaluation columns (scores will be stored differently)
ALTER TABLE evaluations DROP COLUMN IF EXISTS team_score;
ALTER TABLE evaluations DROP COLUMN IF EXISTS product_score;
ALTER TABLE evaluations DROP COLUMN IF EXISTS market_score;
ALTER TABLE evaluations DROP COLUMN IF EXISTS traction_score;
ALTER TABLE evaluations DROP COLUMN IF EXISTS financials_score;
ALTER TABLE evaluations DROP COLUMN IF EXISTS team_feedback;
ALTER TABLE evaluations DROP COLUMN IF EXISTS product_feedback;
ALTER TABLE evaluations DROP COLUMN IF EXISTS market_feedback;
ALTER TABLE evaluations DROP COLUMN IF EXISTS traction_feedback;
ALTER TABLE evaluations DROP COLUMN IF EXISTS financials_feedback;

-- Add new JSONB column to store all evaluation criteria scores
ALTER TABLE evaluations ADD COLUMN criteria_scores jsonb DEFAULT '{}';

-- Add new text fields for open questions
ALTER TABLE evaluations ADD COLUMN strengths text[];
ALTER TABLE evaluations ADD COLUMN improvement_areas text;
ALTER TABLE evaluations ADD COLUMN pitch_development_aspects text;
ALTER TABLE evaluations ADD COLUMN wants_pitch_session boolean DEFAULT false;

-- Add guided feedback as array of selected options
ALTER TABLE evaluations ADD COLUMN guided_feedback integer[];

-- Keep existing overall_notes, recommendation, and investment_amount columns
-- Update the constraint for recommendation to be nullable for drafts
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS evaluations_recommendation_check;
ALTER TABLE evaluations ADD CONSTRAINT evaluations_recommendation_check 
  CHECK (recommendation IS NULL OR recommendation IN ('invest', 'maybe', 'pass'));

-- Update the overall_score to be calculated differently (will be average of section scores)
-- Keep the existing overall_score column as it works fine
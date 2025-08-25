-- Remove existing check constraints on scoring fields
ALTER TABLE evaluations 
  DROP CONSTRAINT IF EXISTS evaluations_overall_score_check;

-- Add new floating point constraints for overall_score (0-10)
ALTER TABLE evaluations 
  ADD CONSTRAINT evaluations_overall_score_check 
  CHECK (overall_score >= 0 AND overall_score <= 10);

-- Note: criteria_scores is jsonb so we'll handle validation in the application layer
-- The criteria_scores field will store floating point values 0-10 for each criterion
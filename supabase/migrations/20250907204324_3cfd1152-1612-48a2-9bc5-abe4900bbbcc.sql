-- Fix foreign key relationship between pitching_evaluations and jurors
-- The evaluator_id should reference jurors.user_id (which links to auth.users)

-- Add foreign key constraint for pitching_evaluations.evaluator_id -> jurors.user_id
ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_evaluator_juror 
FOREIGN KEY (evaluator_id) REFERENCES auth.users(id);
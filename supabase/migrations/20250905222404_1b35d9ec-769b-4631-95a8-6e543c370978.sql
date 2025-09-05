-- Fix foreign key constraint for screening_evaluations.evaluator_id
-- It should reference auth.users.id instead of jurors.id since the app uses auth user IDs

-- Drop the existing foreign key constraint
ALTER TABLE public.screening_evaluations 
DROP CONSTRAINT IF EXISTS fk_screening_evaluations_evaluator;

-- Add the correct foreign key constraint
ALTER TABLE public.screening_evaluations 
ADD CONSTRAINT fk_screening_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Do the same for pitching_evaluations
ALTER TABLE public.pitching_evaluations 
DROP CONSTRAINT IF EXISTS fk_pitching_evaluations_evaluator;

ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
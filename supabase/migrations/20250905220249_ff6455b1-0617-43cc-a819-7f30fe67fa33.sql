-- Clean up orphaned data before adding foreign keys

-- Remove screening_evaluations with non-existent evaluator_ids
DELETE FROM screening_evaluations 
WHERE evaluator_id IN (
  '6bf0f6cd-e5f3-4e66-87d4-c6bd122d7305',
  '3c89c56b-b9bd-41e1-82db-996d0d045ae8'
);

-- Now add the foreign key constraints
ALTER TABLE public.screening_assignments 
ADD CONSTRAINT fk_screening_assignments_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.screening_assignments 
ADD CONSTRAINT fk_screening_assignments_juror 
FOREIGN KEY (juror_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

ALTER TABLE public.screening_evaluations 
ADD CONSTRAINT fk_screening_evaluations_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.screening_evaluations 
ADD CONSTRAINT fk_screening_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_assignments 
ADD CONSTRAINT fk_pitching_assignments_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_assignments 
ADD CONSTRAINT fk_pitching_assignments_juror 
FOREIGN KEY (juror_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES public.jurors(id) ON DELETE CASCADE;
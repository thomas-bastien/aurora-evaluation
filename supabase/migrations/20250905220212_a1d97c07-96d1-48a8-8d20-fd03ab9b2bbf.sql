-- Add missing foreign keys for new round-specific tables

-- Add foreign key constraints for screening_assignments
ALTER TABLE public.screening_assignments 
ADD CONSTRAINT fk_screening_assignments_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.screening_assignments 
ADD CONSTRAINT fk_screening_assignments_juror 
FOREIGN KEY (juror_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

-- Add foreign key constraints for screening_evaluations  
ALTER TABLE public.screening_evaluations 
ADD CONSTRAINT fk_screening_evaluations_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.screening_evaluations 
ADD CONSTRAINT fk_screening_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

-- Add foreign key constraints for pitching_assignments
ALTER TABLE public.pitching_assignments 
ADD CONSTRAINT fk_pitching_assignments_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_assignments 
ADD CONSTRAINT fk_pitching_assignments_juror 
FOREIGN KEY (juror_id) REFERENCES public.jurors(id) ON DELETE CASCADE;

-- Add foreign key constraints for pitching_evaluations
ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_startup 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.pitching_evaluations 
ADD CONSTRAINT fk_pitching_evaluations_evaluator 
FOREIGN KEY (evaluator_id) REFERENCES public.jurors(id) ON DELETE CASCADE;
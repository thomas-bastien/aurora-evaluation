-- Add foreign key constraints to startup_assignments table
ALTER TABLE public.startup_assignments 
ADD CONSTRAINT startup_assignments_startup_id_fkey 
FOREIGN KEY (startup_id) REFERENCES public.startups(id) ON DELETE CASCADE;

ALTER TABLE public.startup_assignments 
ADD CONSTRAINT startup_assignments_juror_id_fkey 
FOREIGN KEY (juror_id) REFERENCES public.jurors(id) ON DELETE CASCADE;
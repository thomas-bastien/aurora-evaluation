-- Clean up deprecated tables that are no longer used

-- Drop the old evaluations and startup_assignments tables
-- These have been replaced by round-specific tables:
-- screening_evaluations, pitching_evaluations, screening_assignments, pitching_assignments

DROP TABLE IF EXISTS public.evaluations;
DROP TABLE IF EXISTS public.startup_assignments;

-- Also remove unused session-related tables if they exist and are not being used
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.startup_sessions; 
DROP TABLE IF EXISTS public.vc_sessions;
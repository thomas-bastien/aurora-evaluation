-- Clean up only the deprecated tables we've fully migrated away from

-- First, drop the old evaluations and startup_assignments tables
-- These have been replaced by round-specific tables
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.startup_assignments CASCADE;

-- Leave session tables for now since they have dependencies
-- They can be cleaned up later if confirmed unused
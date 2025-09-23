-- Fix the matching_status constraint to include the new status
ALTER TABLE public.cm_calendar_invitations 
DROP CONSTRAINT IF EXISTS cm_calendar_invitations_matching_status_check;

ALTER TABLE public.cm_calendar_invitations 
ADD CONSTRAINT cm_calendar_invitations_matching_status_check 
CHECK (matching_status IN ('auto_matched', 'manual_matched', 'unmatched', 'pending_cm_review', 'conflict_detected', 'multiple_matches'));
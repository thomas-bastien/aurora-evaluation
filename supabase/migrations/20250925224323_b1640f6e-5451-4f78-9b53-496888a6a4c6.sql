-- Fix matching_status constraint to include rescheduled and cancelled values
ALTER TABLE cm_calendar_invitations 
DROP CONSTRAINT IF EXISTS cm_calendar_invitations_matching_status_check;

ALTER TABLE cm_calendar_invitations 
ADD CONSTRAINT cm_calendar_invitations_matching_status_check 
CHECK (matching_status IN ('auto_matched', 'manual_matched', 'pending_cm_review', 'unmatched', 'rescheduled', 'cancelled'));
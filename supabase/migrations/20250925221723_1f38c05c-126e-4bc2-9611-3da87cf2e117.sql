-- Add 'in_review' as a valid status for cm_calendar_invitations
ALTER TABLE cm_calendar_invitations 
DROP CONSTRAINT IF EXISTS cm_calendar_invitations_status_check;

ALTER TABLE cm_calendar_invitations 
ADD CONSTRAINT cm_calendar_invitations_status_check 
CHECK (status IN ('needs_assignment', 'pending', 'in_review', 'scheduled', 'completed', 'cancelled'));
-- Add fields to cm_calendar_invitations for unmatched meeting tracking
ALTER TABLE cm_calendar_invitations 
ADD COLUMN matching_status text DEFAULT 'auto_matched',
ADD COLUMN matching_errors jsonb DEFAULT '[]'::jsonb,
ADD COLUMN manual_assignment_needed boolean DEFAULT false;

-- Add index for efficient querying of unmatched meetings
CREATE INDEX idx_cm_calendar_invitations_matching_status ON cm_calendar_invitations(matching_status);
CREATE INDEX idx_cm_calendar_invitations_manual_needed ON cm_calendar_invitations(manual_assignment_needed);
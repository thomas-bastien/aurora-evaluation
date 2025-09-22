-- Add new fields to cm_calendar_invitations for enhanced lifecycle tracking
ALTER TABLE public.cm_calendar_invitations 
ADD COLUMN event_method text DEFAULT 'REQUEST',
ADD COLUMN sequence_number integer DEFAULT 0,
ADD COLUMN previous_event_date timestamp with time zone,
ADD COLUMN lifecycle_history jsonb DEFAULT '[]'::jsonb;

-- Add indexes for better performance
CREATE INDEX idx_cm_calendar_invitations_event_method ON public.cm_calendar_invitations(event_method);
CREATE INDEX idx_cm_calendar_invitations_calendar_uid ON public.cm_calendar_invitations(calendar_uid);
CREATE INDEX idx_cm_calendar_invitations_sequence ON public.cm_calendar_invitations(sequence_number);

-- Update status column to include new lifecycle statuses
ALTER TABLE public.cm_calendar_invitations 
DROP CONSTRAINT IF EXISTS cm_calendar_invitations_status_check;

ALTER TABLE public.cm_calendar_invitations 
ADD CONSTRAINT cm_calendar_invitations_status_check 
CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'updated', 'conflict'));

-- Update matching_status to include new types
ALTER TABLE public.cm_calendar_invitations 
DROP CONSTRAINT IF EXISTS cm_calendar_invitations_matching_status_check;

ALTER TABLE public.cm_calendar_invitations 
ADD CONSTRAINT cm_calendar_invitations_matching_status_check 
CHECK (matching_status IN ('auto_matched', 'manual_matched', 'unmatched', 'rescheduled', 'cancelled', 'conflict'));
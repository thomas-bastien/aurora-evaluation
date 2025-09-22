-- Create cm_calendar_invitations table to track all calendar invitations for Community Manager
CREATE TABLE public.cm_calendar_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
  juror_id UUID REFERENCES public.jurors(id) ON DELETE CASCADE,
  pitching_assignment_id UUID REFERENCES public.pitching_assignments(id) ON DELETE CASCADE,
  calendar_uid TEXT UNIQUE,
  event_summary TEXT,
  event_description TEXT,
  event_location TEXT,
  event_start_date TIMESTAMP WITH TIME ZONE,
  event_end_date TIMESTAMP WITH TIME ZONE,
  attendee_emails JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'rescheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cm_calendar_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for cm_calendar_invitations
CREATE POLICY "Admins can manage all cm_calendar_invitations" 
ON public.cm_calendar_invitations 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create index for performance
CREATE INDEX idx_cm_calendar_invitations_startup_juror ON public.cm_calendar_invitations(startup_id, juror_id);
CREATE INDEX idx_cm_calendar_invitations_calendar_uid ON public.cm_calendar_invitations(calendar_uid);
CREATE INDEX idx_cm_calendar_invitations_status ON public.cm_calendar_invitations(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cm_calendar_invitations_updated_at
BEFORE UPDATE ON public.cm_calendar_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
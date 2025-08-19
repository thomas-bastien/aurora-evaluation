-- Create startup_assignments table for juror-startup assignments
CREATE TABLE public.startup_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  juror_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed')),
  UNIQUE(startup_id, juror_id)
);

-- Enable Row Level Security
ALTER TABLE public.startup_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for startup_assignments
CREATE POLICY "Admins can manage all startup_assignments" 
ON public.startup_assignments 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view their own assignments" 
ON public.startup_assignments 
FOR SELECT 
USING (get_current_user_role() = 'vc' AND juror_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_startup_assignments_updated_at
BEFORE UPDATE ON public.startup_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_startup_assignments_startup_id ON public.startup_assignments(startup_id);
CREATE INDEX idx_startup_assignments_juror_id ON public.startup_assignments(juror_id);
CREATE INDEX idx_startup_assignments_status ON public.startup_assignments(status);
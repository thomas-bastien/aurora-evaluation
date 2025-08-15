-- Create jurors table
CREATE TABLE public.jurors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jurors ENABLE ROW LEVEL SECURITY;

-- Create policies for jurors table
CREATE POLICY "Admins can manage all jurors" 
ON public.jurors 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Jurors can view all jurors" 
ON public.jurors 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jurors_updated_at
BEFORE UPDATE ON public.jurors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample juror data for testing
INSERT INTO public.jurors (name, email, job_title, company) VALUES
('Sarah Johnson', 'sarah.johnson@techventures.com', 'Senior Partner', 'Tech Ventures'),
('Michael Chen', 'michael.chen@alphavc.com', 'Investment Director', 'Alpha VC'),
('Emily Rodriguez', 'emily.rodriguez@innovationfund.com', 'Principal', 'Innovation Fund'),
('David Kim', 'david.kim@nexuscapital.com', 'Partner', 'Nexus Capital'),
('Lisa Thompson', 'lisa.thompson@growthequity.com', 'Managing Director', 'Growth Equity Partners');
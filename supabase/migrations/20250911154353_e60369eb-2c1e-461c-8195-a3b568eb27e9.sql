-- Create cohort_settings table for deadline management
CREATE TABLE public.cohort_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_name text NOT NULL DEFAULT 'Aurora Tech Awards 2025 Cohort',
  screening_deadline date,
  pitching_deadline date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on cohort_settings
ALTER TABLE public.cohort_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for cohort_settings
CREATE POLICY "Admins can manage all cohort settings" 
ON public.cohort_settings 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view cohort settings" 
ON public.cohort_settings 
FOR SELECT 
USING (get_current_user_role() IN ('admin', 'vc'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cohort_settings_updated_at
BEFORE UPDATE ON public.cohort_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default cohort settings
INSERT INTO public.cohort_settings (cohort_name, screening_deadline, pitching_deadline) 
VALUES (
  'Aurora Tech Awards 2025 Cohort',
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '60 days'
);
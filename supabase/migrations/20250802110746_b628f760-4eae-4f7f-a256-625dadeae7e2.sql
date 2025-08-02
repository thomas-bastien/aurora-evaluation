-- Create sessions table for managing evaluation sessions
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text,
  description text,
  scheduled_date date,
  time_slot text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  vc_participants integer DEFAULT 0,
  completion_rate integer DEFAULT 0,
  avg_score numeric(3,1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create startup_sessions table for many-to-many relationship
CREATE TABLE public.startup_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  order_index integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(startup_id, session_id)
);

-- Create vc_sessions table for many-to-many relationship between VCs and sessions
CREATE TABLE public.vc_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vc_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'participating', 'completed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(vc_id, session_id)
);

-- Create pitch_requests table for managing startup pitch meetings
CREATE TABLE public.pitch_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  vc_id uuid NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'declined')),
  request_date timestamp with time zone DEFAULT now(),
  pitch_date timestamp with time zone,
  meeting_notes text,
  calendly_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vc_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sessions
CREATE POLICY "Admins can manage all sessions" ON public.sessions
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view sessions they're assigned to" ON public.sessions
  FOR SELECT USING (
    get_current_user_role() = 'vc' AND 
    id IN (SELECT session_id FROM public.vc_sessions WHERE vc_id = auth.uid())
  );

-- Create RLS policies for startup_sessions
CREATE POLICY "Admins can manage all startup_sessions" ON public.startup_sessions
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view startup_sessions for their sessions" ON public.startup_sessions
  FOR SELECT USING (
    get_current_user_role() = 'vc' AND 
    session_id IN (SELECT session_id FROM public.vc_sessions WHERE vc_id = auth.uid())
  );

-- Create RLS policies for vc_sessions
CREATE POLICY "Admins can manage all vc_sessions" ON public.vc_sessions
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view their own session assignments" ON public.vc_sessions
  FOR SELECT USING (get_current_user_role() = 'vc' AND vc_id = auth.uid());

-- Create RLS policies for pitch_requests
CREATE POLICY "Admins can manage all pitch_requests" ON public.pitch_requests
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view and manage their own pitch requests" ON public.pitch_requests
  FOR ALL USING (get_current_user_role() = 'vc' AND vc_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pitch_requests_updated_at
  BEFORE UPDATE ON public.pitch_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample sessions data
INSERT INTO public.sessions (name, category, description, scheduled_date, time_slot, status, vc_participants, completion_rate, avg_score) VALUES
  ('Session 1: AI & ML Startups', 'AI/ML', 'Focus on artificial intelligence and machine learning startups', '2024-01-10', '2:00 PM - 4:00 PM', 'completed', 12, 100, 8.2),
  ('Session 2: Fintech Solutions', 'Fintech', 'Financial technology and payment solutions', '2024-01-12', '10:00 AM - 12:00 PM', 'completed', 12, 100, 7.9),
  ('Session 3: Healthcare Technology', 'HealthTech', 'Digital health and medical technology startups', '2024-01-15', '3:00 PM - 5:00 PM', 'in-progress', 12, 75, 8.1),
  ('Session 4: Enterprise SaaS', 'SaaS', 'Business software and enterprise solutions', '2024-01-20', '2:00 PM - 4:00 PM', 'scheduled', 12, 0, NULL);

-- Add additional fields to profiles table for VC preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investment_stages text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_link text;
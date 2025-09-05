-- Create rounds table to track system state
CREATE TABLE public.rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create screening evaluations table
CREATE TABLE public.screening_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL,
  evaluator_id uuid NOT NULL,
  overall_score numeric,
  investment_amount bigint,
  criteria_scores jsonb DEFAULT '{}'::jsonb,
  wants_pitch_session boolean DEFAULT false,
  status text DEFAULT 'draft'::text,
  pitch_development_aspects text,
  strengths text[],
  overall_notes text,
  recommendation text,
  improvement_areas text,
  guided_feedback text[],
  last_modified_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pitching evaluations table
CREATE TABLE public.pitching_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL,
  evaluator_id uuid NOT NULL,
  overall_score numeric,
  investment_amount bigint,
  criteria_scores jsonb DEFAULT '{}'::jsonb,
  wants_pitch_session boolean DEFAULT false,
  status text DEFAULT 'draft'::text,
  pitch_development_aspects text,
  strengths text[],
  overall_notes text,
  recommendation text,
  improvement_areas text,
  guided_feedback text[],
  last_modified_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create screening assignments table
CREATE TABLE public.screening_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL,
  juror_id uuid NOT NULL,
  status text DEFAULT 'assigned'::text,
  assigned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create pitching assignments table
CREATE TABLE public.pitching_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL,
  juror_id uuid NOT NULL,
  status text DEFAULT 'assigned'::text,
  assigned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitching_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitching_assignments ENABLE ROW LEVEL SECURITY;

-- Create security functions
CREATE OR REPLACE FUNCTION public.get_current_round()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.rounds WHERE status = 'active' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_modify_round(round_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status = 'active' FROM public.rounds WHERE name = round_name;
$$;

-- RLS policies for rounds
CREATE POLICY "Admins can manage all rounds" ON public.rounds
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view rounds" ON public.rounds
  FOR SELECT USING (get_current_user_role() = 'vc');

-- RLS policies for screening_evaluations
CREATE POLICY "Admins can view all screening evaluations" ON public.screening_evaluations
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update any screening evaluation" ON public.screening_evaluations
  FOR UPDATE USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete any screening evaluation" ON public.screening_evaluations
  FOR DELETE USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can insert their own screening evaluations" ON public.screening_evaluations
  FOR INSERT WITH CHECK (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can view their own screening evaluations" ON public.screening_evaluations
  FOR SELECT USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can update their own screening evaluations" ON public.screening_evaluations
  FOR UPDATE USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can delete their own draft screening evaluations" ON public.screening_evaluations
  FOR DELETE USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid() AND status = 'draft');

-- RLS policies for pitching_evaluations
CREATE POLICY "Admins can view all pitching evaluations" ON public.pitching_evaluations
  FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update any pitching evaluation" ON public.pitching_evaluations
  FOR UPDATE USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete any pitching evaluation" ON public.pitching_evaluations
  FOR DELETE USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can insert their own pitching evaluations" ON public.pitching_evaluations
  FOR INSERT WITH CHECK (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can view their own pitching evaluations" ON public.pitching_evaluations
  FOR SELECT USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can update their own pitching evaluations" ON public.pitching_evaluations
  FOR UPDATE USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid());

CREATE POLICY "VCs can delete their own draft pitching evaluations" ON public.pitching_evaluations
  FOR DELETE USING (get_current_user_role() = 'vc' AND evaluator_id = auth.uid() AND status = 'draft');

-- RLS policies for screening_assignments
CREATE POLICY "Admins can manage all screening assignments" ON public.screening_assignments
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view all screening assignments" ON public.screening_assignments
  FOR SELECT USING (get_current_user_role() = 'vc');

-- RLS policies for pitching_assignments
CREATE POLICY "Admins can manage all pitching assignments" ON public.pitching_assignments
  FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view all pitching assignments" ON public.pitching_assignments
  FOR SELECT USING (get_current_user_role() = 'vc');

-- Create triggers for updated_at
CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON public.rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screening_evaluations_updated_at
  BEFORE UPDATE ON public.screening_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pitching_evaluations_updated_at
  BEFORE UPDATE ON public.pitching_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screening_assignments_updated_at
  BEFORE UPDATE ON public.screening_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pitching_assignments_updated_at
  BEFORE UPDATE ON public.pitching_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_screening_evaluation_modified_time
  BEFORE UPDATE ON public.screening_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_evaluation_modified_time();

CREATE TRIGGER update_pitching_evaluation_modified_time
  BEFORE UPDATE ON public.pitching_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_evaluation_modified_time();

-- Initialize rounds table
INSERT INTO public.rounds (name, status, started_at)
VALUES 
  ('screening', 'active', now()),
  ('pitching', 'pending', NULL);

-- Migrate existing evaluations to screening_evaluations
INSERT INTO public.screening_evaluations (
  startup_id, evaluator_id, overall_score, investment_amount, criteria_scores,
  wants_pitch_session, status, pitch_development_aspects, strengths,
  overall_notes, recommendation, improvement_areas, guided_feedback,
  last_modified_at, created_at, updated_at
)
SELECT 
  startup_id, evaluator_id, overall_score, investment_amount, criteria_scores,
  wants_pitch_session, status, pitch_development_aspects, strengths,
  overall_notes, recommendation, improvement_areas, guided_feedback,
  last_modified_at, created_at, updated_at
FROM public.evaluations;

-- Migrate existing startup_assignments to screening_assignments
INSERT INTO public.screening_assignments (
  startup_id, juror_id, status, assigned_by, created_at, updated_at
)
SELECT 
  startup_id, juror_id, status, assigned_by, created_at, updated_at
FROM public.startup_assignments;
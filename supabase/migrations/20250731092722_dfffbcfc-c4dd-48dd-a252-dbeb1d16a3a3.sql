-- Create startups table
CREATE TABLE public.startups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  industry text,
  stage text CHECK (stage IN ('pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth', 'ipo')),
  website text,
  location text,
  founded_year integer,
  team_size integer,
  funding_raised bigint, -- in cents to avoid decimal issues
  funding_goal bigint, -- in cents
  pitch_deck_url text,
  demo_url text,
  contact_email text,
  contact_phone text,
  founder_names text[], -- array of founder names
  key_metrics jsonb, -- flexible storage for metrics like MRR, ARR, CAC, etc.
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under-review', 'shortlisted', 'rejected', 'invested')),
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create evaluations table
CREATE TABLE public.evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  -- Scoring criteria (1-10 scale)
  team_score integer CHECK (team_score >= 1 AND team_score <= 10),
  product_score integer CHECK (product_score >= 1 AND product_score <= 10),
  market_score integer CHECK (market_score >= 1 AND market_score <= 10),
  traction_score integer CHECK (traction_score >= 1 AND traction_score <= 10),
  financials_score integer CHECK (financials_score >= 1 AND financials_score <= 10),
  
  -- Overall assessment
  overall_score numeric(3,1) CHECK (overall_score >= 1.0 AND overall_score <= 10.0),
  recommendation text CHECK (recommendation IN ('invest', 'maybe', 'pass')),
  
  -- Detailed feedback
  team_feedback text,
  product_feedback text,
  market_feedback text,
  traction_feedback text,
  financials_feedback text,
  overall_notes text,
  
  -- Investment details
  investment_amount bigint, -- suggested investment in cents
  
  -- Evaluation status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one evaluation per VC per startup
  UNIQUE(startup_id, evaluator_id)
);

-- Create indexes for better performance
CREATE INDEX idx_startups_status ON public.startups(status);
CREATE INDEX idx_startups_industry ON public.startups(industry);
CREATE INDEX idx_startups_stage ON public.startups(stage);
CREATE INDEX idx_startups_created_by ON public.startups(created_by);
CREATE INDEX idx_evaluations_startup_id ON public.evaluations(startup_id);
CREATE INDEX idx_evaluations_evaluator_id ON public.evaluations(evaluator_id);
CREATE INDEX idx_evaluations_status ON public.evaluations(status);

-- Enable Row Level Security
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = auth.uid();
$$;

-- RLS Policies for startups table
CREATE POLICY "Admins can view all startups"
  ON public.startups FOR SELECT
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "VCs can view startups under review"
  ON public.startups FOR SELECT
  USING (
    public.get_current_user_role() = 'vc' AND 
    status IN ('under-review', 'shortlisted')
  );

CREATE POLICY "Admins can insert startups"
  ON public.startups FOR INSERT
  WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all startups"
  ON public.startups FOR UPDATE
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete startups"
  ON public.startups FOR DELETE
  USING (public.get_current_user_role() = 'admin');

-- RLS Policies for evaluations table
CREATE POLICY "Admins can view all evaluations"
  ON public.evaluations FOR SELECT
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "VCs can view their own evaluations"
  ON public.evaluations FOR SELECT
  USING (
    public.get_current_user_role() = 'vc' AND 
    evaluator_id = auth.uid()
  );

CREATE POLICY "VCs can insert their own evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'vc' AND 
    evaluator_id = auth.uid()
  );

CREATE POLICY "VCs can update their own draft evaluations"
  ON public.evaluations FOR UPDATE
  USING (
    public.get_current_user_role() = 'vc' AND 
    evaluator_id = auth.uid() AND 
    status = 'draft'
  );

CREATE POLICY "Admins can update any evaluation"
  ON public.evaluations FOR UPDATE
  USING (public.get_current_user_role() = 'admin');

CREATE POLICY "VCs can delete their own draft evaluations"
  ON public.evaluations FOR DELETE
  USING (
    public.get_current_user_role() = 'vc' AND 
    evaluator_id = auth.uid() AND 
    status = 'draft'
  );

CREATE POLICY "Admins can delete any evaluation"
  ON public.evaluations FOR DELETE
  USING (public.get_current_user_role() = 'admin');

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON public.startups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
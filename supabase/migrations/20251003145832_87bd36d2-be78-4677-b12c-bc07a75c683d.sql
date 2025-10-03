-- Create juror conflicts table
CREATE TABLE IF NOT EXISTS public.juror_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  juror_id UUID NOT NULL REFERENCES public.jurors(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('investment', 'employment', 'advisory', 'personal', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(juror_id, startup_id)
);

-- Enable RLS on juror_conflicts
ALTER TABLE public.juror_conflicts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all conflicts
CREATE POLICY "Admins can manage all juror conflicts"
ON public.juror_conflicts
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- VCs can view and manage their own conflicts
CREATE POLICY "VCs can manage their own conflicts"
ON public.juror_conflicts
FOR ALL
TO authenticated
USING (
  get_current_user_role() = 'vc' 
  AND juror_id IN (SELECT id FROM public.jurors WHERE user_id = auth.uid())
);

-- Add new fields to jurors table
ALTER TABLE public.jurors 
ADD COLUMN IF NOT EXISTS thesis_keywords TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fund_focus TEXT;

-- Create matchmaking config table
CREATE TABLE IF NOT EXISTS public.matchmaking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_name TEXT NOT NULL UNIQUE,
  vertical_weight NUMERIC NOT NULL DEFAULT 40,
  stage_weight NUMERIC NOT NULL DEFAULT 20,
  region_weight NUMERIC NOT NULL DEFAULT 20,
  thesis_weight NUMERIC NOT NULL DEFAULT 10,
  load_penalty_weight NUMERIC NOT NULL DEFAULT 10,
  target_jurors_per_startup INTEGER NOT NULL DEFAULT 3,
  top_k_per_juror INTEGER NOT NULL DEFAULT 3,
  use_ai_enhancement BOOLEAN NOT NULL DEFAULT true,
  deterministic_seed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_weights CHECK (
    vertical_weight + stage_weight + region_weight + thesis_weight + load_penalty_weight = 100
  )
);

-- Enable RLS on matchmaking_config
ALTER TABLE public.matchmaking_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage all matchmaking configs
CREATE POLICY "Admins can manage all matchmaking configs"
ON public.matchmaking_config
FOR ALL
TO authenticated
USING (get_current_user_role() = 'admin');

-- VCs can view matchmaking configs
CREATE POLICY "VCs can view matchmaking configs"
ON public.matchmaking_config
FOR SELECT
TO authenticated
USING (get_current_user_role() IN ('admin', 'vc'));

-- Insert default configs for screening and pitching rounds
INSERT INTO public.matchmaking_config (round_name) 
VALUES ('screening'), ('pitching')
ON CONFLICT (round_name) DO NOTHING;

-- Add updated_at trigger for juror_conflicts
CREATE TRIGGER update_juror_conflicts_updated_at
BEFORE UPDATE ON public.juror_conflicts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for matchmaking_config
CREATE TRIGGER update_matchmaking_config_updated_at
BEFORE UPDATE ON public.matchmaking_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
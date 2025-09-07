-- Create startup_round_statuses table for round-scoped status tracking
CREATE TABLE public.startup_round_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id, round_id)
);

-- Enable RLS
ALTER TABLE public.startup_round_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for startup_round_statuses
CREATE POLICY "Admins can manage all startup round statuses"
  ON public.startup_round_statuses
  FOR ALL
  USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "VCs can view all startup round statuses"
  ON public.startup_round_statuses
  FOR SELECT
  USING (get_current_user_role() = 'vc'::text);

-- Create trigger for updated_at
CREATE TRIGGER update_startup_round_statuses_updated_at
  BEFORE UPDATE ON public.startup_round_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get startup status for a specific round
CREATE OR REPLACE FUNCTION public.get_startup_status_for_round(
  startup_uuid UUID,
  round_name TEXT
)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT srs.status
  FROM startup_round_statuses srs
  JOIN rounds r ON srs.round_id = r.id
  WHERE srs.startup_id = startup_uuid 
    AND r.name = round_name
  LIMIT 1;
$$;

-- Helper function to update startup status for a specific round
CREATE OR REPLACE FUNCTION public.update_startup_status_for_round(
  startup_uuid UUID,
  round_name TEXT,
  new_status TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO startup_round_statuses (startup_id, round_id, status)
  SELECT startup_uuid, r.id, new_status
  FROM rounds r
  WHERE r.name = round_name
  ON CONFLICT (startup_id, round_id)
  DO UPDATE SET 
    status = EXCLUDED.status,
    updated_at = now();
$$;

-- Migrate existing data from startups.status to round-specific statuses
-- First, create default entries for all startups in both rounds
DO $$
DECLARE
  screening_round_id UUID;
  pitching_round_id UUID;
BEGIN
  -- Get round IDs
  SELECT id INTO screening_round_id FROM rounds WHERE name = 'screening' LIMIT 1;
  SELECT id INTO pitching_round_id FROM rounds WHERE name = 'pitching' LIMIT 1;

  -- If rounds exist, migrate data
  IF screening_round_id IS NOT NULL AND pitching_round_id IS NOT NULL THEN
    -- Migrate screening round statuses based on existing startup.status
    INSERT INTO startup_round_statuses (startup_id, round_id, status)
    SELECT 
      s.id,
      screening_round_id,
      CASE 
        WHEN s.status = 'shortlisted' THEN 'selected'
        WHEN s.status = 'rejected' THEN 'rejected'
        ELSE 'pending'
      END
    FROM startups s
    ON CONFLICT (startup_id, round_id) DO NOTHING;

    -- For pitching round: 
    -- - Shortlisted startups from screening get 'pending' status in pitching
    -- - All others get 'pending' (they might advance later)
    INSERT INTO startup_round_statuses (startup_id, round_id, status)
    SELECT 
      s.id,
      pitching_round_id,
      'pending'
    FROM startups s
    ON CONFLICT (startup_id, round_id) DO NOTHING;
  END IF;
END
$$;
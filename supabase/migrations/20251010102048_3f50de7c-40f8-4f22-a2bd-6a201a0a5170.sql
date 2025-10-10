-- Phase 1: AI Matchmaking Cache
CREATE TABLE startup_juror_compatibility_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
  juror_id uuid REFERENCES jurors(id) ON DELETE CASCADE NOT NULL,
  round_type text NOT NULL CHECK (round_type IN ('screening', 'pitching')),
  
  -- AI scores
  compatibility_score numeric(3,1) NOT NULL,
  confidence numeric(3,2) NOT NULL,
  brief_reasoning text NOT NULL,
  recommendation text NOT NULL CHECK (recommendation IN ('Highly Recommended', 'Recommended', 'Consider', 'Not Recommended')),
  
  -- Metadata
  computed_at timestamptz DEFAULT now() NOT NULL,
  config_hash text NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(startup_id, juror_id, round_type, config_hash)
);

CREATE INDEX idx_compatibility_startup ON startup_juror_compatibility_cache(startup_id, round_type);
CREATE INDEX idx_compatibility_juror ON startup_juror_compatibility_cache(juror_id, round_type);
CREATE INDEX idx_compatibility_computed_at ON startup_juror_compatibility_cache(computed_at);

-- RLS Policies for compatibility cache
ALTER TABLE startup_juror_compatibility_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all compatibility cache"
  ON startup_juror_compatibility_cache
  FOR ALL
  USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view compatibility cache"
  ON startup_juror_compatibility_cache
  FOR SELECT
  USING (get_current_user_role() = 'vc');

-- Cache invalidation functions
CREATE OR REPLACE FUNCTION invalidate_startup_compatibility_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.verticals IS DISTINCT FROM NEW.verticals OR
    OLD.stage IS DISTINCT FROM NEW.stage OR
    OLD.regions IS DISTINCT FROM NEW.regions OR
    OLD.description IS DISTINCT FROM NEW.description
  )) OR TG_OP = 'DELETE' THEN
    DELETE FROM startup_juror_compatibility_cache
    WHERE startup_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION invalidate_juror_compatibility_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.target_verticals IS DISTINCT FROM NEW.target_verticals OR
    OLD.preferred_stages IS DISTINCT FROM NEW.preferred_stages OR
    OLD.preferred_regions IS DISTINCT FROM NEW.preferred_regions OR
    OLD.thesis_keywords IS DISTINCT FROM NEW.thesis_keywords OR
    OLD.fund_focus IS DISTINCT FROM NEW.fund_focus
  )) OR TG_OP = 'DELETE' THEN
    DELETE FROM startup_juror_compatibility_cache
    WHERE juror_id = OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION invalidate_all_compatibility_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM startup_juror_compatibility_cache;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers
CREATE TRIGGER startup_cache_invalidation
  AFTER UPDATE OR DELETE ON startups
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_startup_compatibility_cache();

CREATE TRIGGER juror_cache_invalidation
  AFTER UPDATE OR DELETE ON jurors
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_juror_compatibility_cache();

CREATE TRIGGER config_cache_invalidation
  AFTER UPDATE ON matchmaking_config
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_all_compatibility_cache();

-- Phase 2: Round Insights Cache
CREATE TABLE round_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_name text NOT NULL UNIQUE,
  insights jsonb NOT NULL,
  evaluation_count integer NOT NULL,
  computed_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_insights_round ON round_insights_cache(round_name);

-- RLS for insights cache
ALTER TABLE round_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insights cache"
  ON round_insights_cache
  FOR ALL
  USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view insights cache"
  ON round_insights_cache
  FOR SELECT
  USING (get_current_user_role() = 'vc');

-- Invalidate insights when evaluations change
CREATE OR REPLACE FUNCTION invalidate_round_insights_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'screening_evaluations' THEN
    DELETE FROM round_insights_cache WHERE round_name = 'screening';
  ELSIF TG_TABLE_NAME = 'pitching_evaluations' THEN
    DELETE FROM round_insights_cache WHERE round_name = 'pitching';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER screening_insights_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON screening_evaluations
  FOR EACH STATEMENT
  EXECUTE FUNCTION invalidate_round_insights_cache();

CREATE TRIGGER pitching_insights_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON pitching_evaluations
  FOR EACH STATEMENT
  EXECUTE FUNCTION invalidate_round_insights_cache();
-- Phase 1: AI Guidance Cache Table
CREATE TABLE ai_guidance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'vc', 'cm')),
  round_name text NOT NULL,
  
  -- Cached guidance data
  guidance_data jsonb NOT NULL,
  metrics_snapshot jsonb NOT NULL,
  
  -- Metadata
  computed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure one cache entry per user/role/round combo
  UNIQUE(user_id, role, round_name)
);

CREATE INDEX idx_guidance_user_round ON ai_guidance_cache(user_id, round_name);
CREATE INDEX idx_guidance_computed_at ON ai_guidance_cache(computed_at);

-- RLS for AI Guidance Cache
ALTER TABLE ai_guidance_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own guidance cache"
  ON ai_guidance_cache
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage guidance cache"
  ON ai_guidance_cache
  FOR ALL
  TO service_role
  USING (true);

-- Invalidation function for VC guidance
CREATE OR REPLACE FUNCTION invalidate_vc_guidance_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the juror's user_id and invalidate their cache
  DELETE FROM ai_guidance_cache
  WHERE user_id IN (
    SELECT user_id FROM jurors WHERE id IN (
      SELECT juror_id FROM screening_assignments WHERE startup_id = NEW.startup_id
      UNION
      SELECT juror_id FROM pitching_assignments WHERE startup_id = NEW.startup_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER screening_eval_guidance_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON screening_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_vc_guidance_cache();

CREATE TRIGGER pitching_eval_guidance_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON pitching_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_vc_guidance_cache();

-- Invalidation function for admin/CM guidance
CREATE OR REPLACE FUNCTION invalidate_admin_guidance_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM ai_guidance_cache WHERE role IN ('admin', 'cm');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER assignment_guidance_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON screening_assignments
  FOR EACH STATEMENT
  EXECUTE FUNCTION invalidate_admin_guidance_cache();

CREATE TRIGGER pitching_assignment_guidance_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON pitching_assignments
  FOR EACH STATEMENT
  EXECUTE FUNCTION invalidate_admin_guidance_cache();

-- Phase 2: Founder Feedback Cache Table
CREATE TABLE founder_feedback_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
  round_name text NOT NULL CHECK (round_name IN ('screening', 'pitching')),
  
  -- Cached feedback data
  feedback_data jsonb NOT NULL,
  metadata jsonb NOT NULL,
  
  -- Tracking
  evaluation_count integer NOT NULL,
  computed_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(startup_id, round_name)
);

CREATE INDEX idx_founder_feedback_startup ON founder_feedback_cache(startup_id, round_name);
CREATE INDEX idx_founder_feedback_computed_at ON founder_feedback_cache(computed_at);

-- RLS for Founder Feedback Cache
ALTER TABLE founder_feedback_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage founder feedback cache"
  ON founder_feedback_cache
  FOR ALL
  TO authenticated
  USING (get_current_user_role() IN ('admin', 'cm'));

-- Invalidation function for founder feedback
CREATE OR REPLACE FUNCTION invalidate_founder_feedback_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Only invalidate if evaluation status changed to 'submitted'
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'submitted' AND NEW.status = 'submitted') THEN
    
    IF TG_TABLE_NAME = 'screening_evaluations' THEN
      DELETE FROM founder_feedback_cache 
      WHERE startup_id = NEW.startup_id AND round_name = 'screening';
    ELSIF TG_TABLE_NAME = 'pitching_evaluations' THEN
      DELETE FROM founder_feedback_cache 
      WHERE startup_id = NEW.startup_id AND round_name = 'pitching';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER screening_feedback_invalidation
  AFTER INSERT OR UPDATE ON screening_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_founder_feedback_cache();

CREATE TRIGGER pitching_feedback_invalidation
  AFTER INSERT OR UPDATE ON pitching_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_founder_feedback_cache();
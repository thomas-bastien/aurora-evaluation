-- Phase 1: Delete invalid pitching assignments for rejected startups
DELETE FROM pitching_assignments pa
USING startups s, startup_round_statuses srs, rounds r
WHERE pa.startup_id = s.id
  AND s.id = srs.startup_id
  AND srs.round_id = r.id
  AND r.name = 'screening'
  AND srs.status = 'rejected'
  AND pa.status = 'assigned';

-- Phase 3: Create validation function
CREATE OR REPLACE FUNCTION validate_pitching_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for new/updated active assignments
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'assigned')) THEN
    -- Check if startup is selected in screening round
    IF NOT EXISTS (
      SELECT 1 
      FROM startup_round_statuses srs
      JOIN rounds r ON srs.round_id = r.id
      WHERE srs.startup_id = NEW.startup_id
        AND r.name = 'screening'
        AND srs.status = 'selected'
    ) THEN
      RAISE EXCEPTION 'Cannot assign pitching for startup that is not selected in screening round';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce pitching eligibility
DROP TRIGGER IF EXISTS enforce_pitching_eligibility ON pitching_assignments;
CREATE TRIGGER enforce_pitching_eligibility
  BEFORE INSERT OR UPDATE ON pitching_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_pitching_assignment();
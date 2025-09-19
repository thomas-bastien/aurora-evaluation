-- Clean up orphaned evaluations (evaluations without corresponding assignments)

-- Remove pitching evaluations without assignments
DELETE FROM pitching_evaluations pe
WHERE NOT EXISTS (
  SELECT 1 FROM pitching_assignments pa
  JOIN jurors j ON pa.juror_id = j.id
  WHERE pe.startup_id = pa.startup_id 
  AND pe.evaluator_id = j.user_id
  AND pa.status = 'assigned'
);

-- Remove screening evaluations without assignments  
DELETE FROM screening_evaluations se
WHERE NOT EXISTS (
  SELECT 1 FROM screening_assignments sa
  JOIN jurors j ON sa.juror_id = j.id
  WHERE se.startup_id = sa.startup_id 
  AND se.evaluator_id = j.user_id
  AND sa.status = 'assigned'
);

-- Add validation function to prevent future orphaned evaluations
CREATE OR REPLACE FUNCTION validate_evaluation_assignment(
  p_startup_id uuid,
  p_evaluator_id uuid,
  p_evaluation_type text
) RETURNS boolean AS $$
DECLARE
  assignment_exists boolean := false;
BEGIN
  IF p_evaluation_type = 'screening' THEN
    SELECT EXISTS(
      SELECT 1 FROM screening_assignments sa
      JOIN jurors j ON sa.juror_id = j.id
      WHERE sa.startup_id = p_startup_id 
      AND j.user_id = p_evaluator_id
      AND sa.status = 'assigned'
    ) INTO assignment_exists;
  ELSIF p_evaluation_type = 'pitching' THEN
    SELECT EXISTS(
      SELECT 1 FROM pitching_assignments pa
      JOIN jurors j ON pa.juror_id = j.id
      WHERE pa.startup_id = p_startup_id 
      AND j.user_id = p_evaluator_id
      AND pa.status = 'assigned'
    ) INTO assignment_exists;
  END IF;
  
  RETURN assignment_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Add check constraint to screening evaluations
ALTER TABLE screening_evaluations 
ADD CONSTRAINT check_screening_assignment 
CHECK (validate_evaluation_assignment(startup_id, evaluator_id, 'screening'));

-- Add check constraint to pitching evaluations
ALTER TABLE pitching_evaluations 
ADD CONSTRAINT check_pitching_assignment 
CHECK (validate_evaluation_assignment(startup_id, evaluator_id, 'pitching'));
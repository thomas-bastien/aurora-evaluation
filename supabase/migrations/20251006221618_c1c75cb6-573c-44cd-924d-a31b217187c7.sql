-- Phase 2: Fix database trigger security warning
-- Update the trigger function to include proper search_path setting

CREATE OR REPLACE FUNCTION create_round_status_on_assignment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into startup_round_statuses if doesn't exist for screening round
  INSERT INTO startup_round_statuses (startup_id, round_id, status)
  SELECT 
    NEW.startup_id, 
    (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1),
    'selected'
  WHERE NOT EXISTS (
    SELECT 1 FROM startup_round_statuses 
    WHERE startup_id = NEW.startup_id
    AND round_id = (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1)
  );
  RETURN NEW;
END;
$$;
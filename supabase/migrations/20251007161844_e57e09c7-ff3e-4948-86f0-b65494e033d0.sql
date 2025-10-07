-- Fix the trigger to set status to 'pending' instead of 'selected'
-- This ensures startups are only marked as 'selected' through the explicit Selection workflow

CREATE OR REPLACE FUNCTION public.create_round_status_on_assignment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into startup_round_statuses if doesn't exist for screening round
  -- Set status to 'pending' instead of 'selected' to respect the selection workflow
  INSERT INTO startup_round_statuses (startup_id, round_id, status)
  SELECT 
    NEW.startup_id, 
    (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1),
    'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM startup_round_statuses 
    WHERE startup_id = NEW.startup_id
    AND round_id = (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1)
  );
  RETURN NEW;
END;
$$;

-- Optional: Update existing startups that were auto-marked as 'selected' back to 'pending'
-- WARNING: This will reset ALL screening selections. 
-- Comment out the below UPDATE if you've already made legitimate selections in the Selection tab

UPDATE startup_round_statuses srs
SET status = 'pending', updated_at = NOW()
WHERE srs.round_id = (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1)
  AND srs.status = 'selected';
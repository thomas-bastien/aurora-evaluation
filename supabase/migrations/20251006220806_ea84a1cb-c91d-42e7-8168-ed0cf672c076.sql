-- Phase 1.1: Create missing startup_round_statuses records
-- This fixes the 58 orphaned screening_assignments
INSERT INTO startup_round_statuses (startup_id, round_id, status)
SELECT DISTINCT 
  sa.startup_id,
  (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1),
  'selected'
FROM screening_assignments sa
WHERE NOT EXISTS (
  SELECT 1 FROM startup_round_statuses srs 
  WHERE srs.startup_id = sa.startup_id
  AND srs.round_id = (SELECT id FROM rounds WHERE name = 'screening' LIMIT 1)
);

-- Phase 1.2: Activate the screening round
-- This fixes functions that depend on an active round
UPDATE rounds 
SET 
  status = 'active', 
  started_at = NOW(),
  updated_at = NOW()
WHERE name = 'screening';

-- Phase 1.3: Fix NULL communication_type in existing emails
-- Using only valid communication_type values: selection, rejection, under-review, general
UPDATE email_communications 
SET communication_type = 
  CASE 
    WHEN subject LIKE '%invitation%' OR subject LIKE '%invited%' OR subject LIKE '%Assignment%' THEN 'under-review'
    WHEN subject LIKE '%selected%' OR subject LIKE '%Congratulations%' THEN 'selection'
    WHEN subject LIKE '%rejected%' OR subject LIKE '%not selected%' THEN 'rejection'
    ELSE 'general'
  END
WHERE communication_type IS NULL;

-- Phase 1.4: Add database trigger to prevent future data inconsistency
-- Auto-creates startup_round_statuses when screening_assignments are created
CREATE OR REPLACE FUNCTION create_round_status_on_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS ensure_round_status_on_screening_assignment ON screening_assignments;
CREATE TRIGGER ensure_round_status_on_screening_assignment
  AFTER INSERT ON screening_assignments
  FOR EACH ROW
  EXECUTE FUNCTION create_round_status_on_assignment();
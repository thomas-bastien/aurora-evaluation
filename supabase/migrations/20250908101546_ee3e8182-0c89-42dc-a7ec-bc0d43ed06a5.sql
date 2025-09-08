-- Reset incorrect startup statuses back to pending for startups that were incorrectly marked as rejected
-- Only keep the 2 startups that should actually be selected based on evaluations

UPDATE startup_round_statuses 
SET status = 'pending', updated_at = now()
WHERE round_id = (SELECT id FROM rounds WHERE name = 'screening')
  AND status = 'rejected'
  AND startup_id IN (
    -- Reset all rejected startups except those that should remain rejected
    -- For now, reset all to pending and let CMs explicitly manage statuses
    SELECT s.id FROM startups s WHERE s.id NOT IN (
      -- Keep the 2 startups that have evaluations as selected
      SELECT DISTINCT startup_id FROM screening_evaluations WHERE status = 'submitted'
    )
  );

-- Ensure all startups have entries in startup_round_statuses for both rounds
INSERT INTO startup_round_statuses (startup_id, round_id, status)
SELECT s.id, r.id, 'pending'
FROM startups s
CROSS JOIN rounds r
WHERE NOT EXISTS (
  SELECT 1 FROM startup_round_statuses srs 
  WHERE srs.startup_id = s.id AND srs.round_id = r.id
);
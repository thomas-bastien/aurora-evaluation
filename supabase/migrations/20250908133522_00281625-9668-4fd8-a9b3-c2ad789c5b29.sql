-- Clean up incorrect pitching round statuses
-- Remove pitching round entries for startups that were NOT selected in screening round
DELETE FROM startup_round_statuses 
WHERE round_id = (SELECT id FROM rounds WHERE name = 'pitching')
AND startup_id NOT IN (
  SELECT srs.startup_id 
  FROM startup_round_statuses srs
  JOIN rounds r ON srs.round_id = r.id
  WHERE r.name = 'screening' AND srs.status = 'selected'
);
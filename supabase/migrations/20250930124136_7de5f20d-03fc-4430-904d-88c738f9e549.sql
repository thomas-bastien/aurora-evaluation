-- Phase 1: Clean up duplicate assigned pitching assignments
-- Keep only the most recent assigned assignment per startup-juror pair
WITH ranked_pitching AS (
  SELECT 
    id,
    startup_id,
    juror_id,
    ROW_NUMBER() OVER (
      PARTITION BY startup_id, juror_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM pitching_assignments
  WHERE status = 'assigned'
)
DELETE FROM pitching_assignments
WHERE id IN (
  SELECT id FROM ranked_pitching WHERE rn > 1
);

-- Also clean up duplicate assigned screening assignments
WITH ranked_screening AS (
  SELECT 
    id,
    startup_id,
    juror_id,
    ROW_NUMBER() OVER (
      PARTITION BY startup_id, juror_id, status
      ORDER BY created_at DESC
    ) as rn
  FROM screening_assignments
  WHERE status = 'assigned'
)
DELETE FROM screening_assignments
WHERE id IN (
  SELECT id FROM ranked_screening WHERE rn > 1
);

-- Phase 2: Create unique constraint for active assignments
-- Allows multiple cancelled assignments per pair, but only one active assignment
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_pitching_assignment
ON pitching_assignments (startup_id, juror_id)
WHERE status NOT IN ('cancelled', 'deleted');

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_screening_assignment
ON screening_assignments (startup_id, juror_id)
WHERE status NOT IN ('cancelled', 'deleted');

-- Phase 3: Fix calendar invitation linking
-- Update calendar invitations to link to the correct pitching assignment
UPDATE cm_calendar_invitations ci
SET pitching_assignment_id = pa.id
FROM pitching_assignments pa
WHERE ci.startup_id = pa.startup_id
  AND ci.juror_id = pa.juror_id
  AND ci.pitching_assignment_id IS NULL
  AND pa.status = 'assigned';
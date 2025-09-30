-- Clean up duplicate cancelled pitching assignments
-- Keep only the most recent cancelled assignment per startup-juror pair
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY startup_id, juror_id, status 
           ORDER BY created_at DESC
         ) as rn
  FROM pitching_assignments
  WHERE status = 'cancelled'
)
DELETE FROM pitching_assignments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Also clean up any cancelled screening assignments duplicates
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY startup_id, juror_id, status 
           ORDER BY created_at DESC
         ) as rn
  FROM screening_assignments
  WHERE status = 'cancelled'
)
DELETE FROM screening_assignments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
-- Fix Critical Security Issue: Restrict VC access to only their assigned startups
-- Drop the overpermissive policy that allows all VCs to see all startups
DROP POLICY IF EXISTS "VCs can view basic startup info for all startups" ON startups;

-- Create a new policy that restricts VCs to only see startups they're assigned to
CREATE POLICY "VCs can view assigned startups only"
ON startups FOR SELECT
USING (
  get_current_user_role() = 'vc' AND
  id IN (
    SELECT sa.startup_id FROM screening_assignments sa
    INNER JOIN jurors j ON sa.juror_id = j.id
    WHERE j.user_id = auth.uid()
    UNION
    SELECT pa.startup_id FROM pitching_assignments pa
    INNER JOIN jurors j ON pa.juror_id = j.id
    WHERE j.user_id = auth.uid()
  )
);
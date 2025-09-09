-- Fix security issue: Restrict VC access to only assigned startups
-- Remove the overly permissive policy that allows VCs to see all startups
DROP POLICY IF EXISTS "VCs can view all startups" ON public.startups;

-- Create a more secure policy that only allows VCs to see startups they're assigned to
CREATE POLICY "VCs can view assigned startups only" 
ON public.startups 
FOR SELECT 
USING (
  get_current_user_role() = 'vc' 
  AND (
    -- Allow access if VC is assigned to this startup in screening round
    id IN (
      SELECT sa.startup_id 
      FROM screening_assignments sa 
      WHERE sa.juror_id = auth.uid()
    )
    OR
    -- Allow access if VC is assigned to this startup in pitching round  
    id IN (
      SELECT pa.startup_id 
      FROM pitching_assignments pa 
      WHERE pa.juror_id = auth.uid()
    )
  )
);
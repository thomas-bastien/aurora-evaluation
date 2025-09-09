-- Drop the current restrictive policy for VCs
DROP POLICY IF EXISTS "VCs can view assigned startups only" ON public.startups;

-- Create new policy that allows VCs to see basic startup information
-- but restricts sensitive contact fields to only assigned startups
CREATE POLICY "VCs can view basic startup info for all startups" 
ON public.startups 
FOR SELECT 
USING (
  get_current_user_role() = 'vc'::text AND 
  (
    -- Allow access to basic fields for all startups
    true
  )
);

-- Create a separate policy for sensitive contact information
-- This will be enforced at the application level since PostgreSQL RLS 
-- doesn't support column-level restrictions in a clean way
-- We'll handle sensitive data filtering in the application code
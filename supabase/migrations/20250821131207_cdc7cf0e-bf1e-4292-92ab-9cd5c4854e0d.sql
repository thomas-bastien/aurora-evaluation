-- Drop the restrictive VC policy for startup_assignments
DROP POLICY IF EXISTS "VCs can view their own assignments" ON public.startup_assignments;

-- Create a more permissive policy for VCs to view all startup_assignments
CREATE POLICY "VCs can view all startup_assignments" 
ON public.startup_assignments 
FOR SELECT 
USING (get_current_user_role() = 'vc');

-- Allow VCs to insert/update startup_assignments as well
CREATE POLICY "VCs can manage startup_assignments" 
ON public.startup_assignments 
FOR ALL 
USING (get_current_user_role() = 'vc');
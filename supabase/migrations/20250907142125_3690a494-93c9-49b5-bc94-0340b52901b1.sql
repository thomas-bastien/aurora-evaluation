-- Update RLS policy to allow VCs to view all startups instead of just under-review and shortlisted ones
DROP POLICY IF EXISTS "VCs can view startups under review" ON public.startups;

CREATE POLICY "VCs can view all startups" 
ON public.startups 
FOR SELECT 
USING (get_current_user_role() = 'vc'::text);
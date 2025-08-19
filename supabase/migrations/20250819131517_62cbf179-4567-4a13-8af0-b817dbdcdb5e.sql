-- Fix security vulnerability: Restrict jurors table access to authenticated users only
-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Jurors can view all jurors" ON public.jurors;

-- Create new restricted policies for authenticated users
CREATE POLICY "Admins can view all jurors" 
ON public.jurors 
FOR SELECT 
USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "VCs can view all jurors" 
ON public.jurors 
FOR SELECT 
USING (get_current_user_role() = 'vc'::text);
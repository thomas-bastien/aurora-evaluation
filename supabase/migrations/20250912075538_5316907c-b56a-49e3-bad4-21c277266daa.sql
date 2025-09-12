-- Add calendly_link column to jurors table
ALTER TABLE public.jurors 
ADD COLUMN calendly_link TEXT;

-- Migrate existing calendly_link data from profiles to jurors table
UPDATE public.jurors 
SET calendly_link = p.calendly_link
FROM public.profiles p
WHERE jurors.user_id = p.user_id 
AND p.calendly_link IS NOT NULL;

-- Update RLS policy to allow VCs to update their calendly_link in jurors table
DROP POLICY IF EXISTS "VCs can update their own juror record" ON public.jurors;
CREATE POLICY "VCs can update their own juror record" 
ON public.jurors 
FOR UPDATE 
USING ((get_current_user_role() = 'vc'::text) AND (user_id = auth.uid()));

-- Remove calendly_link column from profiles table
ALTER TABLE public.profiles 
DROP COLUMN calendly_link;
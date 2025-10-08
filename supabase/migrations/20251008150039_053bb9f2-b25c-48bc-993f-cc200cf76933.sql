-- Add permissive RLS policies for jurors to access their own data without role requirement
CREATE POLICY "Users can view their own juror profile (no role requirement)"
ON public.jurors
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own juror profile (no role requirement)"
ON public.jurors
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backfill missing vc roles for existing jurors
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT j.user_id, 'vc'::app_role, j.user_id
FROM public.jurors j
LEFT JOIN public.user_roles ur ON ur.user_id = j.user_id
WHERE j.user_id IS NOT NULL AND ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
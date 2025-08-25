-- Fix RLS policy to allow VCs to update their evaluations from draft to submitted
DROP POLICY IF EXISTS "VCs can update their own draft evaluations" ON public.evaluations;

-- Allow VCs to update their own evaluations when current status is draft
-- This enables the transition from draft to submitted
CREATE POLICY "VCs can update their own draft evaluations" 
ON public.evaluations 
FOR UPDATE 
USING (
  (get_current_user_role() = 'vc'::text) 
  AND (evaluator_id = auth.uid()) 
  AND (status = 'draft'::text)
)
WITH CHECK (
  (get_current_user_role() = 'vc'::text) 
  AND (evaluator_id = auth.uid())
  AND (status IN ('draft'::text, 'submitted'::text))
);
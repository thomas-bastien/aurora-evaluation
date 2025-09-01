-- Update RLS policy to allow VCs to update their own evaluations regardless of status
-- This fixes the issue where submitted evaluations cannot be modified

DROP POLICY IF EXISTS "VCs can update their own draft evaluations" ON public.evaluations;

-- Create new policy that allows VCs to update their own evaluations regardless of current status
CREATE POLICY "VCs can update their own evaluations" 
ON public.evaluations 
FOR UPDATE 
USING (
  (get_current_user_role() = 'vc'::text) 
  AND (evaluator_id = auth.uid())
)
WITH CHECK (
  (get_current_user_role() = 'vc'::text) 
  AND (evaluator_id = auth.uid()) 
  AND (status = ANY (ARRAY['draft'::text, 'submitted'::text]))
);

-- Add a last_modified_at column for audit purposes
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS last_modified_at timestamp with time zone DEFAULT now();

-- Create trigger to update last_modified_at when evaluation is updated
CREATE OR REPLACE FUNCTION public.update_evaluation_modified_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_evaluations_last_modified_at ON public.evaluations;
CREATE TRIGGER update_evaluations_last_modified_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_evaluation_modified_time();
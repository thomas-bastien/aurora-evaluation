-- Add user_id column to jurors table to link with authenticated users
ALTER TABLE public.jurors 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_jurors_user_id ON public.jurors(user_id);

-- Update RLS policies for jurors table to allow VCs to see their own juror record
CREATE POLICY "VCs can view their own juror record" 
ON public.jurors 
FOR SELECT 
USING (get_current_user_role() = 'vc' AND user_id = auth.uid());

CREATE POLICY "VCs can update their own juror record" 
ON public.jurors 
FOR UPDATE 
USING (get_current_user_role() = 'vc' AND user_id = auth.uid());
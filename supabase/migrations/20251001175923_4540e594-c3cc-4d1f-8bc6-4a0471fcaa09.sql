-- Create audit log table for cohort resets
CREATE TABLE IF NOT EXISTS public.cohort_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.cohort_settings(id) ON DELETE CASCADE,
  cohort_name TEXT NOT NULL,
  triggered_by UUID NOT NULL REFERENCES auth.users(id),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  records_deleted JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.cohort_reset_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view reset logs
CREATE POLICY "Admins can view all cohort reset logs"
ON public.cohort_reset_logs
FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- Only admins can insert reset logs (via edge function)
CREATE POLICY "Admins can insert cohort reset logs"
ON public.cohort_reset_logs
FOR INSERT
TO authenticated
WITH CHECK (get_current_user_role() = 'admin');

-- Create index for faster lookups
CREATE INDEX idx_cohort_reset_logs_cohort_id ON public.cohort_reset_logs(cohort_id);
CREATE INDEX idx_cohort_reset_logs_triggered_at ON public.cohort_reset_logs(triggered_at DESC);
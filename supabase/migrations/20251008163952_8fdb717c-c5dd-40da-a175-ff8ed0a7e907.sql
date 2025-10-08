-- Create audit table for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_role app_role NOT NULL,
  new_role app_role NOT NULL,
  permissions_granted JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins and CMs can view audit logs
CREATE POLICY "Admins and CMs can view audit logs"
  ON public.role_change_audit
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() IN ('admin', 'cm')
  );

-- Only admins and CMs can insert audit logs
CREATE POLICY "Admins and CMs can insert audit logs"
  ON public.role_change_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('admin', 'cm')
  );

-- Create index for faster queries
CREATE INDEX idx_role_change_audit_user_id ON public.role_change_audit(user_id);
CREATE INDEX idx_role_change_audit_changed_by ON public.role_change_audit(changed_by);
CREATE INDEX idx_role_change_audit_created_at ON public.role_change_audit(created_at DESC);
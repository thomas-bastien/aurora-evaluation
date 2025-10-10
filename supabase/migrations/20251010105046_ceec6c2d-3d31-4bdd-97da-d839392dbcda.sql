-- Create table for custom startup emails with approval workflow
CREATE TABLE public.startup_custom_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
  round_name text NOT NULL CHECK (round_name IN ('screening', 'pitching')),
  communication_type text NOT NULL,
  
  -- Custom content
  custom_subject text,
  custom_body text,
  
  -- Preview data (full HTML for display)
  preview_html text,
  
  -- Approval status
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(startup_id, round_name, communication_type)
);

-- Create index for faster lookups
CREATE INDEX idx_custom_emails_startup ON public.startup_custom_emails(startup_id, round_name);

-- Enable RLS
ALTER TABLE public.startup_custom_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all custom emails"
  ON public.startup_custom_emails
  FOR ALL
  TO authenticated
  USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view custom emails for their assigned startups"
  ON public.startup_custom_emails
  FOR SELECT
  TO authenticated
  USING (
    get_current_user_role() = 'vc' AND
    startup_id IN (
      SELECT DISTINCT sa.startup_id
      FROM screening_assignments sa
      JOIN jurors j ON sa.juror_id = j.id
      WHERE j.user_id = auth.uid()
      UNION
      SELECT DISTINCT pa.startup_id
      FROM pitching_assignments pa
      JOIN jurors j ON pa.juror_id = j.id
      WHERE j.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_startup_custom_emails_updated_at
  BEFORE UPDATE ON public.startup_custom_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
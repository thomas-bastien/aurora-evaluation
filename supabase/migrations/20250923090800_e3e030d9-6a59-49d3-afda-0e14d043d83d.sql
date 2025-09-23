-- Create email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('juror_invitation', 'juror_reminder', 'founder_selection', 'founder_rejection', 'pitch_scheduling')),
  subject_template text NOT NULL,
  body_template text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email communications table
CREATE TABLE public.email_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.email_templates(id),
  recipient_email text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('juror', 'startup', 'admin')),
  recipient_id uuid,
  subject text NOT NULL,
  body text NOT NULL,
  resend_email_id text,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'complained', 'opened', 'clicked', 'failed')),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create email delivery events table
CREATE TABLE public.email_delivery_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_id uuid NOT NULL REFERENCES public.email_communications(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('sent', 'delivered', 'delivery_delayed', 'bounced', 'complained', 'opened', 'clicked')),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  resend_event_id text,
  raw_payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Admins can manage all email templates" 
ON public.email_templates 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view active email templates" 
ON public.email_templates 
FOR SELECT 
USING (get_current_user_role() = 'vc' AND is_active = true);

-- RLS policies for email_communications
CREATE POLICY "Admins can manage all email communications" 
ON public.email_communications 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view communications for their assigned startups/jurors" 
ON public.email_communications 
FOR SELECT 
USING (
  get_current_user_role() = 'vc' AND (
    (recipient_type = 'startup' AND recipient_id IN (
      SELECT DISTINCT sa.startup_id FROM screening_assignments sa 
      JOIN jurors j ON sa.juror_id = j.id 
      WHERE j.user_id = auth.uid()
      UNION
      SELECT DISTINCT pa.startup_id FROM pitching_assignments pa 
      JOIN jurors j ON pa.juror_id = j.id 
      WHERE j.user_id = auth.uid()
    ))
    OR
    (recipient_type = 'juror' AND recipient_id IN (
      SELECT j.id FROM jurors j WHERE j.user_id = auth.uid()
    ))
  )
);

-- RLS policies for email_delivery_events
CREATE POLICY "Admins can manage all email delivery events" 
ON public.email_delivery_events 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create indexes for better performance
CREATE INDEX idx_email_communications_recipient ON public.email_communications(recipient_email, recipient_type);
CREATE INDEX idx_email_communications_status ON public.email_communications(status);
CREATE INDEX idx_email_communications_resend_id ON public.email_communications(resend_email_id);
CREATE INDEX idx_email_communications_content_hash ON public.email_communications(content_hash);
CREATE INDEX idx_email_delivery_events_communication ON public.email_delivery_events(communication_id);
CREATE INDEX idx_email_delivery_events_type ON public.email_delivery_events(event_type);

-- Create function to update updated_at timestamp
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_communications_updated_at
  BEFORE UPDATE ON public.email_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, category, subject_template, body_template, variables) VALUES
('Juror Invitation', 'juror_invitation', 'Invitation to Join Aurora Tech Awards as a Juror', 
'<h1>Hello {{juror_name}},</h1>
<p>You have been invited to join the Aurora Tech Awards as a juror.</p>
<p>Please click the link below to complete your registration:</p>
<p><a href="{{magic_link}}">Complete Registration</a></p>
<p>This link will expire on {{expiry_date}}.</p>
<p>Best regards,<br>Aurora Tech Awards Team</p>', 
'["juror_name", "magic_link", "expiry_date"]'::jsonb),

('Juror Reminder', 'juror_reminder', 'Reminder: Complete Your Evaluations', 
'<h1>Hello {{juror_name}},</h1>
<p>This is a reminder that you have {{pending_count}} pending evaluations to complete.</p>
<p>Please log in to your dashboard to continue:</p>
<p><a href="{{dashboard_link}}">Access Dashboard</a></p>
<p>Deadline: {{deadline}}</p>
<p>Best regards,<br>Aurora Tech Awards Team</p>', 
'["juror_name", "pending_count", "dashboard_link", "deadline"]'::jsonb),

('Founder Selection', 'founder_selection', 'Congratulations! You have been selected for the next round', 
'<h1>Congratulations {{founder_name}}!</h1>
<p>We are pleased to inform you that {{startup_name}} has been selected to proceed to the next round of Aurora Tech Awards.</p>
<p>Next steps:</p>
<ul>
<li>You will receive pitch scheduling invitations from our VC partners</li>
<li>Please prepare your pitch deck and demo</li>
</ul>
<p>Feedback from our evaluation panel:</p>
<blockquote>{{feedback}}</blockquote>
<p>Best regards,<br>Aurora Tech Awards Team</p>', 
'["founder_name", "startup_name", "feedback"]'::jsonb),

('Founder Rejection', 'founder_rejection', 'Aurora Tech Awards Update', 
'<h1>Thank you {{founder_name}},</h1>
<p>Thank you for submitting {{startup_name}} to Aurora Tech Awards.</p>
<p>While your application was impressive, we will not be moving forward to the next round at this time.</p>
<p>Feedback from our evaluation panel:</p>
<blockquote>{{feedback}}</blockquote>
<p>We encourage you to apply again in future rounds.</p>
<p>Best regards,<br>Aurora Tech Awards Team</p>', 
'["founder_name", "startup_name", "feedback"]'::jsonb),

('Pitch Scheduling', 'pitch_scheduling', 'Schedule Your Pitch Session', 
'<h1>Hello {{founder_name}},</h1>
<p>Congratulations! {{startup_name}} has been selected for pitch sessions.</p>
<p>The following VCs would like to schedule meetings with you:</p>
{{vc_list}}
<p>Please schedule your sessions as soon as possible. Sessions must be scheduled within 4 days of this email.</p>
<p>Best regards,<br>Aurora Tech Awards Team</p>', 
'["founder_name", "startup_name", "vc_list"]'::jsonb);
-- First, update the check constraint to allow assignment-notification category
ALTER TABLE public.email_templates 
DROP CONSTRAINT IF EXISTS email_templates_category_check;

ALTER TABLE public.email_templates 
ADD CONSTRAINT email_templates_category_check 
CHECK (category IN ('pitch_scheduling', 'founder_selection', 'juror_invitation', 'founder_rejection', 'juror_reminder', 'assignment-notification'));

-- Now create the missing assignment-notification email template
INSERT INTO public.email_templates (
  name,
  category,
  subject_template,
  body_template,
  variables,
  is_active,
  created_by
) VALUES (
  'Juror Assignment Notification',
  'assignment-notification',
  'New Startup Assignments - {{roundName}}',
  'Dear {{jurorName}},

You have been assigned {{assignmentCount}} new startup(s) for evaluation in the {{roundName}} round:

{{startupNames}}

Please log into the platform to review your assignments and begin the evaluation process.

Best regards,
The Aurora Team',
  '["jurorName", "roundName", "assignmentCount", "startupNames"]'::jsonb,
  true,
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);
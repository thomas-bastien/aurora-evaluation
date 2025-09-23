-- Create login reminder email template with valid category
INSERT INTO email_templates (
  name,
  category,
  subject_template,
  body_template,
  lifecycle_stage,
  evaluation_phase,
  auto_trigger_events,
  variables,
  trigger_priority,
  is_active
) VALUES (
  'Juror Login Reminder',
  'juror_reminder',
  'Action Required: Complete Your Registration - Aurora Tech Awards',
  '<h1>Hello {{juror_name}},</h1>
<p>We sent you an invitation to join the Aurora Tech Awards as a juror {{days_since_invitation}} days ago, but we notice you haven''t completed your registration yet.</p>
<p>Your participation is important to us. Please click the link below to complete your registration:</p>
<p><a href="{{magic_link}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Registration Now</a></p>
<p><strong>This link will expire on {{expiry_date}}.</strong></p>
<p>If you have any questions or need assistance, please don''t hesitate to reach out to our team.</p>
<p>Best regards,<br>Aurora Tech Awards Team</p>',
  'screening',
  'pre_evaluation',
  '["login_reminder_needed"]',
  '["juror_name", "magic_link", "expiry_date", "days_since_invitation"]',
  2,
  true
);
-- Update evaluation_phase constraint to include new values
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_evaluation_phase_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_evaluation_phase_check 
CHECK (evaluation_phase IS NULL OR evaluation_phase IN (
  'active_evaluation',
  'pre_evaluation',
  'results',
  'post_evaluation'
));

-- Deactivate old juror email templates
UPDATE email_templates 
SET is_active = false 
WHERE category IN ('juror_invitation', 'juror_reminder', 'pitch_scheduling')
AND name NOT LIKE '%Assignment%';

-- Template 1: Intro Letter (Welcome)
INSERT INTO email_templates (name, category, subject_template, body_template, variables, is_active, auto_trigger_events, lifecycle_stage, evaluation_phase, trigger_priority)
VALUES (
  'Juror Welcome - Selection Process Introduction',
  'juror-welcome',
  'Welcome to the Aurora Tech Award 2025 Selection Process',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Dear <strong>{{recipient_name}}</strong>,</p><p style="margin: 0 0 16px 0;">On behalf of Aurora Tech Awards, I am delighted to welcome you as an <strong>External Expert</strong> for the <strong>2025 award cycle</strong>! This year, you will be evaluating <strong>{{application_count}}</strong> applications from female-led tech companies across <strong>{{country_count}}</strong> countries.</p><p style="margin: 0 0 16px 0;">Your expertise and insights are invaluable in identifying the most promising startups to support through our program.</p><div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3B82F6;"><h3 style="color: #1e293b; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">What to Expect</h3><ul style="margin: 0; padding-left: 20px; color: #475569;"><li style="margin-bottom: 8px;">Access to our evaluation platform</li><li style="margin-bottom: 8px;">Structured evaluation criteria</li><li style="margin-bottom: 8px;">Opportunity to meet top startups</li><li>Contribution to empowering female founders</li></ul></div><p style="margin: 0 0 16px 0;">We will send you your platform access credentials shortly. In the meantime, please do not hesitate to reach out if you have any questions.</p><p style="margin: 0 0 16px 0;">Thank you for being part of this journey!</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;"><h3 style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">LEGAL NOTICE</h3><p style="color: #64748b; font-size: 11px; font-style: italic; line-height: 1.5; margin: 0;">By agreeing to participate in the Aurora Tech Award (the "Award") as an External Expert and receiving any information or attachments related to this Award, you acknowledge and agree to the Award Terms and Conditions, Privacy Policy, and any confidentiality terms.<br><br>This email message and its attachments are confidential, intended solely for the recipient, and may be legally privileged. Any unauthorized dissemination, copying, or other use of this communication, as well as any actions taken based on the information contained herein, are strictly prohibited.</p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["recipient_name", "application_count", "country_count"]'::jsonb,
  true,
  '["juror_confirmed"]'::jsonb,
  NULL,
  'pre_evaluation',
  1
);

-- Template 2: Platform Access Letter
INSERT INTO email_templates (name, category, subject_template, body_template, variables, is_active, auto_trigger_events, lifecycle_stage, evaluation_phase, trigger_priority)
VALUES (
  'Juror Platform Access Credentials',
  'juror-access',
  'Your Access to the Aurora Selection Platform 🔑',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Hello <strong>{{recipient_name}}</strong>,</p><p style="margin: 0 0 16px 0;">Your account has been created! Here are your login credentials for the Aurora Selection Platform:</p><div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3B82F6;"><p style="margin: 0 0 12px 0;"><strong>Login Email:</strong><br><span style="color: #0369a1; font-family: monospace;">{{login_email}}</span></p><p style="margin: 0 0 12px 0;"><strong>Temporary Password:</strong><br><span style="color: #0369a1; font-family: monospace;">{{temp_password}}</span></p><p style="margin: 0;"><strong>Platform Link:</strong><br><a href="{{platform_link}}" style="color: #3B82F6; text-decoration: none;">{{platform_link}}</a></p></div><p style="margin: 0 0 16px 0;">Please log in and change your password upon first access for security purposes.</p><div style="text-align: center; margin: 32px 0;"><a href="{{platform_link}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Access Platform</a></div><p style="margin: 0 0 16px 0;"><strong>Need help?</strong> Watch our quick tutorial video: <a href="{{tutorial_video_link}}" style="color: #3B82F6;">Platform Walkthrough</a></p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["recipient_name", "login_email", "temp_password", "platform_link", "tutorial_video_link"]'::jsonb,
  true,
  '["account_created"]'::jsonb,
  NULL,
  'pre_evaluation',
  1
);
-- Drop and recreate the category constraint with all values
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_category_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_category_check 
CHECK (category IN (
  'assignment-notification',
  'founder_rejection',
  'founder_selection',
  'juror_invitation',
  'juror_reminder',
  'pitch_scheduling',
  'top-100-feedback',
  'juror-welcome',
  'juror-access',
  'juror-completion',
  'pitch-invitation',
  'pitch-reminder',
  'juror-final-thankyou',
  'admin_invitation',
  'cm_invitation',
  'screening-results',
  'pitching-results'
));

-- Now insert all remaining templates (3-9)
INSERT INTO email_templates (name, category, subject_template, body_template, variables, is_active, auto_trigger_events, lifecycle_stage, evaluation_phase, trigger_priority)
VALUES 
(
  'Juror First Evaluation Reminder',
  'juror_reminder',
  'Your evaluations matter 💡',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Hi <strong>{{juror_name}}</strong>,</p><p style="margin: 0 0 16px 0;">Just a friendly reminder that your startup evaluations are waiting for you on the Aurora platform.</p><p style="margin: 0 0 16px 0;">Your insights are incredibly valuable in helping us identify the most promising female-led tech companies. Each evaluation takes about 15-20 minutes to complete.</p><div style="text-align: center; margin: 32px 0;"><a href="{{platform_link}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Start Evaluating</a></div><p style="margin: 0 0 16px 0;"><strong>Need a refresher?</strong> Check out our <a href="{{tutorial_link}}" style="color: #3B82F6;">quick tutorial</a> for guidance on the evaluation process.</p><p style="margin: 0 0 16px 0;">Thank you for your time and expertise!</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["juror_name", "tutorial_link", "platform_link"]'::jsonb,
  true,
  '["evaluation_reminder_1"]'::jsonb,
  NULL,
  'active_evaluation',
  2
),
(
  'Juror Second Evaluation Reminder',
  'juror_reminder',
  'Just a quick reminder to complete your startup evaluations',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Hi <strong>{{juror_name}}</strong>,</p><p style="margin: 0 0 16px 0;">This is a quick follow-up to remind you about the pending startup evaluations in your Aurora dashboard.</p><p style="margin: 0 0 16px 0;">We understand you are busy, but your expert feedback is crucial for these founders. Even completing a few evaluations would make a significant impact.</p><div style="text-align: center; margin: 32px 0;"><a href="{{platform_link}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Evaluations</a></div><p style="margin: 0 0 16px 0;">Questions or need assistance? We are here to help!</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["juror_name", "tutorial_link", "platform_link"]'::jsonb,
  true,
  '["evaluation_reminder_2"]'::jsonb,
  NULL,
  'active_evaluation',
  3
),
(
  'Juror Final Evaluation Reminder',
  'juror_reminder',
  'Please submit your evaluations ✨',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Hi <strong>{{juror_name}}</strong>,</p><p style="margin: 0 0 16px 0;">This is our final reminder about the pending evaluations in your Aurora dashboard. The deadline is approaching: <strong>{{deadline_date}}</strong>.</p><div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;"><p style="margin: 0; color: #92400e;"><strong>⏰ Time-Sensitive:</strong> Please complete your evaluations by {{deadline_date}} to ensure your feedback is included in the selection process.</p></div><p style="margin: 0 0 16px 0;">Your expertise is essential in identifying the next generation of female tech leaders. Thank you for making time for this important work.</p><div style="text-align: center; margin: 32px 0;"><a href="{{platform_link}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Submit Now</a></div></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This is a system email regarding the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["juror_name", "tutorial_link", "platform_link", "deadline_date"]'::jsonb,
  true,
  '["evaluation_final_reminder"]'::jsonb,
  NULL,
  'active_evaluation',
  4
),
(
  'Juror Evaluation Completion Thank You',
  'juror-completion',
  'Thank you for completing your evaluations 🙌',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Dear <strong>{{juror_name}}</strong>,</p><p style="margin: 0 0 16px 0;">🎉 Congratulations on completing all your startup evaluations!</p><p style="margin: 0 0 16px 0;">Your thoughtful feedback and expert insights are invaluable in helping us identify the most promising female-led tech companies for the Aurora Tech Awards.</p><div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #22c55e;"><p style="margin: 0; color: #166534;"><strong>✅ Evaluation Complete:</strong> Your contribution will directly impact which startups receive support and recognition through our program.</p></div><p style="margin: 0 0 16px 0;">We will keep you updated as we progress to the next phase of the selection process. Stay tuned for information about pitch sessions with our top 30 finalists!</p><p style="margin: 0 0 16px 0;">Thank you once again for your dedication and expertise.</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">With gratitude,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["juror_name"]'::jsonb,
  true,
  '["evaluation_completed"]'::jsonb,
  NULL,
  'post_evaluation',
  1
),
(
  'Juror Pitch Session Invitation',
  'pitch-invitation',
  'Next step: Pitch sessions with top 30 startups 🎤',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Dear <strong>{{recipient_name}}</strong>,</p><p style="margin: 0 0 16px 0;">Exciting news! Based on the evaluation results, we have selected our <strong>top 30 startups</strong> for the pitching round.</p><p style="margin: 0 0 16px 0;">You have been matched with select startups for one-on-one pitch sessions. This is your opportunity to dive deeper into their businesses and provide direct feedback.</p><div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3B82F6;"><h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 600;">Your Assigned Startups:</h3><div style="color: #475569;">{{assigned_startups_list}}</div></div><p style="margin: 0 0 16px 0;"><strong>Next Steps:</strong></p><ul style="color: #475569; margin: 0 0 16px 0; padding-left: 20px;"><li style="margin-bottom: 8px;">Submit your Calendly link in the platform</li><li style="margin-bottom: 8px;">Schedule 30-minute pitch sessions</li><li>Complete pitch evaluations by <strong>{{pitch_deadline}}</strong></li></ul><div style="text-align: center; margin: 32px 0;"><a href="{{calendly_submission_link}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Submit Calendly Link</a></div></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["recipient_name", "assigned_startups_list", "calendly_submission_link", "pitch_deadline"]'::jsonb,
  true,
  '["round_transition_pitching"]'::jsonb,
  NULL,
  'pre_evaluation',
  1
),
(
  'Juror Pitch Session Reminder',
  'pitch-reminder',
  'Do not forget to hold your pitch sessions with the participants 🎯',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Hi <strong>{{recipient_name}}</strong>,</p><p style="margin: 0 0 16px 0;">This is a friendly reminder about your pending pitch sessions with the Aurora Tech Awards finalists.</p><div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;"><p style="margin: 0; color: #92400e;"><strong>⏰ Pending:</strong> You have <strong>{{pending_pitches_count}}</strong> pitch session(s) remaining. Please schedule and complete them by <strong>{{pitch_deadline}}</strong>.</p></div><p style="margin: 0 0 16px 0;">These sessions are crucial for the founders and your evaluation of their pitch delivery and business readiness.</p><p style="margin: 0 0 16px 0;">If you are having trouble scheduling or need support, please do not hesitate to reach out.</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">Best regards,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">This email was sent as part of the Aurora Tech Awards evaluation process.</p></div></div></body></html>$$,
  '["recipient_name", "pending_pitches_count", "pitch_deadline"]'::jsonb,
  true,
  '["pitch_reminder"]'::jsonb,
  NULL,
  'active_evaluation',
  2
),
(
  'Juror Final Thank You',
  'juror-final-thankyou',
  'Thank you for being part of the Aurora Tech Award 2026 🌟',
  $$<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;"><h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0;">Aurora Tech Awards</h1></div><div style="padding: 30px; color: #1e293b;"><p style="margin: 0 0 16px 0;">Dear <strong>{{recipient_name}}</strong>,</p><p style="margin: 0 0 16px 0;">🎉 The Aurora Tech Award 2026 selection process is now complete, and we could not have done it without you!</p><p style="margin: 0 0 16px 0;">Your expertise, time, and thoughtful evaluations have been instrumental in identifying <strong>{{finalist_count}} exceptional female-led startups</strong> who will receive support through our program.</p><div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #22c55e;"><h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">Your Impact</h3><p style="margin: 0; color: #166534;">Through your evaluations and mentorship, you have helped shape the future of these innovative companies and their founders. Thank you for being part of this journey.</p></div><p style="margin: 0 0 16px 0;">We would love to have you back as an expert evaluator for future cohorts. Stay connected with us to learn about upcoming opportunities.</p><p style="margin: 0 0 16px 0;">With heartfelt appreciation for all you have contributed to the Aurora community.</p></div><div style="padding: 0 30px 20px; color: #64748b; font-size: 14px;"><p style="margin: 0;">With gratitude,</p><p style="margin: 5px 0;"><strong>Kseniia Matveeva</strong><br>Product Lead, Aurora Tech Award<br><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #3B82F6; text-decoration: none;">LinkedIn Profile</a></p></div><div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;"><p style="color: #64748b; font-size: 12px; margin: 0;">Thank you for being part of the Aurora Tech Awards.</p></div></div></body></html>$$,
  '["recipient_name", "finalist_count"]'::jsonb,
  true,
  '["round_completed"]'::jsonb,
  NULL,
  'results',
  1
);
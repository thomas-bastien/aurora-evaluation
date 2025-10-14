-- Update all 9 email templates with exact content from the document

UPDATE email_templates
SET 
  name = 'Juror Welcome Letter',
  category = 'juror-welcome',
  subject_template = 'Welcome to the Aurora Tech Award 2025 Selection Process',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>I\'m Kseniia, and I lead everything that turns Aurora from an award into an ecosystem — from sourcing the founders, to shaping their experience, to making sure partners like you get real value out of this process.</p>\n\n<p>This year, we\'ve received applications from multiple countries, and we\'re excited to have you with us as we identify the five women redefining what\'s possible in emerging markets.</p>\n\n<h3>What\'s coming up:</h3>\n<ul>\n<li><strong>December 3:</strong> Access our evaluation site to see the startups curated for your review.</li>\n<li><strong>By December 31:</strong> Submit your feedback (we promise it\'s a quick process). Your scores will help us shortlist the quarter-finalists.</li>\n<li><strong>January 19 - February 2, 2026:</strong> You\'ll hear the quarter-finalists most relevant to you pitch live (virtually) and help select the semi-finalists.</li>\n</ul>\n\n<h3>Your checklist</h3>\n<ul>\n<li>Read the Legal Notice below before scoring.</li>\n<li>Confirm your profile and fund information are up to date.</li>\n<li>Review startup materials, you\'ll receive login details and a quick video walkthrough in the next email.</li>\n<li>Submit your scores by December 31.</li>\n</ul>\n\n<h3>Why this matters:</h3>\n<p>Aurora isn\'t just an award, it\'s a platform rebuilding the system for women founders in emerging markets: how they\'re seen, how they\'re funded, and how they grow.</p>\n\n<p>Every piece of feedback contributes to something bigger, the data, insights, and relationships that will open the next doors for women building the future of tech.</p>\n\n<p>Kseniia</p>\n\n<h3>LEGAL NOTICE</h3>\n<p>By agreeing to participate in the Aurora Tech Award (the "Award") as an External Expert and receiving any information or attachments related to this Award, you acknowledge and agree to the Award\'s Terms and Conditions, Privacy Policy, and any confidentiality terms.</p>\n\n<p>This email message and its attachments are confidential, intended solely for the recipient, and may be legally privileged. Any unauthorized dissemination, copying, or other use of this communication, as well as any actions taken based on the information contained herein, are strictly prohibited.</p>',
  variables = '["juror_name"]'::jsonb,
  display_order = 1,
  trigger_priority = 1,
  lifecycle_stage = 'juror_onboarding',
  evaluation_phase = 'pre_evaluation',
  auto_trigger_events = '["juror_invited"]'::jsonb
WHERE name = 'Juror Welcome Letter';

UPDATE email_templates
SET 
  name = 'Juror Platform Access',
  category = 'juror-access',
  subject_template = 'Your Access to the Aurora Selection Platform 🔑',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>As mentioned in the last email, I\'m excited to invite you to our evaluation platform, designed to make the founder scoring process as smooth and efficient as possible, whilst enabling you to share valuable, anonymous feedback with our founders.</p>\n\n<p><strong>Your access details:</strong></p>\n<p>Login: {{login_email}}</p>\n<p>Password: {{password}}</p>\n\n<p>🎥 Here\'s a quick video tutorial on how to navigate the platform and submit evaluations: {{tutorial_video_url}}</p>\n\n<p>If you have any questions or face any issues, please reach out to k.matveeva@indriver.com, we\'ll be happy to help.</p>\n\n<p>Thank you again for being part of this year\'s selection process. Your feedback truly helps female founders grow.</p>\n\n<p>Best regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name", "login_email", "password", "tutorial_video_url"]'::jsonb,
  display_order = 2,
  trigger_priority = 2,
  lifecycle_stage = 'juror_onboarding',
  evaluation_phase = 'pre_evaluation',
  auto_trigger_events = '["juror_account_created"]'::jsonb
WHERE name = 'Juror Platform Access';

UPDATE email_templates
SET 
  name = 'Juror First Evaluation Reminder',
  category = 'juror-reminder',
  subject_template = 'Your evaluations matter 💡',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>Thank you for collaborating with us on the Aurora Tech Award!</p>\n\n<p>We still need your evaluations for the assigned projects. It won\'t take much time and the process is very straightforward.</p>\n\n<p>For a quick refresher, please check this short 1-minute tutorial video: {{tutorial_video_url}}</p>\n\n<p>Best regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name", "tutorial_video_url"]'::jsonb,
  display_order = 3,
  trigger_priority = 3,
  lifecycle_stage = 'juror_evaluating',
  evaluation_phase = 'active_evaluation',
  auto_trigger_events = '["evaluation_reminder_1"]'::jsonb
WHERE name = 'Juror First Evaluation Reminder';

UPDATE email_templates
SET 
  name = 'Juror Second Evaluation Reminder',
  category = 'juror-reminder',
  subject_template = 'Just a quick reminder to complete your startup evaluations',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>We hope you\'re enjoying discovering this year\'s Aurora applicants!</p>\n\n<p>This is just a friendly reminder to complete your startup evaluations. It only takes a few minutes, and the platform is built to make it easy.</p>\n\n<p>You can review the steps again in this 1-minute tutorial video: {{tutorial_video_url}}</p>\n\n<p>Your insights are deeply appreciated by the founders, your feedback helps them grow and refine their businesses.</p>\n\n<p>Warm regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name", "tutorial_video_url"]'::jsonb,
  display_order = 4,
  trigger_priority = 4,
  lifecycle_stage = 'juror_evaluating',
  evaluation_phase = 'active_evaluation',
  auto_trigger_events = '["evaluation_reminder_2"]'::jsonb
WHERE name = 'Juror Second Evaluation Reminder';

UPDATE email_templates
SET 
  name = 'Juror Final Evaluation Reminder',
  category = 'juror-reminder',
  subject_template = 'Please submit your evaluations ✨',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>This is your final reminder to complete your startup evaluations.</p>\n\n<p>Your feedback is essential to the selection process and it only takes a few minutes to complete.</p>\n\n<p>Here\'s a short 1-minute guide to help: {{tutorial_video_url}}</p>\n\n<p>Our participants truly value your insights, your input makes a real difference in their journey.</p>\n\n<p>With gratitude,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name", "tutorial_video_url"]'::jsonb,
  display_order = 5,
  trigger_priority = 5,
  lifecycle_stage = 'juror_evaluating',
  evaluation_phase = 'active_evaluation',
  auto_trigger_events = '["evaluation_reminder_final"]'::jsonb
WHERE name = 'Juror Final Evaluation Reminder';

UPDATE email_templates
SET 
  name = 'Juror Evaluation Completion',
  category = 'juror-completion',
  subject_template = 'Thank you for completing your evaluations 🙌',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>Thank you so much for evaluating all assigned startups, your contribution is incredibly valuable to our participants and to the Aurora team.</p>\n\n<p>We\'ll be back in touch soon once we finalize the top 30 projects. At that stage, you\'ll also get a chance to review startups shortlisted by other VC partners.</p>\n\n<p>We truly appreciate your continued support!</p>\n\n<p>Warm regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name"]'::jsonb,
  display_order = 6,
  trigger_priority = 6,
  lifecycle_stage = 'juror_completed_screening',
  evaluation_phase = 'post_evaluation',
  auto_trigger_events = '["evaluations_completed"]'::jsonb
WHERE name = 'Juror Evaluation Completion';

UPDATE email_templates
SET 
  name = 'Juror Pitch Session Invitation',
  category = 'pitch-invitation',
  subject_template = 'Next step: Pitch sessions with top 30 startups 🎤',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>Thanks to your valuable input, we\'ve narrowed down the original 100 startups to the top 30 most promising companies.</p>\n\n<p>These founders are now moving on to the next stage: live pitching sessions. The startups you select during these sessions will move forward to the finalist list. Those who will fly to the UAE in April for the Aurora Tech Award ceremony.</p>\n\n<h3>Here\'s what we kindly ask you to do by January 16:</h3>\n<ol>\n<li>Share your Calendly (or other booking link) so founders can schedule a 15–20 minute session with you.\n<ul><li>Each pitch: 5 minutes for presentation + Q&A time.</li></ul>\n</li>\n<li>Conduct your sessions between January 19 – February 4.</li>\n<li>Submit your evaluations directly on the platform after each pitch.</li>\n</ol>\n\n<p>Best regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name"]'::jsonb,
  display_order = 7,
  trigger_priority = 7,
  lifecycle_stage = 'juror_pitching',
  evaluation_phase = 'pitching_phase',
  auto_trigger_events = '["top_30_selected"]'::jsonb
WHERE name = 'Juror Pitch Session Invitation';

UPDATE email_templates
SET 
  name = 'Juror Pitch Session Reminder',
  category = 'pitch-reminder',
  subject_template = E'Don\'t forget to hold your pitch sessions with the participants 🎯',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>Just a quick reminder to conduct your scheduled pitch sessions and submit your selection on the platform.</p>\n\n<p>Your feedback helps us ensure a fair and insightful selection process and it\'s deeply appreciated by our participants.</p>\n\n<p>Thank you for staying engaged through this stage!</p>\n\n<p>Warm regards,<br>\nKseniia<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name"]'::jsonb,
  display_order = 8,
  trigger_priority = 8,
  lifecycle_stage = 'juror_pitching',
  evaluation_phase = 'pitching_phase',
  auto_trigger_events = '["pitch_reminder"]'::jsonb
WHERE name = 'Juror Pitch Session Reminder';

UPDATE email_templates
SET 
  name = 'Juror Final Thank You',
  category = 'juror-final-thankyou',
  subject_template = 'Thank you for being part of the Aurora Tech Award 2026 🌟',
  body_template = E'<p>Hi {{juror_name}},</p>\n\n<p>Thank you for joining us on this journey and taking part in both evaluation stages. Your expertise and time made a real impact on this year\'s selection process.</p>\n\n<p>We\'ll soon announce the Top 15 finalists — stay tuned on our social media channels to see which founders made it to the final!</p>\n\n<p>We\'re proud to have you as part of the Aurora community! Together, we\'re building a stronger future for women-led entrepreneurship.</p>\n\n<p>Warmest regards,<br>\nKseniia<br>\nProduct lead of the Aurora Tech Award<br>\n<a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/">LinkedIn Profile</a></p>',
  variables = '["juror_name"]'::jsonb,
  display_order = 9,
  trigger_priority = 9,
  lifecycle_stage = 'juror_completed_all',
  evaluation_phase = 'final',
  auto_trigger_events = '["program_completed"]'::jsonb
WHERE name = 'Juror Final Thank You';
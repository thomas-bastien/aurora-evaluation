-- Update category constraint to include new jury template categories
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
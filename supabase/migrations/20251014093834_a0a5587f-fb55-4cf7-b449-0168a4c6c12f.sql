-- Drop existing check constraints
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_category_check,
DROP CONSTRAINT IF EXISTS email_templates_lifecycle_stage_check,
DROP CONSTRAINT IF EXISTS email_templates_evaluation_phase_check;

-- Add display_order column if not exists
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS display_order integer;

-- Recreate check constraints with expanded allowed values
ALTER TABLE email_templates
ADD CONSTRAINT email_templates_category_check 
CHECK (category IN (
  'juror-welcome', 'juror-access', 'juror-reminder', 'juror-completion',
  'pitch-invitation', 'pitch-reminder', 'juror-final-thankyou',
  'juror_invitation', 'juror_reminder', 'assignment-notification',
  'evaluation-reminder', 'urgent-reminder', 'results-communication',
  'meeting-scheduling', 'pitch_scheduling', 'founder_rejection',
  'founder_selection', 'top-100-feedback'
));

ALTER TABLE email_templates
ADD CONSTRAINT email_templates_lifecycle_stage_check 
CHECK (lifecycle_stage IN (
  'juror_onboarding', 'juror_evaluating', 'juror_completed_screening',
  'juror_pitching', 'juror_completed_all', 'screening', 'pitching'
));

ALTER TABLE email_templates
ADD CONSTRAINT email_templates_evaluation_phase_check 
CHECK (evaluation_phase IN (
  'pre_evaluation', 'active_evaluation', 'post_evaluation',
  'pitching_phase', 'final', 'results'
));
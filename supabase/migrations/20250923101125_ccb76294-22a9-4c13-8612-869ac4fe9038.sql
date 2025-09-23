-- Add lifecycle_stage and evaluation_phase to email_templates
ALTER TABLE email_templates 
ADD COLUMN lifecycle_stage TEXT CHECK (lifecycle_stage IN ('screening', 'pitching', 'finals')) DEFAULT NULL,
ADD COLUMN evaluation_phase TEXT CHECK (evaluation_phase IN ('pre_evaluation', 'active_evaluation', 'post_evaluation', 'results')) DEFAULT NULL,
ADD COLUMN auto_trigger_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN trigger_priority INTEGER DEFAULT 1;

-- Create lifecycle_participants table to track who's in which stage
CREATE TABLE lifecycle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('startup', 'juror')),
  lifecycle_stage TEXT NOT NULL CHECK (lifecycle_stage IN ('screening', 'pitching', 'finals')),
  stage_entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stage_status TEXT NOT NULL DEFAULT 'active' CHECK (stage_status IN ('active', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lifecycle_participants
ALTER TABLE lifecycle_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for lifecycle_participants
CREATE POLICY "Admins can manage all lifecycle participants" 
ON lifecycle_participants FOR ALL 
TO authenticated 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view lifecycle participants" 
ON lifecycle_participants FOR SELECT 
TO authenticated 
USING (get_current_user_role() = ANY(ARRAY['admin', 'vc']));

-- Add indexes for performance
CREATE INDEX idx_lifecycle_participants_stage ON lifecycle_participants(lifecycle_stage);
CREATE INDEX idx_lifecycle_participants_type_id ON lifecycle_participants(participant_type, participant_id);
CREATE INDEX idx_lifecycle_participants_status ON lifecycle_participants(stage_status);

-- Create function to advance participant to next lifecycle stage
CREATE OR REPLACE FUNCTION advance_participant_lifecycle_stage(
  p_participant_id UUID,
  p_participant_type TEXT,
  p_new_stage TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark current stage as completed if exists
  UPDATE lifecycle_participants 
  SET stage_status = 'completed',
      updated_at = now()
  WHERE participant_id = p_participant_id 
    AND participant_type = p_participant_type
    AND stage_status = 'active';
    
  -- Insert new stage record
  INSERT INTO lifecycle_participants (
    participant_id,
    participant_type, 
    lifecycle_stage,
    stage_status,
    metadata
  ) VALUES (
    p_participant_id,
    p_participant_type,
    p_new_stage,
    'active',
    p_metadata
  );
  
  RETURN TRUE;
END;
$$;

-- Update existing email templates with lifecycle stages
UPDATE email_templates SET 
  lifecycle_stage = 'screening',
  evaluation_phase = 'pre_evaluation',
  auto_trigger_events = '["juror_assigned", "assignment_created"]'::jsonb
WHERE category = 'juror_invitation';

UPDATE email_templates SET 
  lifecycle_stage = 'screening', 
  evaluation_phase = 'active_evaluation',
  auto_trigger_events = '["evaluation_reminder_due"]'::jsonb
WHERE category = 'evaluation_reminder';

UPDATE email_templates SET 
  lifecycle_stage = 'screening',
  evaluation_phase = 'post_evaluation', 
  auto_trigger_events = '["screening_results_ready"]'::jsonb
WHERE category = 'screening_results';

UPDATE email_templates SET 
  lifecycle_stage = 'pitching',
  evaluation_phase = 'pre_evaluation',
  auto_trigger_events = '["startup_selected_for_pitching"]'::jsonb
WHERE category = 'pitch_invitation';

UPDATE email_templates SET 
  lifecycle_stage = 'pitching',
  evaluation_phase = 'active_evaluation', 
  auto_trigger_events = '["pitch_scheduling_due"]'::jsonb
WHERE category = 'pitch_scheduling';

UPDATE email_templates SET 
  lifecycle_stage = 'finals',
  evaluation_phase = 'results',
  auto_trigger_events = '["final_results_ready"]'::jsonb
WHERE category = 'final_results';

-- Add trigger for updated_at on lifecycle_participants
CREATE TRIGGER update_lifecycle_participants_updated_at
  BEFORE UPDATE ON lifecycle_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
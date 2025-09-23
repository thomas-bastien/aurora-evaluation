-- Create communication workflow tables to track participant progress through the 7-stage lifecycle

-- Communication workflow states enum
CREATE TYPE communication_stage AS ENUM (
    'juror_onboarding',
    'assignment_notification', 
    'evaluation_reminders',
    'screening_results',
    'pitching_assignment',
    'pitch_reminders',
    'final_results'
);

CREATE TYPE workflow_status AS ENUM (
    'pending',
    'in_progress', 
    'completed',
    'skipped',
    'failed'
);

-- Communication workflows table to track participant progress
CREATE TABLE public.communication_workflows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('juror', 'startup')),
    current_stage communication_stage NOT NULL DEFAULT 'juror_onboarding',
    stage_status workflow_status NOT NULL DEFAULT 'pending',
    stage_data JSONB DEFAULT '{}',
    stage_entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    next_action_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow triggers table to define when communications should fire
CREATE TABLE public.workflow_triggers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage communication_stage NOT NULL,
    participant_type TEXT NOT NULL CHECK (participant_type IN ('juror', 'startup')),
    trigger_condition JSONB NOT NULL,
    email_template_category TEXT,
    delay_hours INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communication attempts table to track email sending attempts
CREATE TABLE public.communication_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.communication_workflows(id) ON DELETE CASCADE,
    communication_id UUID REFERENCES public.email_communications(id),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    attempt_status TEXT NOT NULL DEFAULT 'pending' CHECK (attempt_status IN ('pending', 'sent', 'failed', 'delivered', 'opened', 'clicked')),
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    attempted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_communication_workflows_participant ON public.communication_workflows(participant_id, participant_type);
CREATE INDEX idx_communication_workflows_stage ON public.communication_workflows(current_stage, stage_status);
CREATE INDEX idx_workflow_triggers_stage ON public.workflow_triggers(stage, participant_type, is_active);
CREATE INDEX idx_communication_attempts_workflow ON public.communication_attempts(workflow_id);

-- Enable RLS
ALTER TABLE public.communication_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for communication_workflows
CREATE POLICY "Admins can manage all workflow records" 
ON public.communication_workflows 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view their own workflow records" 
ON public.communication_workflows 
FOR SELECT 
USING (
    get_current_user_role() = 'vc' AND 
    participant_type = 'juror' AND 
    participant_id IN (
        SELECT id FROM public.jurors WHERE user_id = auth.uid()
    )
);

-- RLS policies for workflow_triggers
CREATE POLICY "Admins can manage all workflow triggers" 
ON public.workflow_triggers 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view workflow triggers" 
ON public.workflow_triggers 
FOR SELECT 
USING (get_current_user_role() = 'vc');

-- RLS policies for communication_attempts
CREATE POLICY "Admins can manage all communication attempts" 
ON public.communication_attempts 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "VCs can view their own communication attempts" 
ON public.communication_attempts 
FOR SELECT 
USING (
    get_current_user_role() = 'vc' AND 
    workflow_id IN (
        SELECT id FROM public.communication_workflows 
        WHERE participant_type = 'juror' 
        AND participant_id IN (
            SELECT id FROM public.jurors WHERE user_id = auth.uid()
        )
    )
);

-- Add updated_at trigger for communication_workflows
CREATE TRIGGER update_communication_workflows_updated_at
BEFORE UPDATE ON public.communication_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for workflow_triggers
CREATE TRIGGER update_workflow_triggers_updated_at
BEFORE UPDATE ON public.workflow_triggers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for communication_attempts
CREATE TRIGGER update_communication_attempts_updated_at
BEFORE UPDATE ON public.communication_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workflow triggers for the 7-stage lifecycle
INSERT INTO public.workflow_triggers (stage, participant_type, trigger_condition, email_template_category, delay_hours, max_attempts) VALUES
-- Stage 1: Juror Onboarding
('juror_onboarding', 'juror', '{"condition": "juror_created", "auto_send": true}', 'juror_invitation', 0, 3),

-- Stage 2: Assignment Notification
('assignment_notification', 'juror', '{"condition": "assignments_created", "auto_send": true}', 'assignment_notification', 0, 2),

-- Stage 3: Evaluation Reminders
('evaluation_reminders', 'juror', '{"condition": "evaluation_overdue", "auto_send": true, "remind_after_hours": 48}', 'evaluation_reminder', 48, 3),

-- Stage 4: Screening Results (to startups)
('screening_results', 'startup', '{"condition": "screening_completed", "auto_send": false}', 'screening_results', 0, 1),

-- Stage 5: Pitching Assignment (to startups)
('pitching_assignment', 'startup', '{"condition": "pitch_selected", "auto_send": true}', 'pitch_invitation', 0, 2),

-- Stage 6: Pitch Reminders (to startups and jurors)
('pitch_reminders', 'startup', '{"condition": "pitch_not_scheduled", "auto_send": true, "remind_after_hours": 96}', 'pitch_reminder', 96, 3),
('pitch_reminders', 'juror', '{"condition": "pitch_not_scheduled", "auto_send": true, "remind_after_hours": 96}', 'pitch_reminder', 96, 3),

-- Stage 7: Final Results (to startups)
('final_results', 'startup', '{"condition": "final_selection_complete", "auto_send": false}', 'final_results', 0, 1);

-- Create function to advance workflow stage
CREATE OR REPLACE FUNCTION public.advance_workflow_stage(
    p_workflow_id UUID,
    p_new_stage communication_stage,
    p_stage_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.communication_workflows
    SET 
        current_stage = p_new_stage,
        stage_status = 'pending',
        stage_data = p_stage_data,
        stage_entered_at = now(),
        stage_completed_at = NULL,
        next_action_due = now() + INTERVAL '1 hour'
    WHERE id = p_workflow_id;
    
    RETURN FOUND;
END;
$$;

-- Create function to complete workflow stage
CREATE OR REPLACE FUNCTION public.complete_workflow_stage(
    p_workflow_id UUID,
    p_completion_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.communication_workflows
    SET 
        stage_status = 'completed',
        stage_completed_at = now(),
        stage_data = stage_data || p_completion_data
    WHERE id = p_workflow_id;
    
    RETURN FOUND;
END;
$$;

-- Create function to get workflow status for a participant
CREATE OR REPLACE FUNCTION public.get_participant_workflow_status(
    p_participant_id UUID,
    p_participant_type TEXT
)
RETURNS TABLE (
    workflow_id UUID,
    current_stage TEXT,
    stage_status TEXT,
    stage_entered_at TIMESTAMP WITH TIME ZONE,
    stage_completed_at TIMESTAMP WITH TIME ZONE,
    next_action_due TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id,
        current_stage::TEXT,
        stage_status::TEXT,
        stage_entered_at,
        stage_completed_at,
        next_action_due
    FROM public.communication_workflows
    WHERE participant_id = p_participant_id 
    AND participant_type = p_participant_type
    ORDER BY created_at DESC
    LIMIT 1;
$$;
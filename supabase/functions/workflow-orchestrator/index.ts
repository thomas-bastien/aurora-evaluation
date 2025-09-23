import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowTriggerRequest {
  participantId: string;
  participantType: 'juror' | 'startup';
  eventType: string;
  eventData?: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { participantId, participantType, eventType, eventData }: WorkflowTriggerRequest = await req.json();

    console.log(`Processing workflow trigger for ${participantType} ${participantId}, event: ${eventType}`);

    // Get or create workflow record for participant
    let { data: workflow, error: workflowError } = await supabase
      .from('communication_workflows')
      .select('*')
      .eq('participant_id', participantId)
      .eq('participant_type', participantType)
      .maybeSingle();

    if (workflowError) {
      console.error('Error fetching workflow:', workflowError);
      throw workflowError;
    }

    // Create workflow if doesn't exist
    if (!workflow) {
      const { data: newWorkflow, error: createError } = await supabase
        .from('communication_workflows')
        .insert({
          participant_id: participantId,
          participant_type: participantType,
          current_stage: 'juror_onboarding',
          stage_status: 'pending',
          next_action_due: new Date(Date.now() + 60000), // 1 minute from now
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating workflow:', createError);
        throw createError;
      }

      workflow = newWorkflow;
    }

    // Determine next stage based on event type and current stage
    const stageMapping = await determineNextStage(eventType, workflow.current_stage, participantType);
    
    if (stageMapping) {
      // Update workflow to new stage
      const { error: updateError } = await supabase
        .from('communication_workflows')
        .update({
          current_stage: stageMapping.nextStage,
          stage_status: 'pending',
          stage_data: { ...workflow.stage_data, ...eventData },
          stage_entered_at: new Date().toISOString(),
          next_action_due: new Date(Date.now() + (stageMapping.delayHours * 60 * 60 * 1000)),
        })
        .eq('id', workflow.id);

      if (updateError) {
        console.error('Error updating workflow:', updateError);
        throw updateError;
      }

      // Check if we should trigger an email
      if (stageMapping.shouldTriggerEmail) {
        await triggerCommunication(supabase, workflow.id, stageMapping.nextStage, participantId, participantType, eventData);
      }
    }

    // Process any pending communications
    await processPendingCommunications(supabase);

    return new Response(
      JSON.stringify({ success: true, workflowId: workflow.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in workflow orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function determineNextStage(eventType: string, currentStage: string, participantType: string) {
  const stageTransitions = {
    'juror_created': {
      nextStage: 'juror_onboarding',
      shouldTriggerEmail: true,
      delayHours: 0,
    },
    'juror_signup_completed': {
      nextStage: 'assignment_notification',
      shouldTriggerEmail: false,
      delayHours: 0,
    },
    'assignments_created': {
      nextStage: 'assignment_notification',
      shouldTriggerEmail: true,
      delayHours: 0,
    },
    'evaluation_overdue': {
      nextStage: 'evaluation_reminders',
      shouldTriggerEmail: true,
      delayHours: 0,
    },
    'screening_completed': {
      nextStage: 'screening_results',
      shouldTriggerEmail: false, // Manual trigger
      delayHours: 0,
    },
    'pitch_selected': {
      nextStage: 'pitching_assignment',
      shouldTriggerEmail: true,
      delayHours: 0,
    },
    'pitch_not_scheduled': {
      nextStage: 'pitch_reminders',
      shouldTriggerEmail: true,
      delayHours: 0,
    },
    'final_selection_complete': {
      nextStage: 'final_results',
      shouldTriggerEmail: false, // Manual trigger
      delayHours: 0,
    },
  };

  return stageTransitions[eventType as keyof typeof stageTransitions] || null;
}

async function triggerCommunication(
  supabase: any,
  workflowId: string,
  stage: string,
  participantId: string,
  participantType: string,
  eventData: any
) {
  // Get workflow trigger configuration
  const { data: trigger, error: triggerError } = await supabase
    .from('workflow_triggers')
    .select('*')
    .eq('stage', stage)
    .eq('participant_type', participantType)
    .eq('is_active', true)
    .maybeSingle();

  if (triggerError || !trigger) {
    console.log(`No active trigger found for stage ${stage} and participant type ${participantType}`);
    return;
  }

  // Get participant details
  const tableName = participantType === 'juror' ? 'jurors' : 'startups';
  const { data: participant, error: participantError } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', participantId)
    .single();

  if (participantError || !participant) {
    console.error(`Error fetching ${participantType}:`, participantError);
    return;
  }

  // Create communication attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from('communication_attempts')
    .insert({
      workflow_id: workflowId,
      attempt_number: 1,
      attempt_status: 'pending',
      scheduled_at: new Date(Date.now() + (trigger.delay_hours * 60 * 60 * 1000)),
    })
    .select()
    .single();

  if (attemptError) {
    console.error('Error creating communication attempt:', attemptError);
    return;
  }

  // If no delay, send immediately
  if (trigger.delay_hours === 0) {
    await sendCommunication(supabase, attempt.id, trigger, participant, eventData);
  }
}

async function sendCommunication(
  supabase: any,
  attemptId: string,
  trigger: any,
  participant: any,
  eventData: any
) {
  try {
    // Get email template
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('category', trigger.email_template_category)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!template) {
      console.log(`No template found for category: ${trigger.email_template_category}`);
      return;
    }

    // Prepare email variables
    const variables = {
      participant_name: participant.name,
      participant_email: participant.email,
      ...eventData,
    };

    // Send email via send-email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        recipientEmail: participant.email,
        recipientType: trigger.participant_type,
        recipientId: participant.id,
        templateId: template.id,
        variables: variables,
      },
    });

    // Update communication attempt
    await supabase
      .from('communication_attempts')
      .update({
        attempt_status: emailError ? 'failed' : 'sent',
        attempted_at: new Date().toISOString(),
        error_message: emailError?.message,
        communication_id: emailResult?.communicationId,
      })
      .eq('id', attemptId);

    console.log(`Email ${emailError ? 'failed' : 'sent'} for attempt ${attemptId}`);

  } catch (error: any) {
    console.error('Error sending communication:', error);
    
    await supabase
      .from('communication_attempts')
      .update({
        attempt_status: 'failed',
        attempted_at: new Date().toISOString(),
        error_message: error.message,
      })
      .eq('id', attemptId);
  }
}

async function processPendingCommunications(supabase: any) {
  // Get pending communications that are due
  const { data: pendingAttempts, error } = await supabase
    .from('communication_attempts')
    .select(`
      *,
      communication_workflows (
        participant_id,
        participant_type,
        current_stage,
        stage_data
      )
    `)
    .eq('attempt_status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(10);

  if (error || !pendingAttempts?.length) {
    return;
  }

  for (const attempt of pendingAttempts) {
    const workflow = attempt.communication_workflows;
    
    // Get trigger and participant details
    const { data: trigger } = await supabase
      .from('workflow_triggers')
      .select('*')
      .eq('stage', workflow.current_stage)
      .eq('participant_type', workflow.participant_type)
      .eq('is_active', true)
      .maybeSingle();

    const tableName = workflow.participant_type === 'juror' ? 'jurors' : 'startups';
    const { data: participant } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', workflow.participant_id)
      .single();

    if (trigger && participant) {
      await sendCommunication(supabase, attempt.id, trigger, participant, workflow.stage_data);
    }
  }
}

serve(handler);
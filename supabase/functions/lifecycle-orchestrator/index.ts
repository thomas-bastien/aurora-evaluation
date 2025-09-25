import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LifecycleTriggerRequest {
  eventType: string;
  participantId: string;
  participantType: 'startup' | 'juror';
  lifecycleStage: string;
  eventData?: any;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, participantId, participantType, lifecycleStage, eventData }: LifecycleTriggerRequest = await req.json();
    
    console.log(`Processing lifecycle event: ${eventType} for ${participantType} ${participantId} in stage ${lifecycleStage}`);

    // Get templates that should be triggered for this event
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('lifecycle_stage', lifecycleStage)
      .eq('is_active', true)
      .contains('auto_trigger_events', [eventType]);

    if (templatesError) {
      throw new Error(`Failed to fetch email templates: ${templatesError.message}`);
    }

    console.log(`Found ${templates?.length || 0} templates to trigger for event ${eventType}`);

    // Process each template
    for (const template of templates || []) {
      await triggerCommunication(participantId, participantType, template, eventData);
    }

    // Update participant lifecycle stage if needed
    if (shouldAdvanceStage(eventType)) {
      const nextStage = getNextLifecycleStage(lifecycleStage, eventType);
      if (nextStage) {
        await advanceParticipantStage(participantId, participantType, nextStage, eventData);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${templates?.length || 0} communications for ${eventType}` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in lifecycle-orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

async function triggerCommunication(participantId: string, participantType: string, template: any, eventData: any) {
  // Get participant details
  const tableName = participantType === 'startup' ? 'startups' : 'jurors';
  const emailField = participantType === 'startup' ? 'contact_email' : 'email';
  const nameField = participantType === 'startup' ? 'name' : 'name';

  const { data: participant, error: participantError } = await supabase
    .from(tableName)
    .select(`id, ${nameField}, ${emailField}`)
    .eq('id', participantId)
    .single();

  if (participantError) {
    console.error(`Failed to fetch ${participantType} details:`, participantError);
    return;
  }

  if (!(participant as any)[emailField]) {
    console.error(`No email found for ${participantType} ${participantId}`);
    return;
  }

  // Prepare variables for template substitution
  const variables = {
    participant_name: (participant as any)[nameField],
    participant_email: (participant as any)[emailField],
    ...eventData
  };

  console.log(`Triggering communication: ${template.name} to ${(participant as any)[emailField]}`);

  // Call send-email function
  const { error: emailError } = await supabase.functions.invoke('send-email', {
    body: {
      templateId: template.id,
      recipientId: participantId,
      recipientType: participantType,
      recipientEmail: (participant as any)[emailField],
      variables
    }
  });

  if (emailError) {
    console.error(`Failed to send email:`, emailError);
  } else {
    console.log(`Successfully triggered email: ${template.name}`);
  }
}

function shouldAdvanceStage(eventType: string): boolean {
  const advancingEvents = [
    'screening_results_ready',
    'startup_selected_for_pitching', 
    'pitch_evaluations_complete',
    'final_results_ready'
  ];
  return advancingEvents.includes(eventType);
}

function getNextLifecycleStage(currentStage: string, eventType: string): string | null {
  const stageTransitions = {
    'screening': {
      'screening_results_ready': 'pitching',
      'startup_selected_for_pitching': 'pitching'
    },
    'pitching': {
      'pitch_evaluations_complete': 'finals',
      'final_results_ready': 'finals'
    }
  };

  return (stageTransitions as any)[currentStage]?.[eventType] || null;
}

async function advanceParticipantStage(participantId: string, participantType: string, newStage: string, metadata: any = {}) {
  console.log(`Advancing ${participantType} ${participantId} to stage: ${newStage}`);
  
  const { error } = await supabase.rpc('advance_participant_lifecycle_stage', {
    p_participant_id: participantId,
    p_participant_type: participantType,
    p_new_stage: newStage,
    p_metadata: metadata
  });

  if (error) {
    console.error('Failed to advance lifecycle stage:', error);
  } else {
    console.log(`Successfully advanced ${participantType} ${participantId} to ${newStage}`);
  }
}

serve(handler);
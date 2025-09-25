import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting login reminder check...');

    // Define thresholds
    const DAYS_AFTER_INVITATION = 3; // Send reminder 3 days after invitation
    const REMINDER_COOLDOWN_DAYS = 2; // Don't send another reminder for 2 days

    const invitationCutoff = new Date();
    invitationCutoff.setDate(invitationCutoff.getDate() - DAYS_AFTER_INVITATION);

    const reminderCooldown = new Date();
    reminderCooldown.setDate(reminderCooldown.getDate() - REMINDER_COOLDOWN_DAYS);

    console.log(`Checking for jurors invited before: ${invitationCutoff.toISOString()}`);
    console.log(`Reminder cooldown cutoff: ${reminderCooldown.toISOString()}`);

    // Find jurors who need login reminders
    const { data: jurorsNeedingReminders, error: jurorsError } = await supabase
      .from('jurors')
      .select('id, name, email, invitation_sent_at, invitation_expires_at, invitation_token')
      .is('user_id', null) // Never logged in
      .not('invitation_sent_at', 'is', null) // Invitation was sent
      .lt('invitation_sent_at', invitationCutoff.toISOString()) // Invitation sent more than X days ago
      .gt('invitation_expires_at', new Date().toISOString()); // Invitation not expired

    if (jurorsError) {
      throw new Error(`Failed to fetch jurors: ${jurorsError.message}`);
    }

    console.log(`Found ${jurorsNeedingReminders?.length || 0} jurors who never logged in`);

    let remindersTriggered = 0;

    // Filter out jurors who already received a recent login reminder
    for (const juror of jurorsNeedingReminders || []) {
      // Check if this juror already received a login reminder recently
      const { data: recentReminders, error: reminderCheckError } = await supabase
        .from('email_communications')
        .select('sent_at')
        .eq('recipient_id', juror.id)
        .eq('recipient_type', 'juror')
        .like('subject', '%Complete Your Registration%') // Login reminder subject
        .gt('sent_at', reminderCooldown.toISOString())
        .limit(1);

      if (reminderCheckError) {
        console.error(`Error checking recent reminders for juror ${juror.id}:`, reminderCheckError);
        continue;
      }

      if (recentReminders && recentReminders.length > 0) {
        console.log(`Skipping juror ${juror.name} - already received reminder recently`);
        continue;
      }

      // Calculate days since invitation
      const daysSinceInvitation = Math.floor(
        (Date.now() - new Date(juror.invitation_sent_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Trigger login reminder
      console.log(`Triggering login reminder for juror: ${juror.name} (${daysSinceInvitation} days since invitation)`);

      const { error: orchestratorError } = await supabase.functions.invoke('lifecycle-orchestrator', {
        body: {
          eventType: 'login_reminder_needed',
          participantId: juror.id,
          participantType: 'juror',
          lifecycleStage: 'screening',
          eventData: {
            juror_name: juror.name,
            days_since_invitation: daysSinceInvitation,
            magic_link: `${Deno.env.get('FRONTEND_URL')}/juror/auth?token=${juror.invitation_token}`,
            expiry_date: new Date(juror.invitation_expires_at).toLocaleDateString()
          }
        }
      });

      if (orchestratorError) {
        console.error(`Failed to trigger reminder for juror ${juror.id}:`, orchestratorError);
      } else {
        remindersTriggered++;
        console.log(`Successfully triggered reminder for ${juror.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Login reminder check completed. Triggered ${remindersTriggered} reminders out of ${jurorsNeedingReminders?.length || 0} candidates.`,
        jurorsChecked: jurorsNeedingReminders?.length || 0,
        remindersTriggered
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in check-login-reminders:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
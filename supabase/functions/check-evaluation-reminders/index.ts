import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log('Processing automated evaluation reminders');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get current active round
    const { data: activeRound, error: roundError } = await supabase
      .from('rounds')
      .select('id, name')
      .eq('status', 'active')
      .single();

    if (roundError || !activeRound) {
      console.log('No active round found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active round found',
        sentCount: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Active round:', activeRound.name);

    // Determine table names based on round
    const isScreeningRound = activeRound.name === 'screening';
    const assignmentTable = isScreeningRound ? 'screening_assignments' : 'pitching_assignments';
    const evaluationTable = isScreeningRound ? 'screening_evaluations' : 'pitching_evaluations';
    const templateCategory = isScreeningRound ? 'juror-reminder' : 'juror-reminder';
    const roundDisplayName = isScreeningRound ? 'Screening' : 'Pitching';

    // Get all jurors with assignments in this round
    const { data: jurorsWithAssignments, error: jurorError } = await supabase
      .from('jurors')
      .select(`
        *,
        ${assignmentTable}!inner(startup_id, status)
      `);

    if (jurorError) throw jurorError;

    const eligibleJurors: any[] = [];
    
    // Check completion rates and throttling for each juror
    for (const juror of jurorsWithAssignments || []) {
      // Skip jurors without user_id (not activated)
      if (!juror.user_id) continue;

      const assignmentField = isScreeningRound ? 'screening_assignments' : 'pitching_assignments';
      const assignments = juror[assignmentField] || [];
      const assignedCount = assignments.length;
      
      if (assignedCount === 0) continue;

      // Get evaluations for this juror
      const { data: evaluations, error: evalError } = await supabase
        .from(evaluationTable)
        .select('id, status')
        .eq('evaluator_id', juror.user_id)
        .in('startup_id', assignments.map((a: any) => a.startup_id));

      if (evalError) continue;

      const completedCount = evaluations?.filter(e => e.status === 'submitted').length || 0;
      const completionRate = assignedCount > 0 ? (completedCount / assignedCount) * 100 : 0;

      // Skip if juror is already 100% complete
      if (completionRate >= 100) continue;

      // Check for recent reminders (7-day throttling) - skip in TEST_MODE
      const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
      
      if (!TEST_MODE) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentReminder, error: reminderError } = await supabase
          .from('email_communications')
          .select('id')
          .eq('recipient_type', 'juror')
          .eq('recipient_id', juror.id)
          .or('subject.ilike.%reminder%,subject.ilike.%evaluation%')
          .gte('created_at', sevenDaysAgo)
          .limit(1);

        // Skip if reminder sent within last 7 days
        if (recentReminder && recentReminder.length > 0) {
          console.log(`Skipping ${juror.name} - reminder sent within last 7 days`);
          continue;
        }
      } else {
        console.log(`🧪 SANDBOX MODE: Skipping throttling for ${juror.name}`);
      }

      eligibleJurors.push({
        ...juror,
        assignedCount,
        completedCount,
        pendingCount: assignedCount - completedCount,
        completionRate: Math.round(completionRate)
      });
    }

    console.log(`Found ${eligibleJurors.length} eligible jurors for reminders`);

    let sentCount = 0;
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://fadxytngwiporjqchsem.supabase.co';
    const TEST_MODE = Deno.env.get("TEST_MODE") === "true";

    // Send reminders to eligible jurors
    for (const juror of eligibleJurors) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            templateCategory: templateCategory,
            recipientEmail: juror.email,
            recipientType: 'juror',
            recipientId: juror.id,
            variables: {
              juror_name: juror.name,
              round_name: roundDisplayName,
              completion_rate: juror.completionRate,
              pending_count: juror.pendingCount,
              login_link: frontendUrl
            },
            preventDuplicates: !TEST_MODE // Disable duplicate prevention in TEST_MODE
          }
        });

        if (emailError) {
          console.error(`Failed to send reminder to ${juror.name}:`, emailError);
        } else {
          sentCount++;
          console.log(`Reminder sent to ${juror.name}`);
        }
      } catch (error) {
        console.error(`Error sending reminder to ${juror.name}:`, error);
      }
    }

    console.log(`Successfully sent ${sentCount} reminders`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Sent ${sentCount} evaluation reminders`,
      sentCount,
      eligibleCount: eligibleJurors.length,
      roundName: activeRound.name
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in check-evaluation-reminders function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process reminders',
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
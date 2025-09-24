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

interface JurorReminderRequest {
  jurorId: string;
  email: string;
  roundName?: string;
  pendingCount?: number;
  completionRate?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Processing juror reminder request');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jurorId, email, roundName, pendingCount, completionRate }: JurorReminderRequest = await req.json();
    console.log('Sending reminder to juror:', { jurorId, email, roundName });

    // Get current active round if not provided
    let currentRoundName = roundName;
    if (!currentRoundName) {
      const { data: activeRound } = await supabase
        .from('rounds')
        .select('name')
        .eq('status', 'active')
        .single();
      
      currentRoundName = activeRound?.name === 'screening' ? 'Screening' : 'Pitching';
    }

    // Check for recent reminders (7-day throttling) specific to this round
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReminder } = await supabase
      .from('email_communications')
      .select('id, metadata')
      .eq('recipient_type', 'juror')
      .eq('recipient_id', jurorId)
      .or('subject.ilike.%reminder%,subject.ilike.%evaluation%')
      .gte('created_at', sevenDaysAgo);

    // Filter by round name in metadata
    const roundSpecificReminder = recentReminder?.find(reminder => {
      const metadata = reminder.metadata as any;
      const reminderRoundName = metadata?.variables?.round_name;
      return reminderRoundName === currentRoundName;
    });

    if (roundSpecificReminder) {
      console.log(`Reminder already sent within last 7 days for ${currentRoundName} round`);
      return new Response(JSON.stringify({ 
        success: false,
        message: `Reminder already sent within last 7 days for ${currentRoundName} round`,
        throttled: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch juror details
    const { data: juror, error: jurorError } = await supabase
      .from('jurors')
      .select('name, email, company, job_title, user_id')
      .eq('id', jurorId)
      .single();

    if (jurorError) {
      console.error('Error fetching juror:', jurorError);
      throw new Error('Juror not found');
    }


    // Calculate pending count and completion rate if not provided
    let calculatedPendingCount = pendingCount;
    let calculatedCompletionRate = completionRate;
    
    if (calculatedPendingCount === undefined || calculatedCompletionRate === undefined) {
      // Determine round-specific tables
      const isScreeningRound = currentRoundName?.toLowerCase().includes('screening');
      const assignmentTable = isScreeningRound ? 'screening_assignments' : 'pitching_assignments';
      const evaluationTable = isScreeningRound ? 'screening_evaluations' : 'pitching_evaluations';

      // Get assignments
      const { data: assignments } = await supabase
        .from(assignmentTable)
        .select('startup_id')
        .eq('juror_id', jurorId);

      const assignedCount = assignments?.length || 0;

      // Get evaluations if juror has user_id
      let completedCount = 0;
      if (juror.user_id && assignedCount > 0) {
        const { data: evaluations } = await supabase
          .from(evaluationTable)
          .select('id')
          .eq('evaluator_id', juror.user_id)
          .eq('status', 'submitted')
          .in('startup_id', assignments!.map(a => a.startup_id));

        completedCount = evaluations?.length || 0;
      }

      calculatedPendingCount = Math.max(assignedCount - completedCount, 0);
      calculatedCompletionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://fadxytngwiporjqchsem.supabase.co';
    const templateCategory = currentRoundName?.toLowerCase().includes('screening') ? 'juror-reminder' : 'juror-reminder';

    // Send reminder using send-email function for proper tracking
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        templateCategory: templateCategory,
        recipientEmail: email,
        recipientType: 'juror',
        recipientId: jurorId,
        variables: {
          juror_name: juror.name,
          round_name: currentRoundName,
          completion_rate: calculatedCompletionRate,
          pending_count: calculatedPendingCount,
          login_link: frontendUrl
        },
        preventDuplicates: true
      }
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error('Failed to send email');
    }

    console.log('Email sent successfully via send-email function');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Reminder sent successfully',
      communicationId: emailResult?.communicationId,
      roundName: currentRoundName,
      pendingCount: calculatedPendingCount,
      completionRate: calculatedCompletionRate
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-juror-reminder function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send reminder',
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
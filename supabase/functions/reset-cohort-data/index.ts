import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  cohortId: string;
  cohortName: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Only admins can reset cohort data');
    }

    const { cohortId, cohortName }: ResetRequest = await req.json();

    if (!cohortId || !cohortName) {
      throw new Error('Cohort ID and name are required');
    }

    console.log(`Starting reset for cohort: ${cohortName} (${cohortId})`);

    // Track deleted records
    const recordsDeleted: Record<string, number> = {};

    // First, fetch all startup IDs and juror IDs to use in deletion queries
    const { data: startupData } = await supabase
      .from('startups')
      .select('id');
    
    const { data: jurorData } = await supabase
      .from('jurors')
      .select('id');

    const startupIds = startupData?.map(s => s.id) || [];
    const jurorIds = jurorData?.map(j => j.id) || [];

    console.log(`Found ${startupIds.length} startups and ${jurorIds.length} jurors to process`);

    // Early return if no data to delete
    if (startupIds.length === 0 && jurorIds.length === 0) {
      console.log('No startups or jurors found, nothing to delete');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          recordsDeleted: {},
          message: 'No data to reset'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Delete in proper order respecting foreign key constraints
    
    // 1. Delete evaluations first (they reference assignments and startups/jurors)
    if (startupIds.length > 0) {
      const { count: screeningEvals } = await supabase
        .from('screening_evaluations')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.screening_evaluations = screeningEvals || 0;

      const { count: pitchingEvals } = await supabase
        .from('pitching_evaluations')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.pitching_evaluations = pitchingEvals || 0;

      // 2. Delete assignments
      const { count: screeningAssigns } = await supabase
        .from('screening_assignments')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.screening_assignments = screeningAssigns || 0;

      const { count: pitchingAssigns } = await supabase
        .from('pitching_assignments')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.pitching_assignments = pitchingAssigns || 0;

      // 3. Delete pitch requests
      const { count: pitchReqs } = await supabase
        .from('pitch_requests')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.pitch_requests = pitchReqs || 0;

      // 4. Delete calendar invitations
      const { count: calInvites } = await supabase
        .from('cm_calendar_invitations')
        .delete()
        .in('startup_id', startupIds)
        .select('*', { count: 'exact', head: true });
      recordsDeleted.cm_calendar_invitations = calInvites || 0;
    }

    // 5. Delete communication attempts (references workflows)
    const { count: commAttempts } = await supabase
      .from('communication_attempts')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.communication_attempts = commAttempts || 0;

    // 6. Delete email delivery events (references communications)
    const { count: emailEvents } = await supabase
      .from('email_delivery_events')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.email_delivery_events = emailEvents || 0;

    // 7. Delete email communications
    const { count: emails } = await supabase
      .from('email_communications')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.email_communications = emails || 0;

    // 8. Delete communication workflows
    const { count: workflows } = await supabase
      .from('communication_workflows')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.communication_workflows = workflows || 0;

    // 9. Delete lifecycle participants
    const { count: lifecycle } = await supabase
      .from('lifecycle_participants')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.lifecycle_participants = lifecycle || 0;

    // 10. Delete session relationships
    const { count: startupSessions } = await supabase
      .from('startup_sessions')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.startup_sessions = startupSessions || 0;

    const { count: vcSessions } = await supabase
      .from('vc_sessions')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.vc_sessions = vcSessions || 0;

    // 11. Delete sessions
    const { count: sessions } = await supabase
      .from('sessions')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.sessions = sessions || 0;

    // 12. Delete startup round statuses
    const { count: roundStatuses } = await supabase
      .from('startup_round_statuses')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.startup_round_statuses = roundStatuses || 0;

    // 13. Get juror user_ids before deleting jurors
    const { data: jurors } = await supabase
      .from('jurors')
      .select('user_id')
      .not('user_id', 'is', null);

    const jurorUserIds = jurors?.map(j => j.user_id).filter(Boolean) || [];

    // 14. Delete startups
    const { count: startupsCount } = await supabase
      .from('startups')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.startups = startupsCount || 0;

    // 15. Delete jurors
    const { count: jurorsCount } = await supabase
      .from('jurors')
      .delete()
      .select('*', { count: 'exact', head: true });
    recordsDeleted.jurors = jurorsCount || 0;

    // 16. Delete auth users for jurors (using service role)
    if (jurorUserIds.length > 0) {
      let deletedAuthUsers = 0;
      for (const userId of jurorUserIds) {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (!error) deletedAuthUsers++;
      }
      recordsDeleted.juror_auth_users = deletedAuthUsers;
    }

    // 17. Reset rounds to initial state
    const { count: roundsReset } = await supabase
      .from('rounds')
      .update({ 
        status: 'pending',
        started_at: null,
        completed_at: null
      })
      .select('*', { count: 'exact', head: true });
    recordsDeleted.rounds_reset = roundsReset || 0;

    // Log the reset action
    const { error: logError } = await supabase
      .from('cohort_reset_logs')
      .insert({
        cohort_id: cohortId,
        cohort_name: cohortName,
        triggered_by: user.id,
        records_deleted: recordsDeleted,
        notes: 'Cohort data reset completed successfully'
      });

    if (logError) {
      console.error('Failed to log reset:', logError);
    }

    console.log(`Reset complete for cohort: ${cohortName}`);
    console.log('Records deleted:', recordsDeleted);

    return new Response(
      JSON.stringify({ 
        success: true, 
        recordsDeleted,
        message: 'Cohort data reset successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Reset error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

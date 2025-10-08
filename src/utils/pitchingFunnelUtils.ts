import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for pitching funnel step data
 */
export interface FunnelStepData {
  title: string;
  description: string;
  numerator: number;
  denominator: number;
  percentage: number;
  route: string;
  status: 'completed' | 'in-progress' | 'pending';
  tooltip: string;
}

/**
 * Step 1: Matchmaking (Pitching)
 * C = # startups that have ≥3 assignments OR are rejected ÷ D (total pitching startups including rejected)
 */
export const getPitchingMatchmakingStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get pitching round
    const { data: pitchingRound } = await supabase
      .from('rounds')
      .select('id')
      .eq('name', 'pitching')
      .maybeSingle();

    if (!pitchingRound) {
      return {
        title: "Matchmaking",
        description: "Startups with assignments or rejected",
        numerator: 0,
        denominator: 0,
        percentage: 0,
        route: "/selection?round=pitching&tab=matchmaking",
        status: 'pending',
        tooltip: "A startup counts as complete if it has at least 3 juror assignments OR is already rejected in Pitching"
      };
    }

    // Get total startups in pitching round (D = 4, including rejected)
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review', 'rejected']);

    const denominator = totalPitchingStartups || 0;

    // Get rejected startups (automatically count as complete)
    const { count: rejectedStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .eq('status', 'rejected');

    // Count startups with ≥3 pitching assignments
    const { data: assignmentCounts } = await supabase
      .from('pitching_assignments')
      .select('startup_id')
      .eq('status', 'assigned');

    const startupAssignmentCounts: { [key: string]: number } = {};
    assignmentCounts?.forEach((assignment) => {
      const startupId = assignment.startup_id;
      startupAssignmentCounts[startupId] = (startupAssignmentCounts[startupId] || 0) + 1;
    });

    const startupsWithAssignments = Object.values(startupAssignmentCounts).filter(count => count >= 3).length;
    const numerator = startupsWithAssignments + (rejectedStartups || 0);
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Matchmaking",
      description: "Startups with assignments or rejected",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=matchmaking",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending',
      tooltip: "A startup counts as complete if it has at least 3 juror assignments OR is already rejected in Pitching"
    };
  } catch (error) {
    console.error('Error fetching pitching matchmaking data:', error);
    return {
      title: "Matchmaking",
      description: "Startups with assignments or rejected",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=matchmaking",
      status: 'pending',
      tooltip: "A startup counts as complete if it has at least 3 juror assignments OR is already rejected in Pitching"
    };
  }
};

/**
 * Step 2: Pitching Calls
 * Completion % = completed calls ÷ total pitch calls (Pitching Round)
 */
export const getPitchingCallsStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get all pitching assignments (total pitch calls)
    const { data: assignments } = await supabase
      .from('pitching_assignments')
      .select('status, meeting_scheduled_date, meeting_completed_date');

    const denominator = assignments?.length || 0;

    // Helper function to determine if call is completed (matching useMeetingsData logic)
    const isCompleted = (assignment: any): boolean => {
      return assignment.meeting_completed_date || assignment.status === 'completed';
    };

    // Count completed calls
    const numerator = assignments?.filter(isCompleted).length || 0;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Pitching Calls",
      description: "Calls completed",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=juror-progress",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending',
      tooltip: "Shows progress of pitch meetings completed compared to total pitch calls assigned in Pitching Round"
    };
  } catch (error) {
    console.error('Error fetching pitching calls data:', error);
    return {
      title: "Pitching Calls",
      description: "Calls completed",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=juror-progress",
      status: 'pending',
      tooltip: "Shows progress of pitch meetings completed compared to total pitch calls assigned in Pitching Round"
    };
  }
};

/**
 * Step 3: Evaluations (Pitching)
 * Completion % = evaluations submitted ÷ total expected evaluations
 */
export const getPitchingEvaluationsStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get total expected evaluations
    const { count: totalAssignments } = await supabase
      .from('pitching_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    const denominator = totalAssignments || 0;

    // Get submitted evaluations
    const { count: submittedEvaluations } = await supabase
      .from('pitching_evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted');

    const numerator = submittedEvaluations || 0;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Evaluations",
      description: "Evaluations submitted",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=juror-progress",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending',
      tooltip: "Shows progress of Pitching evaluations submitted compared to the total assigned in Pitching"
    };
  } catch (error) {
    console.error('Error fetching pitching evaluations data:', error);
    return {
      title: "Evaluations",
      description: "Evaluations submitted",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=juror-progress",
      status: 'pending',
      tooltip: "Shows progress of Pitching evaluations submitted compared to the total assigned in Pitching"
    };
  }
};

/**
 * Step 4: Selection – Finalists
 * Completion % = startups marked as Finalists ÷ total startups in pitching round
 */
export const getPitchingSelectionStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get pitching round
    const { data: pitchingRound } = await supabase
      .from('rounds')
      .select('id')
      .eq('name', 'pitching')
      .maybeSingle();

    if (!pitchingRound) {
    return {
      title: "Selection",
      description: "Startups marked as Finalists",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=startup-selection",
      status: 'pending',
      tooltip: "Completion rate = proportion of Pitching startups marked as Finalists compared to the total Pitching cohort"
    };
    }

    // Get total startups in pitching round (D = 4, including rejected)
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review', 'rejected']);

    const denominator = totalPitchingStartups || 0;

    // Get startups marked as selected (finalists)
    const { count: selectedStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .eq('status', 'selected');

    const numerator = selectedStartups || 0;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Selection",
      description: "Startups marked as Finalists",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=startup-selection",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending',
      tooltip: "Completion rate = proportion of Pitching startups marked as Finalists compared to the total Pitching cohort"
    };
  } catch (error) {
    console.error('Error fetching pitching selection data:', error);
    return {
      title: "Selection",
      description: "Startups marked as Finalists",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=startup-selection",
      status: 'pending',
      tooltip: "Completion rate = proportion of Pitching startups marked as Finalists compared to the total Pitching cohort"
    };
  }
};

/**
 * Step 5: Results & Communication (Pitching)
 * Completion % = startups notified ÷ total startups in pitching round
 */
export const getPitchingCommunicationStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get pitching round
    const { data: pitchingRound } = await supabase
      .from('rounds')
      .select('id')
      .eq('name', 'pitching')
      .maybeSingle();

    if (!pitchingRound) {
    return {
      title: "Results & Communication",
      description: "Startups notified",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=communications",
      status: 'pending',
      tooltip: "Completion rate = proportion of Pitching startups that have been sent their results and feedback compared to the total Pitching cohort"
    };
    }

    // Get total startups in pitching round (D = 4, including rejected)
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review', 'rejected']);

    // Get startups that should receive communications (selected or rejected)
    const { data: processedStartups } = await supabase
      .from('startup_round_statuses')
      .select('startup_id')
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'rejected']);

    const expectedCount = processedStartups?.length || 0;

    // Get actual communications sent
    const { data: sentCommunications } = await supabase
      .from('email_communications')
      .select('recipient_id')
      .eq('recipient_type', 'startup')
      .eq('round_name', 'pitching')
      .in('status', ['sent', 'delivered'])
      .in('communication_type', ['selection', 'rejection']);

    // Count unique startups that have been notified
    const uniqueNotifiedStartups = new Set(
      sentCommunications?.map(c => c.recipient_id) || []
    );
    const numerator = uniqueNotifiedStartups.size;
    const denominator = expectedCount;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Results & Communication",
      description: "Startups notified",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=communications",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending',
      tooltip: "Shows how many startups (selected or rejected) have been sent their Pitching results via email."
    };
  } catch (error) {
    console.error('Error fetching pitching communication data:', error);
    return {
      title: "Results & Communication",
      description: "Startups notified",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=communications",
      status: 'pending',
      tooltip: "Shows how many startups (selected or rejected) have been sent their Pitching results via email."
    };
  }
};

/**
 * Get all pitching funnel data
 */
export const getPitchingFunnelData = async (): Promise<FunnelStepData[]> => {
  const [
    matchmaking,
    calls,
    evaluations,
    selection,
    communication
  ] = await Promise.all([
    getPitchingMatchmakingStepData(),
    getPitchingCallsStepData(),
    getPitchingEvaluationsStepData(),
    getPitchingSelectionStepData(),
    getPitchingCommunicationStepData()
  ]);

  return [matchmaking, calls, evaluations, selection, communication];
};
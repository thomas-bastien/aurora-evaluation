import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for pitching funnel step data
 */
interface FunnelStepData {
  title: string;
  description: string;
  numerator: number;
  denominator: number;
  percentage: number;
  route: string;
  status: 'completed' | 'in-progress' | 'pending';
}

/**
 * Step 1: Matchmaking (Pitching)
 * Completion % = startups with ≥3 evaluations submitted ÷ total startups in pitching round
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
        description: "Startups with ≥3 evaluations",
        numerator: 0,
        denominator: 0,
        percentage: 0,
        route: "/selection?round=pitching&tab=matchmaking",
        status: 'pending'
      };
    }

    // Get total startups in pitching round
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review']);

    const denominator = totalPitchingStartups || 0;

    // Count startups with ≥3 pitching evaluations
    const { data: evaluationCounts } = await supabase
      .from('pitching_evaluations')
      .select('startup_id')
      .eq('status', 'submitted');

    // Count evaluations per startup
    const startupEvaluationCounts: { [key: string]: number } = {};
    evaluationCounts?.forEach((evaluation) => {
      const startupId = evaluation.startup_id;
      startupEvaluationCounts[startupId] = (startupEvaluationCounts[startupId] || 0) + 1;
    });

    const numerator = Object.values(startupEvaluationCounts).filter(count => count >= 3).length;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Matchmaking",
      description: "Startups with ≥3 evaluations",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=matchmaking",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
    };
  } catch (error) {
    console.error('Error fetching pitching matchmaking data:', error);
    return {
      title: "Matchmaking",
      description: "Startups with ≥3 evaluations",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=matchmaking",
      status: 'pending'
    };
  }
};

/**
 * Step 2: Pitching Calls
 * Currently mirrors Step 3 (Evaluations) since call data is not yet available
 */
export const getPitchingCallsStepData = async (): Promise<FunnelStepData> => {
  try {
    // Get total expected evaluations for pitching
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
      title: "Pitching Calls",
      description: "Evaluations submitted",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=juror-progress",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
    };
  } catch (error) {
    console.error('Error fetching pitching calls data:', error);
    return {
      title: "Pitching Calls",
      description: "Evaluations submitted",
      numerator: 0,
      denominator: 0,
      percentage: 0,
      route: "/selection?round=pitching&tab=juror-progress",
      status: 'pending'
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
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
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
      status: 'pending'
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
        status: 'pending'
      };
    }

    // Get total startups in pitching round
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review']);

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
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
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
      status: 'pending'
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
        status: 'pending'
      };
    }

    // Get total startups in pitching round
    const { count: totalPitchingStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'under_review']);

    const denominator = totalPitchingStartups || 0;

    // For now, assume all processed startups have been communicated
    // This can be updated when communication tracking is implemented
    const { count: processedStartups } = await supabase
      .from('startup_round_statuses')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', pitchingRound.id)
      .in('status', ['selected', 'rejected']);

    const numerator = processedStartups || 0;
    const percentage = denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    return {
      title: "Results & Communication",
      description: "Startups notified",
      numerator,
      denominator,
      percentage,
      route: "/selection?round=pitching&tab=communications",
      status: percentage >= 80 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
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
      status: 'pending'
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
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStepData {
  title: string;
  description: string;
  tooltip: string;
  numerator: number;
  denominator: number;
  percentage: number;
  route: string;
  status: 'completed' | 'in-progress' | 'pending';
}

/**
 * Step 1: Upload Startups & Jury
 * Shows total startups and jurors uploaded
 */
export const getUploadStepData = async (): Promise<FunnelStepData> => {
  const [startupsResult, jurorsResult] = await Promise.all([
    supabase.from('startups').select('*', { count: 'exact', head: true }),
    supabase.from('jurors').select('*', { count: 'exact', head: true })
  ]);

  const totalStartups = startupsResult.count || 0;
  const totalJurors = jurorsResult.count || 0;

  return {
    title: "Upload Startups & Jury",
    description: `${totalStartups} startups, ${totalJurors} jurors`,
    tooltip: "Shows the total number of startups and jurors uploaded into this cohort.",
    numerator: totalStartups + totalJurors,
    denominator: totalStartups + totalJurors,
    percentage: totalStartups > 0 && totalJurors > 0 ? 100 : 0,
    route: "/startups",
    status: totalStartups > 0 && totalJurors > 0 ? 'completed' : 'pending'
  };
};

/**
 * Step 2: Matchmaking (Screening)
 * Completion % = startups with ≥3 jurors assigned ÷ total startups
 */
export const getMatchmakingStepData = async (): Promise<FunnelStepData> => {
  const { count: totalStartups, error: startupsError } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });

  if (startupsError) throw startupsError;

  // Get assignment counts per startup
  const { data: assignmentCounts, error: assignmentsError } = await supabase
    .from('screening_assignments')
    .select('startup_id')
    .eq('status', 'assigned');

  if (assignmentsError) throw assignmentsError;

  // Count assignments per startup
  const startupAssignmentCounts = (assignmentCounts || []).reduce((acc, assignment) => {
    acc[assignment.startup_id] = (acc[assignment.startup_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count startups with at least 3 assignments
  const startupsWithThreeOrMore = Object.values(startupAssignmentCounts).filter(count => count >= 3).length;
  const totalStartupsCount = totalStartups || 0;
  const percentage = totalStartupsCount > 0 ? (startupsWithThreeOrMore / totalStartupsCount) * 100 : 0;

  return {
    title: "Matchmaking (Screening)",
    description: `${startupsWithThreeOrMore}/${totalStartupsCount} startups`,
    tooltip: "Completion rate = proportion of startups assigned at least 3 jurors compared to the total uploaded startups.",
    numerator: startupsWithThreeOrMore,
    denominator: totalStartupsCount,
    percentage,
    route: "/selection?round=screening&tab=matchmaking",
    status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
  };
};

/**
 * Step 3: Evaluations (Screening)
 * Completion % = evaluations submitted ÷ total evaluations expected
 */
export const getEvaluationsStepData = async (): Promise<FunnelStepData> => {
  // Get total assignments (expected evaluations)
  const { count: expectedEvaluations, error: assignmentsError } = await supabase
    .from('screening_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'assigned');

  if (assignmentsError) throw assignmentsError;

  // Get submitted evaluations
  const { count: completedEvaluations, error: evaluationsError } = await supabase
    .from('screening_evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  if (evaluationsError) throw evaluationsError;

  const expectedCount = expectedEvaluations || 0;
  const completedCount = completedEvaluations || 0;
  const percentage = expectedCount > 0 ? (completedCount / expectedCount) * 100 : 0;

  return {
    title: "Evaluations (Screening)",
    description: `${completedCount}/${expectedCount} evaluations`,
    tooltip: "Shows progress of evaluations submitted compared to the total assigned.",
    numerator: completedCount,
    denominator: expectedCount,
    percentage,
    route: "/selection?round=screening&tab=juror-progress",
    status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
  };
};

/**
 * Step 4: Selection – Semi-finalists
 * Completion % = (Selected + Rejected startups) ÷ total startups
 */
export const getSelectionStepData = async (): Promise<FunnelStepData> => {
  // Get total startups
  const { count: totalStartups, error: startupsError } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });

  if (startupsError) throw startupsError;

  // Get processed startups (selected + rejected) for screening round
  const { data: processedStartups, error: statusError } = await supabase
    .from('startup_round_statuses')
    .select(`
      startup_id,
      status,
      rounds!inner(name)
    `)
    .eq('rounds.name', 'screening')
    .in('status', ['selected', 'rejected']);

  if (statusError) throw statusError;
  const processedCount = processedStartups?.length || 0;
  const totalCount = totalStartups || 0;

  const percentage = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;

  return {
    title: "Selection – Semi-finalists",
    description: `${processedCount}/${totalCount} decisions made`,
    tooltip: "Completion rate = proportion of startups marked as Selected or Rejected compared to the total cohort.",
    numerator: processedCount,
    denominator: totalCount,
    percentage,
    route: "/selection?round=screening&tab=startup-selection",
    status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
  };
};

/**
 * Step 5: Results & Communication (Screening)
 * Completion % = startups communicated ÷ total startups
 * Note: This is placeholder logic - actual communication tracking would need to be implemented
 */
export const getCommunicationStepData = async (): Promise<FunnelStepData> => {
  // Get total startups
  const { count: totalStartups, error: startupsError } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });

  if (startupsError) throw startupsError;

  // For now, we'll assume communication is complete if all startups have been processed (selected/rejected)
  // In a real implementation, there would be a communication tracking table
  const { data: processedStartups, error: statusError } = await supabase
    .from('startup_round_statuses')
    .select(`
      startup_id,
      status,
      rounds!inner(name)
    `)
    .eq('rounds.name', 'screening')
    .in('status', ['selected', 'rejected']);

  if (statusError) throw statusError;
  const communicatedCount = processedStartups?.length || 0; // Placeholder logic
  const totalCount = totalStartups || 0;

  const percentage = totalCount > 0 ? (communicatedCount / totalCount) * 100 : 0;

  return {
    title: "Results & Communication",
    description: `${communicatedCount}/${totalCount} startups notified`,
    tooltip: "Shows how many startups have received their results and feedback.",
    numerator: communicatedCount,
    denominator: totalCount,
    percentage,
    route: "/selection?round=screening&tab=communications",
    status: percentage === 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending'
  };
};

/**
 * Get all screening funnel steps data
 */
export const getScreeningFunnelData = async (): Promise<FunnelStepData[]> => {
  try {
    const [step1, step2, step3, step4, step5] = await Promise.all([
      getUploadStepData(),
      getMatchmakingStepData(),
      getEvaluationsStepData(),
      getSelectionStepData(),
      getCommunicationStepData()
    ]);

    return [step1, step2, step3, step4, step5];
  } catch (error) {
    console.error('Error fetching screening funnel data:', error);
    throw error;
  }
};
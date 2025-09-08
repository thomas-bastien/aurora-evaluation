import { supabase } from "@/integrations/supabase/client";

/**
 * Get count of active startups (those currently in any active round)
 */
export const getActiveStartupsCount = async (): Promise<number> => {
  // Get active round
  const { data: activeRound } = await supabase
    .from('rounds')
    .select('id, name')
    .eq('status', 'active')
    .maybeSingle();
    
  if (!activeRound) return 0;
  
  // Count startups with 'selected' status in the active round
  const { count } = await supabase
    .from('startup_round_statuses')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', activeRound.id)
    .in('status', ['selected', 'under_review']);
  
  return count || 0;
};

/**
 * Get count of all startups regardless of status
 */
export const getTotalStartupsCount = async (): Promise<number> => {
  const { count } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true });
    
  return count || 0;
};

/**
 * Get count of active jurors (those with activated accounts)
 */
export const getActiveJurorsCount = async (): Promise<number> => {
  const { count } = await supabase
    .from('jurors')
    .select('*', { count: 'exact', head: true })
    .not('user_id', 'is', null);
    
  return count || 0;
};

/**
 * Get count of all jurors regardless of activation status
 */
export const getTotalJurorsCount = async (): Promise<number> => {
  const { count } = await supabase
    .from('jurors')
    .select('*', { count: 'exact', head: true });
    
  return count || 0;
};

/**
 * Get count of startups for a specific round using round-specific statuses
 */
export const getRoundStartupsCount = async (round: 'screening' | 'pitching'): Promise<number> => {
  // Get round by name
  const { data: roundData } = await supabase
    .from('rounds')
    .select('id')
    .eq('name', round)
    .maybeSingle();
    
  if (!roundData) return 0;
  
  // Count startups with active statuses in this specific round
  const { count } = await supabase
    .from('startup_round_statuses')
    .select('*', { count: 'exact', head: true })
    .eq('round_id', roundData.id)
    .in('status', ['selected', 'under_review']);
    
  return count || 0;
};

// Keep the old function name for backward compatibility
export const getPhaseStartupsCount = getRoundStartupsCount;

/**
 * Get count of startups assigned to a specific juror
 */
export const getJurorAssignedStartupsCount = async (jurorId: string): Promise<number> => {
  const { count } = await supabase
    .from('screening_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('juror_id', jurorId)
    .eq('status', 'assigned');
    
  return count || 0;
};

/**
 * Get combined counts for dashboard display
 */
export const getDashboardCounts = async () => {
  const [
    activeStartups,
    totalStartups,
    activeJurors,
    totalJurors
  ] = await Promise.all([
    getActiveStartupsCount(),
    getTotalStartupsCount(),
    getActiveJurorsCount(),
    getTotalJurorsCount()
  ]);

  return {
    activeStartups,
    totalStartups,
    activeJurors,
    totalJurors
  };
};

/**
 * Get counts specific to matchmaking workflow
 */
export const getMatchmakingCounts = async (round: 'screening' | 'pitching') => {
  const assignmentTable = round === 'screening' ? 'screening_assignments' : 'pitching_assignments';
  
  const [
    roundStartups,
    activeJurors,
    totalAssignments
  ] = await Promise.all([
    getRoundStartupsCount(round),
    getActiveJurorsCount(),
    supabase
      .from(assignmentTable)
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => count || 0)
  ]);

  return {
    startups: roundStartups,
    jurors: activeJurors,
    assignments: totalAssignments
  };
};
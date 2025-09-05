import { supabase } from "@/integrations/supabase/client";

// Define what constitutes "active" entities for consistent counting
const ACTIVE_STARTUP_STATUSES = ['under-review', 'shortlisted'];

/**
 * Get count of active startups (those in evaluation phases)
 */
export const getActiveStartupsCount = async (): Promise<number> => {
  const { count } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true })
    .in('status', ACTIVE_STARTUP_STATUSES);
  
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
 * Get count of startups for a specific round
 */
export const getRoundStartupsCount = async (round: 'screening' | 'pitching'): Promise<number> => {
  if (round === 'screening') {
    // For screening, count active startups
    return getActiveStartupsCount();
  } else {
    // For pitching, count shortlisted startups
    const { count } = await supabase
      .from('startups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'shortlisted');
      
    return count || 0;
  }
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
  const [
    roundStartups,
    activeJurors,
    totalAssignments
  ] = await Promise.all([
    getRoundStartupsCount(round),
    getActiveJurorsCount(),
    supabase
      .from('screening_assignments')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => count || 0)
  ]);

  return {
    startups: roundStartups,
    jurors: activeJurors,
    assignments: totalAssignments
  };
};
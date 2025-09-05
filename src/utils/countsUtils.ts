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
 * Get count of startups for a specific phase
 */
export const getPhaseStartupsCount = async (phase: 'screening' | 'pitching'): Promise<number> => {
  if (phase === 'screening') {
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

/**
 * Get count of startups assigned to a specific juror
 */
export const getJurorAssignedStartupsCount = async (jurorId: string): Promise<number> => {
  const { count } = await supabase
    .from('startup_assignments')
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
export const getMatchmakingCounts = async (phase: 'screening' | 'pitching') => {
  const [
    phaseStartups,
    activeJurors,
    totalAssignments
  ] = await Promise.all([
    getPhaseStartupsCount(phase),
    getActiveJurorsCount(),
    supabase
      .from('startup_assignments')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => count || 0)
  ]);

  return {
    startups: phaseStartups,
    jurors: activeJurors,
    assignments: totalAssignments
  };
};
import { supabase } from '@/integrations/supabase/client';

export interface Startup {
  id: string;
  name: string;
  industry: string;
  stage: string;
  region?: string;
  verticals?: string[];
  regions?: string[];
}

export interface Juror {
  id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  preferred_regions?: string[];
  target_verticals?: string[];
  preferred_stages?: string[];
}

export interface Assignment {
  startup_id: string;
  juror_id: string;
  startup_name: string;
  juror_name: string;
}

export interface AutoAssignmentProposal {
  startupId: string;
  startupName: string;
  proposedJurors: {
    jurorId: string;
    jurorName: string;
    fitScore: number;
    reasoning: string;
  }[];
}

export interface WorkloadDistribution {
  jurorId: string;
  jurorName: string;
  currentAssignments: number;
  proposedAssignments: number;
  targetAssignments: number;
  isOverloaded: boolean;
}

/**
 * Calculate 10-point compatibility score between juror and startup
 */
export function calculateFitScore(juror: Juror, startup: Startup): { score: number; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Region match (+4 points)
  if (juror.preferred_regions?.length && startup.region) {
    if (juror.preferred_regions.includes(startup.region)) {
      score += 4;
      reasons.push(`Region match (${startup.region})`);
    }
  }

  // Vertical/Industry match (+3 points)
  if (juror.target_verticals?.length && startup.industry) {
    if (juror.target_verticals.includes(startup.industry)) {
      score += 3;
      reasons.push(`Industry match (${startup.industry})`);
    }
  }

  // Stage match (+3 points)
  if (juror.preferred_stages?.length && startup.stage) {
    if (juror.preferred_stages.includes(startup.stage)) {
      score += 3;
      reasons.push(`Stage match (${startup.stage})`);
    }
  }

  const reasoning = reasons.length > 0 
    ? reasons.join(', ') 
    : 'No criteria matches found';

  return { score, reasoning };
}

/**
 * Get explicit interest bonus from evaluations
 */
async function getExplicitInterestBonus(
  jurorId: string, 
  startupId: string, 
  roundName: 'screening' | 'pitching'
): Promise<number> {
  try {
    const table = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
    
    const { data, error } = await supabase
      .from(table)
      .select('wants_pitch_session')
      .eq('evaluator_id', jurorId)
      .eq('startup_id', startupId)
      .eq('status', 'submitted')
      .maybeSingle();

    if (error) return 0;
    
    // Add 15 points bonus if juror explicitly wants pitch session
    return data?.wants_pitch_session === true ? 15 : 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate current workload for each juror
 */
function calculateCurrentWorkloads(
  jurors: Juror[], 
  existingAssignments: Assignment[]
): Map<string, number> {
  const workloads = new Map<string, number>();
  
  jurors.forEach(juror => {
    workloads.set(juror.id, 0);
  });
  
  existingAssignments.forEach(assignment => {
    const current = workloads.get(assignment.juror_id) || 0;
    workloads.set(assignment.juror_id, current + 1);
  });
  
  return workloads;
}

/**
 * Calculate target assignments per juror based on round
 */
function calculateTargetAssignments(
  totalStartups: number, 
  totalJurors: number, 
  roundName: 'screening' | 'pitching'
): number {
  const assignmentsPerStartup = roundName === 'screening' ? 3 : 3; // Both rounds use 3 jurors per startup
  const totalAssignments = totalStartups * assignmentsPerStartup;
  return Math.floor(totalAssignments / totalJurors);
}

/**
 * Generate auto-assignment proposals for unassigned startups
 */
export async function generateAutoAssignments(
  unassignedStartups: Startup[],
  jurors: Juror[],
  existingAssignments: Assignment[],
  roundName: 'screening' | 'pitching'
): Promise<{
  proposals: AutoAssignmentProposal[];
  workloadDistribution: WorkloadDistribution[];
}> {
  if (unassignedStartups.length === 0) {
    return { proposals: [], workloadDistribution: [] };
  }

  const currentWorkloads = calculateCurrentWorkloads(jurors, existingAssignments);
  const targetAssignments = calculateTargetAssignments(
    unassignedStartups.length + existingAssignments.length / 3, // Total startups
    jurors.length,
    roundName
  );

  const proposals: AutoAssignmentProposal[] = [];
  const tempWorkloads = new Map(currentWorkloads);

  // Process each unassigned startup
  for (const startup of unassignedStartups) {
    const jurorScores: Array<{
      juror: Juror;
      totalScore: number;
      fitScore: number;
      reasoning: string;
      workloadPenalty: number;
    }> = [];

    // Calculate scores for each juror
    for (const juror of jurors) {
      const { score: fitScore, reasoning } = calculateFitScore(juror, startup);
      
      // Get explicit interest bonus
      const interestBonus = await getExplicitInterestBonus(juror.id, startup.id, roundName);
      
      // Apply workload balancing penalty
      const currentLoad = tempWorkloads.get(juror.id) || 0;
      const workloadPenalty = currentLoad > targetAssignments ? -2 * (currentLoad - targetAssignments) : 0;
      
      const totalScore = fitScore + interestBonus + workloadPenalty;
      
      let fullReasoning = reasoning;
      if (interestBonus > 0) {
        fullReasoning += `, Explicit interest (+${interestBonus})`;
      }
      if (workloadPenalty < 0) {
        fullReasoning += `, Overloaded (${workloadPenalty})`;
      }
      
      jurorScores.push({
        juror,
        totalScore,
        fitScore,
        reasoning: fullReasoning,
        workloadPenalty
      });
    }

    // Sort by total score and select top 3
    jurorScores.sort((a, b) => b.totalScore - a.totalScore);
    const selectedJurors = jurorScores.slice(0, 3);

    // Update temporary workloads
    selectedJurors.forEach(({ juror }) => {
      const current = tempWorkloads.get(juror.id) || 0;
      tempWorkloads.set(juror.id, current + 1);
    });

    proposals.push({
      startupId: startup.id,
      startupName: startup.name,
      proposedJurors: selectedJurors.map(({ juror, totalScore, reasoning }) => ({
        jurorId: juror.id,
        jurorName: juror.name,
        fitScore: totalScore,
        reasoning
      }))
    });
  }

  // Calculate final workload distribution
  const workloadDistribution: WorkloadDistribution[] = jurors.map(juror => ({
    jurorId: juror.id,
    jurorName: juror.name,
    currentAssignments: currentWorkloads.get(juror.id) || 0,
    proposedAssignments: tempWorkloads.get(juror.id) || 0,
    targetAssignments,
    isOverloaded: (tempWorkloads.get(juror.id) || 0) > targetAssignments + 1
  }));

  return { proposals, workloadDistribution };
}

/**
 * Convert proposals to assignment format
 */
export function convertProposalsToAssignments(
  proposals: AutoAssignmentProposal[]
): Assignment[] {
  const assignments: Assignment[] = [];
  
  proposals.forEach(proposal => {
    proposal.proposedJurors.forEach(juror => {
      assignments.push({
        startup_id: proposal.startupId,
        juror_id: juror.jurorId,
        startup_name: proposal.startupName,
        juror_name: juror.jurorName
      });
    });
  });
  
  return assignments;
}
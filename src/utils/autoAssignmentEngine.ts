import { supabase } from '@/integrations/supabase/client';

export interface Startup {
  id: string;
  name: string;
  stage: string;
  verticals?: string[];
  regions?: string[];
  region?: string; // Legacy field for fallback
  description?: string;
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
  evaluation_limit?: number | null; // Custom limit override
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
    aiScore?: number;
    aiConfidence?: number;
    aiRecommendation?: string;
    aiReasoning?: {
      vertical_match: { score: number; explanation: string };
      stage_match: { score: number; explanation: string };
      region_match: { score: number; explanation: string };
      contextual_fit: { score: number; explanation: string };
    };
  }[];
}

export interface WorkloadDistribution {
  jurorId: string;
  jurorName: string;
  currentAssignments: number;
  proposedAssignments: number;
  targetAssignments: number;
  evaluationLimit: number; // Effective limit (custom or dynamic)
  isCustomLimit: boolean; // True if custom limit is set
  isOverloaded: boolean;
  exceedsLimit: boolean; // True if proposed > limit
}

/**
 * Calculate 10-point compatibility score between juror and startup
 * Aligned with matchmakingUtils.ts logic but with different point scale
 */
export function calculateFitScore(juror: Juror, startup: Startup): { score: number; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Region match (+4 points) - check if ANY startup region matches
  const startupRegions = startup.regions && startup.regions.length > 0 ? startup.regions : (startup.region ? [startup.region] : []);
  const jurorRegions = juror.preferred_regions || [];
  const regionMatches = startupRegions.filter(r => jurorRegions.includes(r));
  if (regionMatches.length > 0) {
    score += 4;
    reasons.push(`Region match (${regionMatches.join(', ')})`);
  }

  // Vertical match (+3 points) - check if ANY startup vertical matches
  const startupVerticals = startup.verticals || [];
  const jurorVerticals = juror.target_verticals || [];
  const verticalMatches = startupVerticals.filter(v => jurorVerticals.includes(v));
  if (verticalMatches.length > 0) {
    score += 3;
    reasons.push(`Vertical match (${verticalMatches.join(', ')})`);
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
 * Generate AI-enhanced auto-assignment proposals for unassigned startups
 */
export async function generateAutoAssignments(
  unassignedStartups: Startup[],
  jurors: Juror[],
  existingAssignments: Assignment[],
  roundName: 'screening' | 'pitching',
  useAI: boolean = true
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
    let aiScores: any = null;

    // Try AI-enhanced matchmaking if enabled
    if (useAI) {
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-matchmaking', {
          body: {
            startup: {
              id: startup.id,
              name: startup.name,
              verticals: startup.verticals || [],
              stage: startup.stage || 'N/A',
              regions: startup.regions || [],
              description: startup.description || ''
            },
            jurors: jurors.map(j => ({
              id: j.id,
              name: j.name,
              company: j.company || '',
              job_title: j.job_title || '',
              target_verticals: j.target_verticals || [],
              preferred_stages: j.preferred_stages || [],
              preferred_regions: j.preferred_regions || []
            })),
            roundType: roundName
          }
        });

        if (!aiError && aiData?.success && aiData?.scores) {
          aiScores = aiData.scores;
          console.log(`AI matchmaking success for ${startup.name}: ${aiScores.length} jurors scored`);
        } else {
          console.warn(`AI matchmaking skipped for ${startup.name}:`, aiError);
        }
      } catch (error) {
        console.error(`AI matchmaking error for ${startup.name}:`, error);
      }
    }

    const jurorScores: Array<{
      juror: Juror;
      totalScore: number;
      fitScore: number;
      reasoning: string;
      workloadPenalty: number;
      aiScore?: number;
      aiConfidence?: number;
      aiRecommendation?: string;
      aiReasoning?: any;
    }> = [];

    // Calculate scores for each juror
    for (const juror of jurors) {
      const { score: fitScore, reasoning } = calculateFitScore(juror, startup);
      
      // Get explicit interest bonus
      const interestBonus = await getExplicitInterestBonus(juror.id, startup.id, roundName);
      
      // Use custom limit if set, otherwise use dynamic target
      const effectiveLimit = juror.evaluation_limit ?? targetAssignments;
      const currentLoad = tempWorkloads.get(juror.id) || 0;

      // Stronger penalty for exceeding limit
      const workloadPenalty = currentLoad >= effectiveLimit 
        ? -5 * (currentLoad - effectiveLimit + 1) // Strong penalty when at/over limit
        : currentLoad > targetAssignments 
        ? -2 * (currentLoad - targetAssignments) // Moderate penalty
        : 0;
      
      // Get AI score if available
      const aiMatch = aiScores?.find((s: any) => s.juror_id === juror.id);
      const aiScore = aiMatch?.compatibility_score || 0;
      
      // Combine scores: 70% AI, 30% rule-based (if AI available)
      const totalScore = aiScores 
        ? (aiScore * 0.7) + ((fitScore + interestBonus) * 3 * 0.3) + workloadPenalty
        : fitScore + interestBonus + workloadPenalty;
      
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
        workloadPenalty,
        aiScore: aiMatch?.compatibility_score,
        aiConfidence: aiMatch?.confidence,
        aiRecommendation: aiMatch?.recommendation,
        aiReasoning: aiMatch?.reasoning
      });
    }

    // Sort by total score and select top jurors (adaptable to available jurors)
    jurorScores.sort((a, b) => b.totalScore - a.totalScore);
    const targetJurorCount = Math.min(3, jurors.length); // Adapt to available jurors
    const selectedJurors = jurorScores.slice(0, targetJurorCount);

    // Update temporary workloads
    selectedJurors.forEach(({ juror }) => {
      const current = tempWorkloads.get(juror.id) || 0;
      tempWorkloads.set(juror.id, current + 1);
    });

    proposals.push({
      startupId: startup.id,
      startupName: startup.name,
      proposedJurors: selectedJurors.map(({ juror, totalScore, reasoning, aiScore, aiConfidence, aiRecommendation, aiReasoning }) => ({
        jurorId: juror.id,
        jurorName: juror.name,
        fitScore: totalScore,
        reasoning,
        aiScore,
        aiConfidence,
        aiRecommendation,
        aiReasoning
      }))
    });
  }

  // Calculate final workload distribution
  const workloadDistribution: WorkloadDistribution[] = jurors.map(juror => {
    const effectiveLimit = juror.evaluation_limit ?? targetAssignments;
    const proposed = tempWorkloads.get(juror.id) || 0;
    
    return {
      jurorId: juror.id,
      jurorName: juror.name,
      currentAssignments: currentWorkloads.get(juror.id) || 0,
      proposedAssignments: proposed,
      targetAssignments,
      evaluationLimit: effectiveLimit,
      isCustomLimit: juror.evaluation_limit !== null && juror.evaluation_limit !== undefined,
      isOverloaded: proposed > targetAssignments + 1,
      exceedsLimit: proposed > effectiveLimit
    };
  });

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
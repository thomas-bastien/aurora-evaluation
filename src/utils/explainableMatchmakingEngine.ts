import { supabase } from "@/integrations/supabase/client";
import { normalizeRegions, normalizeStages, normalizeVerticals } from "./fieldNormalization";

export interface Startup {
  id: string;
  name: string;
  verticals: string[];
  stage: string;
  regions: string[];
  internal_score?: number;
}

export interface Juror {
  id: string;
  name: string;
  target_verticals: string[];
  preferred_stages: string[];
  preferred_regions: string[];
  evaluation_limit?: number;
  thesis_keywords?: string[];
  fund_focus?: string;
}

export interface MatchConfig {
  vertical_weight: number;
  stage_weight: number;
  region_weight: number;
  thesis_weight: number;
  load_penalty_weight: number;
  target_jurors_per_startup: number;
  top_k_per_juror: number;
  deterministic_seed?: number;
}

export interface ScoreComponents {
  vertical: number;
  stage: number;
  region: number;
  thesis: number;
  load_penalty: number;
}

export interface MatchScore {
  juror_id: string;
  startup_id: string;
  total_score: number;
  components: ScoreComponents;
  reason: string;
}

export interface Conflict {
  juror_id: string;
  startup_id: string;
  conflict_type: string;
}

export interface Assignment {
  juror_id: string;
  startup_id: string;
  round_name: string;
}

export interface SuggestionSlot {
  startup: Startup;
  score: MatchScore;
}

export interface JurorSuggestions {
  juror: Juror;
  suggestions: SuggestionSlot[];
  current_load: number;
  capacity_limit: number;
}

export interface WhyNotAssigned {
  startup_id: string;
  startup_name: string;
  juror_id: string;
  juror_name: string;
  reason: string;
}

/**
 * Fetch matchmaking configuration for a round
 */
export async function fetchMatchConfig(roundName: string): Promise<MatchConfig> {
  const { data, error } = await supabase
    .from('matchmaking_config')
    .select('*')
    .eq('round_name', roundName)
    .single();

  if (error) {
    console.error('Error fetching config:', error);
    // Return defaults
    return {
      vertical_weight: 40,
      stage_weight: 20,
      region_weight: 20,
      thesis_weight: 10,
      load_penalty_weight: 10,
      target_jurors_per_startup: 3,
      top_k_per_juror: 3,
    };
  }

  return {
    vertical_weight: Number(data.vertical_weight),
    stage_weight: Number(data.stage_weight),
    region_weight: Number(data.region_weight),
    thesis_weight: Number(data.thesis_weight),
    load_penalty_weight: Number(data.load_penalty_weight),
    target_jurors_per_startup: data.target_jurors_per_startup,
    top_k_per_juror: data.top_k_per_juror,
    deterministic_seed: data.deterministic_seed || undefined,
  };
}

/**
 * Fetch conflicts for filtering
 */
export async function fetchConflicts(roundName: string): Promise<Conflict[]> {
  const { data, error } = await supabase
    .from('juror_conflicts')
    .select('juror_id, startup_id, conflict_type');

  if (error) {
    console.error('Error fetching conflicts:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch existing assignments for the round
 */
export async function fetchExistingAssignments(roundName: string): Promise<Assignment[]> {
  const table = roundName === 'screening' ? 'screening_assignments' : 'pitching_assignments';
  
  const { data, error } = await supabase
    .from(table)
    .select('juror_id, startup_id')
    .eq('status', 'assigned');

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }

  return data.map(a => ({ ...a, round_name: roundName }));
}

/**
 * Check if a juror-startup pair has hard exclusions
 */
export function checkHardExclusions(
  jurorId: string,
  startupId: string,
  conflicts: Conflict[],
  existingAssignments: Assignment[]
): { excluded: boolean; reason: string } {
  // Check conflicts
  const hasConflict = conflicts.some(
    c => c.juror_id === jurorId && c.startup_id === startupId
  );
  if (hasConflict) {
    return { excluded: true, reason: 'Conflict of interest' };
  }

  // Check already assigned
  const alreadyAssigned = existingAssignments.some(
    a => a.juror_id === jurorId && a.startup_id === startupId
  );
  if (alreadyAssigned) {
    return { excluded: true, reason: 'Already assigned' };
  }

  return { excluded: false, reason: '' };
}

/**
 * Calculate match score with component breakdown
 */
export function calculateMatchScore(
  juror: Juror,
  startup: Startup,
  currentLoad: number,
  config: MatchConfig
): MatchScore {
  const components: ScoreComponents = {
    vertical: 0,
    stage: 0,
    region: 0,
    thesis: 0,
    load_penalty: 0,
  };

  // Normalize fields
  const jurorVerticals = normalizeVerticals(juror.target_verticals || []);
  const startupVerticals = normalizeVerticals(startup.verticals || []);
  const jurorStages = normalizeStages(juror.preferred_stages || []);
  const startupStage = normalizeStages([startup.stage])[0];
  const jurorRegions = normalizeRegions(juror.preferred_regions || []);
  const startupRegions = normalizeRegions(startup.regions || []);

  // Vertical match (40%)
  const verticalMatches = jurorVerticals.filter(v => 
    startupVerticals.includes(v)
  ).length;
  components.vertical = verticalMatches > 0 
    ? (verticalMatches / Math.max(startupVerticals.length, 1)) * config.vertical_weight / 10
    : 0;

  // Stage match (20%)
  components.stage = jurorStages.includes(startupStage)
    ? config.stage_weight / 10
    : 0;

  // Region match (20%)
  const regionMatches = jurorRegions.filter(r => 
    startupRegions.includes(r) || jurorRegions.includes('Global')
  ).length;
  components.region = regionMatches > 0
    ? (regionMatches / Math.max(startupRegions.length, 1)) * config.region_weight / 10
    : 0;

  // Thesis/keyword match (10%)
  if (juror.thesis_keywords && juror.thesis_keywords.length > 0) {
    const startupText = `${startup.name} ${startupVerticals.join(' ')} ${startup.stage}`.toLowerCase();
    const keywordMatches = juror.thesis_keywords.filter(kw =>
      startupText.includes(kw.toLowerCase())
    ).length;
    components.thesis = keywordMatches > 0
      ? (keywordMatches / juror.thesis_keywords.length) * config.thesis_weight / 10
      : 0;
  }

  // Load penalty (10%) - penalize jurors near capacity
  const capacity = juror.evaluation_limit || 10;
  const loadRatio = currentLoad / capacity;
  components.load_penalty = (1 - loadRatio) * config.load_penalty_weight / 10;

  // Total score (0-10)
  const total_score = Object.values(components).reduce((sum, val) => sum + val, 0);

  // Generate reason string
  const reasons: string[] = [];
  if (components.vertical > 0) {
    reasons.push(`${startupVerticals.slice(0, 2).join(', ')}`);
  }
  if (components.stage > 0) {
    reasons.push(startupStage);
  }
  if (components.region > 0) {
    reasons.push(startupRegions.slice(0, 2).join(', '));
  }

  return {
    juror_id: juror.id,
    startup_id: startup.id,
    total_score: Math.round(total_score * 100) / 100,
    components,
    reason: reasons.join(' + ') || 'No strong match',
  };
}

/**
 * Generate explainable suggestions for all jurors
 */
export async function generateExplainableSuggestions(
  startups: Startup[],
  jurors: Juror[],
  roundName: string
): Promise<{
  suggestions: JurorSuggestions[];
  whyNotAssigned: WhyNotAssigned[];
}> {
  const config = await fetchMatchConfig(roundName);
  const conflicts = await fetchConflicts(roundName);
  const existingAssignments = await fetchExistingAssignments(roundName);

  // Calculate current loads
  const loadMap = new Map<string, number>();
  jurors.forEach(j => loadMap.set(j.id, 0));
  existingAssignments.forEach(a => {
    const current = loadMap.get(a.juror_id) || 0;
    loadMap.set(a.juror_id, current + 1);
  });

  const suggestions: JurorSuggestions[] = [];
  const whyNotAssigned: WhyNotAssigned[] = [];

  for (const juror of jurors) {
    const currentLoad = loadMap.get(juror.id) || 0;
    const capacity = juror.evaluation_limit || 10;

    // Score all startups
    const allScores: MatchScore[] = [];
    
    for (const startup of startups) {
      const exclusion = checkHardExclusions(
        juror.id,
        startup.id,
        conflicts,
        existingAssignments
      );

      if (exclusion.excluded) {
        whyNotAssigned.push({
          startup_id: startup.id,
          startup_name: startup.name,
          juror_id: juror.id,
          juror_name: juror.name,
          reason: exclusion.reason,
        });
        continue;
      }

      const score = calculateMatchScore(juror, startup, currentLoad, config);
      allScores.push(score);
    }

    // Sort by score and take top K
    allScores.sort((a, b) => b.total_score - a.total_score);
    const topScores = allScores.slice(0, config.top_k_per_juror);

    suggestions.push({
      juror,
      suggestions: topScores.map(score => ({
        startup: startups.find(s => s.id === score.startup_id)!,
        score,
      })),
      current_load: currentLoad,
      capacity_limit: capacity,
    });
  }

  return { suggestions, whyNotAssigned };
}

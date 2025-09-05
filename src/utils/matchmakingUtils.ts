// Utility functions for matchmaking compatibility and consistency checks

export interface Startup {
  id: string;
  name: string;
  verticals?: string[];
  stage?: string;
  region?: string;
}

export interface Juror {
  id: string;
  name: string;
  target_verticals?: string[];
  preferred_stages?: string[];
  preferred_regions?: string[];
}

export interface CompatibilityScore {
  jurorId: string;
  startupId: string;
  score: number;
  matches: {
    vertical: boolean;
    stage: boolean;
    region: boolean;
  };
  details: {
    verticalMatches: string[];
    stageMatch: string | null;
    regionMatch: string | null;
  };
}

/**
 * Calculate compatibility score between a juror and startup
 */
export function calculateCompatibility(juror: Juror, startup: Startup): CompatibilityScore {
  const startupVerticals = startup.verticals || [];
  const jurorVerticals = juror.target_verticals || [];
  const verticalMatches = startupVerticals.filter(v => jurorVerticals.includes(v));
  
  const startupStage = startup.stage;
  const jurorStages = juror.preferred_stages || [];
  const stageMatch = startupStage && jurorStages.includes(startupStage);
  
  const startupRegion = startup.region;
  const jurorRegions = juror.preferred_regions || [];
  const regionMatch = startupRegion && jurorRegions.includes(startupRegion);
  
  const matches = {
    vertical: verticalMatches.length > 0,
    stage: !!stageMatch,
    region: !!regionMatch
  };
  
  // Calculate score (weighted: vertical 50%, stage 30%, region 20%)
  const score = (
    (matches.vertical ? 0.5 : 0) +
    (matches.stage ? 0.3 : 0) +
    (matches.region ? 0.2 : 0)
  ) * 100;
  
  return {
    jurorId: juror.id,
    startupId: startup.id,
    score,
    matches,
    details: {
      verticalMatches,
      stageMatch: stageMatch ? startupStage : null,
      regionMatch: regionMatch ? startupRegion : null
    }
  };
}

/**
 * Find best jurors for a startup
 */
export function findBestJurors(startup: Startup, jurors: Juror[], count: number = 3): CompatibilityScore[] {
  const scores = jurors.map(juror => calculateCompatibility(juror, startup));
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/**
 * Detect inconsistencies in the dataset
 */
export interface DataInconsistency {
  type: 'vertical_mismatch' | 'stage_mismatch' | 'region_mismatch' | 'duplicate_values' | 'missing_data';
  severity: 'high' | 'medium' | 'low';
  message: string;
  items: string[];
}

export function detectDataInconsistencies(startups: Startup[], jurors: Juror[]): DataInconsistency[] {
  const inconsistencies: DataInconsistency[] = [];

  // Check for startups with no matching jurors
  const allJurorVerticals = new Set(jurors.flatMap(j => j.target_verticals || []));
  const allJurorStages = new Set(jurors.flatMap(j => j.preferred_stages || []));
  const allJurorRegions = new Set(jurors.flatMap(j => j.preferred_regions || []));

  const startupsWithoutVerticalMatch = startups.filter(s => 
    (s.verticals || []).every(v => !allJurorVerticals.has(v))
  );

  const startupsWithoutStageMatch = startups.filter(s => 
    s.stage && !allJurorStages.has(s.stage)
  );

  const startupsWithoutRegionMatch = startups.filter(s => 
    s.region && !allJurorRegions.has(s.region)
  );

  if (startupsWithoutVerticalMatch.length > 0) {
    inconsistencies.push({
      type: 'vertical_mismatch',
      severity: 'high',
      message: `${startupsWithoutVerticalMatch.length} startup(s) have verticals with no matching juror preferences`,
      items: startupsWithoutVerticalMatch.map(s => s.name)
    });
  }

  if (startupsWithoutStageMatch.length > 0) {
    inconsistencies.push({
      type: 'stage_mismatch',
      severity: 'medium',
      message: `${startupsWithoutStageMatch.length} startup(s) have stages with no matching juror preferences`,
      items: startupsWithoutStageMatch.map(s => s.name)
    });
  }

  if (startupsWithoutRegionMatch.length > 0) {
    inconsistencies.push({
      type: 'region_mismatch',
      severity: 'low',
      message: `${startupsWithoutRegionMatch.length} startup(s) have regions with no matching juror preferences`,
      items: startupsWithoutRegionMatch.map(s => s.name)
    });
  }

  // Check for missing critical data
  const startupsWithoutVerticals = startups.filter(s => !s.verticals || s.verticals.length === 0);
  const jurorsWithoutVerticals = jurors.filter(j => !j.target_verticals || j.target_verticals.length === 0);

  if (startupsWithoutVerticals.length > 0) {
    inconsistencies.push({
      type: 'missing_data',
      severity: 'high',
      message: `${startupsWithoutVerticals.length} startup(s) have no verticals defined`,
      items: startupsWithoutVerticals.map(s => s.name)
    });
  }

  if (jurorsWithoutVerticals.length > 0) {
    inconsistencies.push({
      type: 'missing_data',
      severity: 'high',
      message: `${jurorsWithoutVerticals.length} juror(s) have no target verticals defined`,
      items: jurorsWithoutVerticals.map(j => j.name)
    });
  }

  return inconsistencies;
}

/**
 * Remove duplicate values from arrays
 */
export function removeDuplicates<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Check if two arrays have any common elements
 */
export function hasCommonElements<T>(arr1: T[], arr2: T[]): boolean {
  return arr1.some(item => arr2.includes(item));
}
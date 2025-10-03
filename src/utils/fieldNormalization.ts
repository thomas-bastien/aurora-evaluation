// Field normalization utilities for consistent matching

export const CANONICAL_REGIONS: Record<string, string[]> = {
  'Europe': ['EU', 'Europe', 'European Union', 'EMEA'],
  'North America': ['NA', 'North America', 'USA', 'US', 'United States', 'Canada'],
  'Asia': ['Asia', 'APAC', 'Asia Pacific', 'SEA', 'Southeast Asia'],
  'Middle East': ['ME', 'Middle East', 'MENA', 'Gulf'],
  'Africa': ['Africa', 'Sub-Saharan Africa', 'North Africa'],
  'Latin America': ['LATAM', 'Latin America', 'South America', 'Central America'],
  'Global': ['Global', 'Worldwide', 'International']
};

export const CANONICAL_STAGES: Record<string, string[]> = {
  'Pre-Seed': ['Pre-Seed', 'Preseed', 'Idea', 'Concept'],
  'Seed': ['Seed', 'Early Seed', 'Late Seed'],
  'Series A': ['Series A', 'A', 'Post-Seed'],
  'Series B': ['Series B', 'B', 'Growth'],
  'Series C+': ['Series C', 'C', 'Series D', 'D', 'Late Stage']
};

export const CANONICAL_VERTICALS: Record<string, string[]> = {
  'Fintech': ['Fintech', 'Financial Technology', 'Finance', 'Banking', 'Payments'],
  'Healthcare': ['Healthcare', 'Health', 'MedTech', 'Digital Health', 'Biotech'],
  'Enterprise': ['Enterprise', 'B2B', 'SaaS', 'Enterprise Software'],
  'Consumer': ['Consumer', 'B2C', 'E-commerce', 'Retail'],
  'Climate': ['Climate', 'CleanTech', 'Green Tech', 'Sustainability'],
  'AI/ML': ['AI', 'ML', 'Artificial Intelligence', 'Machine Learning', 'Deep Learning'],
  'EdTech': ['EdTech', 'Education', 'Learning', 'E-learning'],
  'PropTech': ['PropTech', 'Real Estate', 'Property Technology'],
  'Mobility': ['Mobility', 'Transportation', 'Automotive', 'Logistics']
};

/**
 * Normalize a region string to canonical form
 */
export function normalizeRegion(region: string): string {
  const normalized = region.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_REGIONS)) {
    if (variants.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      return canonical;
    }
  }
  
  return normalized; // Return as-is if no match
}

/**
 * Normalize a stage string to canonical form
 */
export function normalizeStage(stage: string): string {
  const normalized = stage.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_STAGES)) {
    if (variants.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      return canonical;
    }
  }
  
  return normalized;
}

/**
 * Normalize a vertical string to canonical form
 */
export function normalizeVertical(vertical: string): string {
  const normalized = vertical.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_VERTICALS)) {
    if (variants.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      return canonical;
    }
  }
  
  return normalized;
}

/**
 * Normalize arrays of fields
 */
export function normalizeRegions(regions: string[]): string[] {
  return [...new Set(regions.map(normalizeRegion))];
}

export function normalizeStages(stages: string[]): string[] {
  return [...new Set(stages.map(normalizeStage))];
}

export function normalizeVerticals(verticals: string[]): string[] {
  return [...new Set(verticals.map(normalizeVertical))];
}

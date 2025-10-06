// Field normalization utilities for consistent matching
// Aligned with DATA_STANDARDS from src/constants/dataStandards.ts

import { DATA_STANDARDS } from '@/constants/dataStandards';

// Comprehensive variant mappings for regions (includes countries, abbreviations, and common aliases)
export const CANONICAL_REGIONS: Record<string, string[]> = {
  'Africa': [
    'Africa', 'Sub-Saharan Africa', 'North Africa', 'SSA', 
    'Eastern Africa', 'Western Africa', 'Southern Africa',
    'Kenya', 'Nigeria', 'South Africa', 'Ghana', 'Ethiopia', 'Tanzania'
  ],
  'Asia Pacific (APAC)': [
    'Asia', 'APAC', 'Asia-Pacific', 'Asia Pacific', 'APAC (Asia + Pacific)', 
    'APAC ( Asia+ Pacific)', 'SEA', 'Southeast Asia', 'East Asia', 'South Asia',
    'Singapore', 'Hong Kong', 'China', 'Japan', 'South Korea', 'India', 
    'Australia', 'New Zealand', 'Indonesia', 'Vietnam', 'Thailand', 'Malaysia',
    'Philippines', 'Taiwan', 'Pakistan', 'Bangladesh'
  ],
  'Europe': [
    'EU', 'Europe', 'European Union', 'EMEA', 'CEE', 
    'CEE (Central and Eastern Europe)', 'CIS', 'United Kingdom', 'UK', 
    'Ireland', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 
    'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Portugal', 'Greece', 
    'Romania', 'Nordics', 'Scandinavia', 'Baltics', 'Estonia', 'Latvia',
    'Lithuania', 'Slovakia', 'Bulgaria', 'Croatia', 'Slovenia'
  ],
  'Latin America (LATAM)': [
    'LATAM', 'Latin America', 'South America', 'Central America', 'LatAm',
    'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru', 
    'Caribbean', 'Venezuela', 'Ecuador', 'Uruguay', 'Bolivia', 'Costa Rica'
  ],
  'Middle East & North Africa (MENA)': [
    'ME', 'Middle East', 'MENA', 'MENA (Middle East + Africa)', 
    'Gulf', 'GCC', 'UAE', 'Saudi Arabia', 'Israel', 'Egypt', 'Turkey', 
    'Jordan', 'Lebanon', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Morocco',
    'Tunisia', 'Algeria'
  ],
  'North America': [
    'NA', 'North America', 'NORAM', 'USA', 'US', 'United States', 
    'Canada', 'U.S.', 'U.S.A.', 'America'
  ],
  'Other': [
    'Other', 'Global', 'Worldwide', 'International', 'Multiple Regions',
    'Multi-Regional'
  ]
};

// Enhanced stage mappings (includes common aliases and variations)
export const CANONICAL_STAGES: Record<string, string[]> = {
  'Pre-Seed': [
    'Pre-Seed', 'Preseed', 'Pre seed', 'Pre-seed', 'Idea', 'Concept',
    'Bootstrap', 'Pre-revenue', 'Early Stage'
  ],
  'Seed': [
    'Seed', 'Early Seed', 'Late Seed', 'Seed Stage', 'Seed Round'
  ],
  'Series A': [
    'Series A', 'A', 'Post-Seed', 'Series-A', 'SeriesA', 'A Round'
  ],
  'Series B': [
    'Series B', 'B', 'Series-B', 'SeriesB', 'B Round'
  ],
  'Series C': [
    'Series C', 'C', 'Series-C', 'SeriesC', 'Series C+', 
    'Series D', 'D', 'Late Stage', 'Series D+', 'Series E'
  ],
  'Growth': [
    'Growth', 'Expansion', 'Scale-up', 'Scaling', 'Growth Stage'
  ],
  'IPO': [
    'IPO', 'Public', 'Listed', 'Going Public', 'Pre-IPO'
  ]
};

export const CANONICAL_VERTICALS: Record<string, string[]> = {
  'Artificial Intelligence (AI/ML)': ['AI', 'ML', 'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'AI/ML', 'Generative AI'],
  'Fintech': ['Fintech', 'Financial Technology', 'Finance', 'Banking', 'Payments', 'FinTech'],
  'HealthTech & MedTech': ['Healthcare', 'Health', 'MedTech', 'Digital Health', 'Biotech', 'HealthTech', 'Medical Technology'],
  'Wellbeing, Longevity & Life Sciences': ['Wellbeing', 'Longevity', 'Life Sciences', 'Wellness', 'Health & Wellness'],
  'PharmTech': ['PharmTech', 'Pharmaceutical Technology', 'Pharma', 'Drug Development'],
  'RetailTech & E-commerce': ['RetailTech', 'E-commerce', 'Retail', 'Ecommerce', 'Consumer', 'B2C'],
  'Enterprise Software': ['Enterprise', 'B2B', 'SaaS', 'Enterprise Software', 'Business Software'],
  'Cybersecurity': ['Cybersecurity', 'Security', 'InfoSec', 'Cyber Security', 'Information Security'],
  'Productivity Tools': ['Productivity', 'Productivity Tools', 'Collaboration', 'Workflow'],
  'Transportation & Mobility': ['Mobility', 'Transportation', 'Automotive', 'Logistics', 'Transport'],
  'Energy & Sustainability': ['Climate', 'CleanTech', 'Green Tech', 'Sustainability', 'Energy', 'Clean Energy', 'Renewable Energy'],
  'AgriTech & Food Tech': ['AgriTech', 'FoodTech', 'Agriculture', 'Food', 'Agri', 'AgTech'],
  'Media & Entertainment': ['Media', 'Entertainment', 'Content', 'Broadcasting', 'Streaming'],
  'AdTech & MarTech': ['AdTech', 'MarTech', 'Marketing Technology', 'Advertising Technology', 'Marketing'],
  'Real Estate & PropTech': ['PropTech', 'Real Estate', 'Property Technology', 'Property', 'RealEstate'],
  'Education Technology (EdTech)': ['EdTech', 'Education', 'Learning', 'E-learning', 'Educational Technology'],
  'Logistics & Supply Chain': ['Logistics', 'Supply Chain', 'SCM', 'Warehousing', 'Fulfillment'],
  'Construction Tech': ['Construction Tech', 'ConTech', 'Construction', 'Building Technology'],
  'Space Technology': ['Space', 'Space Technology', 'Aerospace', 'Satellite'],
  'Semiconductors & Hardware': ['Semiconductors', 'Hardware', 'Chips', 'Electronics', 'Semiconductor'],
  'Data Infrastructure & Analytics': ['Data Infrastructure', 'Analytics', 'Big Data', 'Data Analytics', 'Business Intelligence'],
  'Industrial Automation & Robotics': ['Industrial Automation', 'Robotics', 'Automation', 'Robots', 'Manufacturing'],
  'Aerospace & Defense': ['Aerospace', 'Defense', 'Defence', 'Military Technology'],
  'Gaming & Visual Assets': ['Gaming', 'Visual Assets', 'Games', 'Video Games', 'Game Development'],
  'SportTech': ['SportTech', 'Sports Technology', 'Sports', 'Fitness', 'Athletics'],
  'Web3 / Blockchain / Crypto': ['Web3', 'Blockchain', 'Crypto', 'Cryptocurrency', 'DeFi', 'NFT'],
  'TravelTech': ['TravelTech', 'Travel', 'Tourism', 'Hospitality', 'Travel Technology'],
  'No Tech, not a Venture Business': ['No Tech', 'Non-Tech', 'Not Venture', 'Traditional Business'],
  'Others (Specify)': ['Others', 'Other', 'Miscellaneous', 'Various']
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

// ============= Enhanced Validation Functions =============

export interface NormalizationResult {
  value: string;
  wasNormalized: boolean;
  originalValue: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Normalize region with detailed metadata about the normalization
 * Useful for audit trails and data quality reports
 */
export function normalizeRegionWithMetadata(region: string): NormalizationResult {
  const normalized = region.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_REGIONS)) {
    const match = variants.find(v => v.toLowerCase() === normalized.toLowerCase());
    if (match) {
      return {
        value: canonical,
        wasNormalized: match !== canonical,
        originalValue: region,
        confidence: match.toLowerCase() === normalized.toLowerCase() ? 'high' : 'medium'
      };
    }
  }
  
  // No match found
  return {
    value: normalized,
    wasNormalized: false,
    originalValue: region,
    confidence: 'low'
  };
}

/**
 * Normalize stage with detailed metadata
 */
export function normalizeStageWithMetadata(stage: string): NormalizationResult {
  const normalized = stage.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_STAGES)) {
    const match = variants.find(v => v.toLowerCase() === normalized.toLowerCase());
    if (match) {
      return {
        value: canonical,
        wasNormalized: match !== canonical,
        originalValue: stage,
        confidence: match.toLowerCase() === normalized.toLowerCase() ? 'high' : 'medium'
      };
    }
  }
  
  return {
    value: normalized,
    wasNormalized: false,
    originalValue: stage,
    confidence: 'low'
  };
}

/**
 * Normalize vertical with detailed metadata
 */
export function normalizeVerticalWithMetadata(vertical: string): NormalizationResult {
  const normalized = vertical.trim();
  
  for (const [canonical, variants] of Object.entries(CANONICAL_VERTICALS)) {
    const match = variants.find(v => v.toLowerCase() === normalized.toLowerCase());
    if (match) {
      return {
        value: canonical,
        wasNormalized: match !== canonical,
        originalValue: vertical,
        confidence: match.toLowerCase() === normalized.toLowerCase() ? 'high' : 'medium'
      };
    }
  }
  
  return {
    value: normalized,
    wasNormalized: false,
    originalValue: vertical,
    confidence: 'low'
  };
}

/**
 * Validate a value against standard values from DATA_STANDARDS
 * Returns validation result with optional suggestion
 */
export function validateAgainstStandard(
  value: string,
  standardValues: readonly string[]
): { isValid: boolean; suggestion?: string } {
  if (standardValues.includes(value)) {
    return { isValid: true };
  }
  
  // Find closest match using fuzzy matching
  const normalized = value.toLowerCase();
  const suggestion = standardValues.find(s => 
    s.toLowerCase().includes(normalized) || 
    normalized.includes(s.toLowerCase())
  );
  
  return { isValid: false, suggestion };
}

/**
 * Validate region against DATA_STANDARDS.REGIONS
 */
export function validateRegion(region: string): { isValid: boolean; suggestion?: string } {
  return validateAgainstStandard(region, DATA_STANDARDS.REGIONS);
}

/**
 * Validate stage against DATA_STANDARDS.STAGES
 */
export function validateStage(stage: string): { isValid: boolean; suggestion?: string } {
  return validateAgainstStandard(stage, DATA_STANDARDS.STAGES);
}

/**
 * Validate vertical against DATA_STANDARDS.VERTICALS
 */
export function validateVertical(vertical: string): { isValid: boolean; suggestion?: string } {
  return validateAgainstStandard(vertical, DATA_STANDARDS.VERTICALS);
}

/**
 * Validate business model against DATA_STANDARDS.BUSINESS_MODELS
 */
export function validateBusinessModel(model: string): { isValid: boolean; suggestion?: string } {
  return validateAgainstStandard(model, DATA_STANDARDS.BUSINESS_MODELS);
}

// Juror preference options for consistent use across the platform

export const REGION_OPTIONS = [
  'Africa',
  'Asia Pacific (APAC)', 
  'Europe',
  'Latin America (LATAM)',
  'Middle East & North Africa (MENA)',
  'North America'
] as const;

export const VERTICAL_OPTIONS = [
  'Artificial Intelligence',
  'Blockchain & Web3',
  'Clean Energy',
  'Cybersecurity',
  'E-commerce & Retail',
  'Education',
  'Financial Technology',
  'Food & Agriculture',
  'Gaming & Entertainment',
  'Healthcare',
  'Internet of Things (IoT)',
  'Mobility & Transportation',
  'Property Technology',
  'SaaS',
  'Technology'
] as const;

export const STAGE_OPTIONS = [
  'Pre-seed',
  'Seed', 
  'Series A',
  'Series B',
  'Series C+',
  'Growth',
  'Late Stage'
] as const;

// Legacy expertise options for backward compatibility
export const EXPERTISE_OPTIONS = [
  'AI/ML',
  'Fintech', 
  'Healthcare',
  'SaaS',
  'E-commerce',
  'Blockchain',
  'IoT',
  'Cybersecurity',
  'EdTech',
  'Climate Tech',
  'Mobility',
  'Gaming'
] as const;
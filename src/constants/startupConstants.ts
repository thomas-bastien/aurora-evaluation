// Aurora's official vertical taxonomy - must match exactly
export const AURORA_VERTICALS = [
  'Artificial Intelligence (AI/ML)',
  'Fintech',
  'HealthTech & MedTech',
  'Wellbeing, Longevity & Life Sciences',
  'PharmTech',
  'RetailTech & E-commerce',
  'Enterprise Software',
  'Cybersecurity',
  'Productivity Tools',
  'Transportation & Mobility',
  'Energy & Sustainability',
  'AgriTech & Food Tech',
  'Media & Entertainment',
  'AdTech & MarTech',
  'Real Estate & PropTech',
  'Education Technology (EdTech)',
  'Logistics & Supply Chain',
  'Construction Tech',
  'Space Technology',
  'Semiconductors & Hardware',
  'Data Infrastructure & Analytics',
  'Industrial Automation & Robotics',
  'Aerospace & Defense',
  'Gaming & Visual Assets',
  'SportTech',
  'Web3 / Blockchain / Crypto',
  'TravelTech',
  'No Tech, not a Venture Business',
  'Others (Specify)'
] as const;

export const BUSINESS_MODELS = [
  'B2B',
  'B2C', 
  'B2B2C',
  'Marketplace',
  'SaaS',
  'Hardware',
  'Services',
  'Platform'
] as const;

export const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
] as const;

// Aligned region options for consistent matchmaking 
export const REGION_OPTIONS = [
  'Africa',
  'Asia Pacific (APAC)', 
  'Europe',
  'Latin America (LATAM)',
  'Middle East & North Africa (MENA)',
  'North America'
] as const;

export type AuroraVertical = typeof AURORA_VERTICALS[number];
export type BusinessModel = typeof BUSINESS_MODELS[number];
export type CurrencyCode = typeof CURRENCIES[number]['code'];
export type RegionOption = typeof REGION_OPTIONS[number];
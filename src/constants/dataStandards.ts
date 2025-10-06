// SINGLE SOURCE OF TRUTH for all data standards across the platform
// This is the canonical reference for all dropdown values, matchmaking criteria, and data validation

export const DATA_STANDARDS = {
  REGIONS: [
    'Africa',
    'Asia Pacific (APAC)',
    'Europe',
    'Latin America (LATAM)',
    'Middle East & North Africa (MENA)',
    'North America',
    'Other'
  ] as const,

  VERTICALS: [
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
  ] as const,

  STAGES: [
    'Pre-Seed',
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Growth',
    'IPO'
  ] as const,

  BUSINESS_MODELS: [
    'B2C – Business to Consumer',
    'B2B2C – Business to Business to Consumer',
    'B2B – Business to Business (Enterprise & SMEs)',
    'B2B – Business to Business (Enterprise)',
    'B2B – Business to Business (SMEs)',
    'D2C – Direct to Consumer',
    'C2C – Consumer to Consumer (incl. Marketplaces/Platforms)'
  ] as const,

  CURRENCIES: [
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
  ] as const
} as const;

// Export TypeScript types for type safety
export type Region = typeof DATA_STANDARDS.REGIONS[number];
export type Vertical = typeof DATA_STANDARDS.VERTICALS[number];
export type Stage = typeof DATA_STANDARDS.STAGES[number];
export type BusinessModel = typeof DATA_STANDARDS.BUSINESS_MODELS[number];
export type Currency = typeof DATA_STANDARDS.CURRENCIES[number];
export type CurrencyCode = Currency['code'];

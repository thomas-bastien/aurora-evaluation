// Juror preference options for consistent use across the platform
// Import region options from single source of truth
import { REGION_OPTIONS } from './startupConstants';

export { REGION_OPTIONS };

// Use Aurora's official vertical taxonomy for consistent matchmaking
export const VERTICAL_OPTIONS = [
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

export const STAGE_OPTIONS = [
  'Pre-Seed',
  'Seed', 
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'IPO'
] as const;
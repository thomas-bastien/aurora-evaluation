// Re-export from single source of truth for backward compatibility
import { DATA_STANDARDS } from './dataStandards';

export const REGION_OPTIONS = DATA_STANDARDS.REGIONS;
export const VERTICAL_OPTIONS = DATA_STANDARDS.VERTICALS;
export const STAGE_OPTIONS = DATA_STANDARDS.STAGES;

// Export types
export type Region = typeof REGION_OPTIONS[number];
export type Vertical = typeof VERTICAL_OPTIONS[number];
export type Stage = typeof STAGE_OPTIONS[number];

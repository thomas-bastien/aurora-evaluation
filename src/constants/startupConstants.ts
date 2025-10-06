// Re-export from single source of truth for backward compatibility
import { DATA_STANDARDS } from './dataStandards';

export const AURORA_VERTICALS = DATA_STANDARDS.VERTICALS;
export const BUSINESS_MODELS = DATA_STANDARDS.BUSINESS_MODELS;
export const REGION_OPTIONS = DATA_STANDARDS.REGIONS;
export const CURRENCIES = DATA_STANDARDS.CURRENCIES;

// Re-export types with existing names
export type AuroraVertical = typeof AURORA_VERTICALS[number];
export type BusinessModel = typeof BUSINESS_MODELS[number];
export type RegionOption = typeof REGION_OPTIONS[number];
export type CurrencyCode = typeof CURRENCIES[number]['code'];

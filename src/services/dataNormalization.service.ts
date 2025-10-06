/**
 * Centralized Data Normalization Service
 * Single pipeline for ALL data entry: forms, CSV imports, API calls
 * Ensures consistent data standards across the platform
 */

import { DATA_STANDARDS } from '@/constants/dataStandards';
import { 
  normalizeRegion, 
  normalizeStage, 
  normalizeVertical,
  normalizeRegionWithMetadata,
  normalizeStageWithMetadata,
  normalizeVerticalWithMetadata,
  type NormalizationResult
} from '@/utils/fieldNormalization';

export interface ValidationReport {
  field: string;
  originalValue: any;
  normalizedValue: any;
  status: 'normalized' | 'invalid' | 'unchanged';
  warning?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface NormalizedData<T> {
  data: T;
  report: ValidationReport[];
  hasWarnings: boolean;
  hasErrors: boolean;
}

export class DataNormalizationService {
  /**
   * Normalize startup data - use for ALL startup data entry
   * Normalizes: stage, verticals, regions, business_model
   */
  static normalizeStartup(startup: any): NormalizedData<any> {
    const report: ValidationReport[] = [];
    const normalized = { ...startup };

    // Normalize stage (single value)
    if (normalized.stage) {
      const original = normalized.stage;
      const metadata = normalizeStageWithMetadata(original);
      normalized.stage = metadata.value;
      
      // Check if normalized value is valid
      const isValid = DATA_STANDARDS.STAGES.includes(normalized.stage as any);
      
      if (!isValid) {
        report.push({
          field: 'stage',
          originalValue: original,
          normalizedValue: normalized.stage,
          status: 'invalid',
          warning: `"${normalized.stage}" is not a recognized stage. Valid stages: ${DATA_STANDARDS.STAGES.join(', ')}`,
          confidence: metadata.confidence
        });
      } else if (metadata.wasNormalized) {
        report.push({
          field: 'stage',
          originalValue: original,
          normalizedValue: normalized.stage,
          status: 'normalized',
          confidence: metadata.confidence
        });
      }
    }

    // Normalize verticals array
    if (normalized.verticals && Array.isArray(normalized.verticals)) {
      const original = [...normalized.verticals];
      const normalizedVerticals: string[] = [];
      const invalidVerticals: string[] = [];
      
      for (const vertical of normalized.verticals) {
        const metadata = normalizeVerticalWithMetadata(vertical);
        const normalizedValue = metadata.value;
        normalizedVerticals.push(normalizedValue);
        
        if (!DATA_STANDARDS.VERTICALS.includes(normalizedValue as any)) {
          invalidVerticals.push(normalizedValue);
        }
      }
      
      normalized.verticals = [...new Set(normalizedVerticals)]; // Remove duplicates
      
      if (invalidVerticals.length > 0) {
        report.push({
          field: 'verticals',
          originalValue: original,
          normalizedValue: normalized.verticals,
          status: 'invalid',
          warning: `Unrecognized verticals: ${invalidVerticals.join(', ')}. Valid verticals: ${DATA_STANDARDS.VERTICALS.slice(0, 5).join(', ')}...`,
          confidence: 'low'
        });
      } else if (JSON.stringify(original) !== JSON.stringify(normalized.verticals)) {
        report.push({
          field: 'verticals',
          originalValue: original,
          normalizedValue: normalized.verticals,
          status: 'normalized',
          confidence: 'high'
        });
      }
    }

    // Normalize regions array
    if (normalized.regions && Array.isArray(normalized.regions)) {
      const original = [...normalized.regions];
      const normalizedRegions: string[] = [];
      const invalidRegions: string[] = [];
      
      for (const region of normalized.regions) {
        const metadata = normalizeRegionWithMetadata(region);
        const normalizedValue = metadata.value;
        normalizedRegions.push(normalizedValue);
        
        if (!DATA_STANDARDS.REGIONS.includes(normalizedValue as any)) {
          invalidRegions.push(normalizedValue);
        }
      }
      
      normalized.regions = [...new Set(normalizedRegions)]; // Remove duplicates
      
      if (invalidRegions.length > 0) {
        report.push({
          field: 'regions',
          originalValue: original,
          normalizedValue: normalized.regions,
          status: 'invalid',
          warning: `Unrecognized regions: ${invalidRegions.join(', ')}. Valid regions: ${DATA_STANDARDS.REGIONS.join(', ')}`,
          confidence: 'low'
        });
      } else if (JSON.stringify(original) !== JSON.stringify(normalized.regions)) {
        report.push({
          field: 'regions',
          originalValue: original,
          normalizedValue: normalized.regions,
          status: 'normalized',
          confidence: 'high'
        });
      }
    }

    // Normalize business_model array
    if (normalized.business_model && Array.isArray(normalized.business_model)) {
      const original = [...normalized.business_model];
      const invalidModels: string[] = [];
      
      for (const model of normalized.business_model) {
        if (!DATA_STANDARDS.BUSINESS_MODELS.includes(model as any)) {
          invalidModels.push(model);
        }
      }
      
      if (invalidModels.length > 0) {
        report.push({
          field: 'business_model',
          originalValue: original,
          normalizedValue: normalized.business_model,
          status: 'invalid',
          warning: `Unrecognized business models: ${invalidModels.join(', ')}. Valid models: ${DATA_STANDARDS.BUSINESS_MODELS.join(', ')}`,
          confidence: 'low'
        });
      }
    }

    return {
      data: normalized,
      report,
      hasWarnings: report.some(r => r.status === 'invalid'),
      hasErrors: report.some(r => r.status === 'invalid' && r.confidence === 'low')
    };
  }

  /**
   * Normalize juror data - use for ALL juror data entry
   * Normalizes: preferred_stages, target_verticals, preferred_regions
   */
  static normalizeJuror(juror: any): NormalizedData<any> {
    const report: ValidationReport[] = [];
    const normalized = { ...juror };

    // Normalize preferred_stages array
    if (normalized.preferred_stages && Array.isArray(normalized.preferred_stages)) {
      const original = [...normalized.preferred_stages];
      const normalizedStages: string[] = [];
      const invalidStages: string[] = [];
      
      for (const stage of normalized.preferred_stages) {
        const metadata = normalizeStageWithMetadata(stage);
        const normalizedValue = metadata.value;
        normalizedStages.push(normalizedValue);
        
        if (!DATA_STANDARDS.STAGES.includes(normalizedValue as any)) {
          invalidStages.push(normalizedValue);
        }
      }
      
      normalized.preferred_stages = [...new Set(normalizedStages)];
      
      if (invalidStages.length > 0) {
        report.push({
          field: 'preferred_stages',
          originalValue: original,
          normalizedValue: normalized.preferred_stages,
          status: 'invalid',
          warning: `Unrecognized stages: ${invalidStages.join(', ')}. Valid stages: ${DATA_STANDARDS.STAGES.join(', ')}`,
          confidence: 'low'
        });
      } else if (JSON.stringify(original) !== JSON.stringify(normalized.preferred_stages)) {
        report.push({
          field: 'preferred_stages',
          originalValue: original,
          normalizedValue: normalized.preferred_stages,
          status: 'normalized',
          confidence: 'high'
        });
      }
    }

    // Normalize target_verticals array
    if (normalized.target_verticals && Array.isArray(normalized.target_verticals)) {
      const original = [...normalized.target_verticals];
      const normalizedVerticals: string[] = [];
      const invalidVerticals: string[] = [];
      
      for (const vertical of normalized.target_verticals) {
        const metadata = normalizeVerticalWithMetadata(vertical);
        const normalizedValue = metadata.value;
        normalizedVerticals.push(normalizedValue);
        
        if (!DATA_STANDARDS.VERTICALS.includes(normalizedValue as any)) {
          invalidVerticals.push(normalizedValue);
        }
      }
      
      normalized.target_verticals = [...new Set(normalizedVerticals)];
      
      if (invalidVerticals.length > 0) {
        report.push({
          field: 'target_verticals',
          originalValue: original,
          normalizedValue: normalized.target_verticals,
          status: 'invalid',
          warning: `Unrecognized verticals: ${invalidVerticals.join(', ')}. Valid verticals: ${DATA_STANDARDS.VERTICALS.slice(0, 5).join(', ')}...`,
          confidence: 'low'
        });
      } else if (JSON.stringify(original) !== JSON.stringify(normalized.target_verticals)) {
        report.push({
          field: 'target_verticals',
          originalValue: original,
          normalizedValue: normalized.target_verticals,
          status: 'normalized',
          confidence: 'high'
        });
      }
    }

    // Normalize preferred_regions array
    if (normalized.preferred_regions && Array.isArray(normalized.preferred_regions)) {
      const original = [...normalized.preferred_regions];
      const normalizedRegions: string[] = [];
      const invalidRegions: string[] = [];
      
      for (const region of normalized.preferred_regions) {
        const metadata = normalizeRegionWithMetadata(region);
        const normalizedValue = metadata.value;
        normalizedRegions.push(normalizedValue);
        
        if (!DATA_STANDARDS.REGIONS.includes(normalizedValue as any)) {
          invalidRegions.push(normalizedValue);
        }
      }
      
      normalized.preferred_regions = [...new Set(normalizedRegions)];
      
      if (invalidRegions.length > 0) {
        report.push({
          field: 'preferred_regions',
          originalValue: original,
          normalizedValue: normalized.preferred_regions,
          status: 'invalid',
          warning: `Unrecognized regions: ${invalidRegions.join(', ')}. Valid regions: ${DATA_STANDARDS.REGIONS.join(', ')}`,
          confidence: 'low'
        });
      } else if (JSON.stringify(original) !== JSON.stringify(normalized.preferred_regions)) {
        report.push({
          field: 'preferred_regions',
          originalValue: original,
          normalizedValue: normalized.preferred_regions,
          status: 'normalized',
          confidence: 'high'
        });
      }
    }

    return {
      data: normalized,
      report,
      hasWarnings: report.some(r => r.status === 'invalid'),
      hasErrors: report.some(r => r.status === 'invalid' && r.confidence === 'low')
    };
  }

  /**
   * Batch normalize startups - for CSV imports
   * Returns normalized data with aggregated statistics
   */
  static batchNormalizeStartups(startups: any[]): {
    normalized: any[];
    reports: NormalizedData<any>[];
    totalWarnings: number;
    totalErrors: number;
    summary: {
      total: number;
      withWarnings: number;
      withErrors: number;
      fullyNormalized: number;
    };
  } {
    const reports = startups.map(s => this.normalizeStartup(s));
    const withWarnings = reports.filter(r => r.hasWarnings).length;
    const withErrors = reports.filter(r => r.hasErrors).length;
    
    return {
      normalized: reports.map(r => r.data),
      reports,
      totalWarnings: withWarnings,
      totalErrors: withErrors,
      summary: {
        total: startups.length,
        withWarnings,
        withErrors,
        fullyNormalized: startups.length - withWarnings
      }
    };
  }

  /**
   * Batch normalize jurors - for CSV imports
   * Returns normalized data with aggregated statistics
   */
  static batchNormalizeJurors(jurors: any[]): {
    normalized: any[];
    reports: NormalizedData<any>[];
    totalWarnings: number;
    totalErrors: number;
    summary: {
      total: number;
      withWarnings: number;
      withErrors: number;
      fullyNormalized: number;
    };
  } {
    const reports = jurors.map(j => this.normalizeJuror(j));
    const withWarnings = reports.filter(r => r.hasWarnings).length;
    const withErrors = reports.filter(r => r.hasErrors).length;
    
    return {
      normalized: reports.map(r => r.data),
      reports,
      totalWarnings: withWarnings,
      totalErrors: withErrors,
      summary: {
        total: jurors.length,
        withWarnings,
        withErrors,
        fullyNormalized: jurors.length - withWarnings
      }
    };
  }

  /**
   * Get a human-readable summary of validation issues
   */
  static getValidationSummary(report: ValidationReport[]): string {
    const issues = report.filter(r => r.status === 'invalid');
    if (issues.length === 0) return 'All fields validated successfully';
    
    return issues.map(issue => 
      `${issue.field}: ${issue.warning}`
    ).join('\n');
  }
}

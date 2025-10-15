/**
 * Standardized Email Template Variables
 * 
 * This file defines the standard variable names used across all email templates
 * to ensure consistency and prevent errors.
 */

export interface StandardEmailVariables {
  // Participant Names
  startup_name: string;
  founder_name: string;
  juror_name: string;
  
  // Evaluation Data
  vc_feedback_sections: string; // HTML formatted VC feedback
  feedback_summary: string;
  
  // Round Information
  round_name: string;
  from_round: string;
  to_round: string;
  
  // Action Items
  next_steps: string;
  encouragement_message: string;
  
  // Counts and Metrics
  juror_count: string;
  evaluation_count: string;
  assignment_count: string;
  
  // Links and HTML Content
  jurors_html: string; // For Calendly links and formatted juror lists
  platform_url: string;
  
  // Custom Content (for flexible messaging)
  custom_message: string;
}

/**
 * Template Variable Mapping
 * Maps old/inconsistent variable names to standardized names
 */
export const VARIABLE_ALIASES: Record<string, keyof StandardEmailVariables> = {
  'founder_first_name': 'founder_name',
  'vc_name': 'juror_name',
  'vc_count': 'juror_count',
  'evaluation_summary': 'feedback_summary',
  'vc_feedback': 'vc_feedback_sections',
};

/**
 * Validates that all required template variables are provided
 */
export function validateTemplateVariables(
  templateVariables: string[],
  providedVariables: Record<string, any>
): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const varName of templateVariables) {
    const value = providedVariables[varName];
    
    if (value === undefined || value === null) {
      missing.push(varName);
    } else if (value === '') {
      warnings.push(`Variable '${varName}' is empty`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Detects unreplaced placeholders in email content
 */
export function detectUnreplacedPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
}

/**
 * Normalizes variable names using aliases
 */
export function normalizeVariables(
  variables: Record<string, any>
): Record<string, any> {
  const normalized: Record<string, any> = { ...variables };
  
  for (const [oldName, newName] of Object.entries(VARIABLE_ALIASES)) {
    if (oldName in variables && !(newName in variables)) {
      normalized[newName] = variables[oldName];
    }
  }
  
  return normalized;
}

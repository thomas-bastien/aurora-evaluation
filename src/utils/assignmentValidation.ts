import { supabase } from '@/integrations/supabase/client';

export interface Startup {
  id: string;
  name: string;
}

export interface Juror {
  id: string;
  name: string;
  evaluation_limit?: number | null;
}

export interface Assignment {
  startup_id: string;
  juror_id: string;
}

export interface AssignmentValidation {
  startupId: string;
  startupName: string;
  assignedCount: number;
  isUnderAssigned: boolean;
  severity: 'none' | 'warning' | 'critical';
}

export interface WorkloadValidation {
  jurorId: string;
  jurorName: string;
  currentAssignments: number;
  limit: number;
  isOverLimit: boolean;
  isAtLimit: boolean;
  isCustomLimit: boolean;
}

/**
 * Calculate dynamic evaluation limit based on total startups and jurors
 */
export function calculateDynamicLimit(
  totalStartups: number,
  totalJurors: number
): number {
  if (totalJurors === 0) return 4; // Fallback
  return Math.ceil((totalStartups * 3) / totalJurors);
}

/**
 * Get effective limit for a juror (custom or dynamic)
 */
export function getEffectiveLimit(
  juror: Juror,
  totalStartups: number,
  totalJurors: number
): number {
  if (juror.evaluation_limit !== null && juror.evaluation_limit !== undefined) {
    return juror.evaluation_limit;
  }
  return calculateDynamicLimit(totalStartups, totalJurors);
}

/**
 * Validate startup assignments
 */
export function validateStartupAssignments(
  startups: Startup[],
  assignments: Assignment[]
): AssignmentValidation[] {
  return startups.map(startup => {
    const count = assignments.filter(a => a.startup_id === startup.id).length;
    return {
      startupId: startup.id,
      startupName: startup.name,
      assignedCount: count,
      isUnderAssigned: count < 3,
      severity: count === 0 ? 'critical' : count < 3 ? 'warning' : 'none'
    };
  });
}

/**
 * Validate juror workloads
 */
export function validateJurorWorkloads(
  jurors: Juror[],
  assignments: Assignment[],
  totalStartups: number
): WorkloadValidation[] {
  return jurors.map(juror => {
    const currentAssignments = assignments.filter(a => a.juror_id === juror.id).length;
    const limit = getEffectiveLimit(juror, totalStartups, jurors.length);
    
    return {
      jurorId: juror.id,
      jurorName: juror.name,
      currentAssignments,
      limit,
      isOverLimit: currentAssignments > limit,
      isAtLimit: currentAssignments === limit,
      isCustomLimit: juror.evaluation_limit !== null && juror.evaluation_limit !== undefined
    };
  });
}

/**
 * Get summary message for under-assigned startups
 */
export function getUnderAssignedSummary(validations: AssignmentValidation[]): string {
  const underAssigned = validations.filter(v => v.isUnderAssigned);
  if (underAssigned.length === 0) return '';
  
  const list = underAssigned
    .slice(0, 5)
    .map(v => `${v.startupName} (${v.assignedCount}/3)`)
    .join(', ');
  
  const more = underAssigned.length > 5 ? ` and ${underAssigned.length - 5} more` : '';
  
  return `${underAssigned.length} startup(s) below minimum: ${list}${more}`;
}

/**
 * Get summary message for over-limit jurors
 */
export function getOverLimitSummary(validations: WorkloadValidation[]): string {
  const overLimit = validations.filter(v => v.isOverLimit);
  if (overLimit.length === 0) return '';
  
  const list = overLimit
    .slice(0, 5)
    .map(v => `${v.jurorName} (${v.currentAssignments}/${v.limit})`)
    .join(', ');
  
  const more = overLimit.length > 5 ? ` and ${overLimit.length - 5} more` : '';
  
  return `${overLimit.length} juror(s) over limit: ${list}${more}`;
}

/**
 * Get workload badge color
 */
export function getWorkloadBadgeColor(current: number, limit: number): string {
  if (current > limit) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (current === limit) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-success/10 text-success border-success/20';
}

/**
 * Get assignment count badge color
 */
export function getAssignmentBadgeColor(count: number): string {
  if (count === 0) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (count < 3) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-success/10 text-success border-success/20';
}

// Centralized status utilities for consistent status handling across the app

export type StatusType = 'pending' | 'under_review' | 'selected' | 'rejected' | 'not_evaluated' | 'draft' | 'submitted' | 'completed' | 'inactive';

export const STATUS_LABELS: Record<StatusType, string> = {
  pending: 'Pending',
  under_review: 'Under Review', 
  selected: 'Selected',
  rejected: 'Rejected',
  not_evaluated: 'Not Evaluated',
  draft: 'Draft',
  submitted: 'Evaluated',
  completed: 'Completed',
  inactive: 'Inactive'
};

export const STATUS_COLORS: Record<StatusType, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  selected: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200', 
  rejected: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  not_evaluated: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  draft: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  submitted: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
  completed: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
};

export const STATUS_TEXT_COLORS: Record<StatusType, string> = {
  pending: 'text-gray-600',
  under_review: 'text-blue-600',
  selected: 'text-green-600',
  rejected: 'text-red-600',
  not_evaluated: 'text-yellow-600',
  draft: 'text-orange-600',
  submitted: 'text-emerald-600',
  completed: 'text-green-600',
  inactive: 'text-gray-600'
};

export const JUROR_STATUS_LABELS = {
  inactive: 'Inactive',
  pending: 'Not Started', 
  under_review: 'In Progress',
  completed: 'Completed'
} as const;
export type JuryStatusType = 'inactive' | 'not_started' | 'in_progress' | 'completed';

export const JURY_STATUS_LABELS: Record<JuryStatusType, string> = {
  inactive: 'Inactive',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed'
};

export const JURY_STATUS_COLORS: Record<JuryStatusType, string> = {
  inactive: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  not_started: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
};

export const JURY_STATUS_TEXT_COLORS: Record<JuryStatusType, string> = {
  inactive: 'text-gray-600',
  not_started: 'text-yellow-600',
  in_progress: 'text-blue-600',
  completed: 'text-green-600'
};

export function getJurorStatusLabel(status: StatusType): string {
  return JUROR_STATUS_LABELS[status] || getStatusLabel(status);
}

// Get display label for a status
export function getStatusLabel(status: string): string {
  const normalizedStatus = status as StatusType;
  return STATUS_LABELS[normalizedStatus] || status;
}

// Get color classes for a status badge
export function getStatusColor(status: string): string {
  const normalizedStatus = status as StatusType;
  return STATUS_COLORS[normalizedStatus] || STATUS_COLORS.pending;
}

// Get text color classes for a status
export function getStatusTextColor(status: string): string {
  const normalizedStatus = status as StatusType;
  return STATUS_TEXT_COLORS[normalizedStatus] || STATUS_TEXT_COLORS.pending;
}

// Get status with round context for clarity
export function getStatusWithRound(status: string, roundName?: string): string {
  const label = getStatusLabel(status);
  if (!roundName) return label;
  
  const roundLabel = roundName === 'screening' ? 'Screening Round' : 'Pitching Round';
  return `${label} (${roundLabel})`;
}

// Validate if a status is a valid StatusType
export function isValidStatus(status: string): status is StatusType {
  return Object.keys(STATUS_LABELS).includes(status);
}

// Get display label for jury status
export function getJuryStatusLabel(status: string): string {
  const normalizedStatus = status as JuryStatusType;
  return JURY_STATUS_LABELS[normalizedStatus] || status;
}

// Get color classes for jury status badge
export function getJuryStatusColor(status: string): string {
  const normalizedStatus = status as JuryStatusType;
  return JURY_STATUS_COLORS[normalizedStatus] || JURY_STATUS_COLORS.inactive;
}

// Get text color classes for jury status
export function getJuryStatusTextColor(status: string): string {
  const normalizedStatus = status as JuryStatusType;
  return JURY_STATUS_TEXT_COLORS[normalizedStatus] || JURY_STATUS_TEXT_COLORS.inactive;
}

// Validate if a status is a valid JuryStatusType
export function isValidJuryStatus(status: string): status is JuryStatusType {
  return Object.keys(JURY_STATUS_LABELS).includes(status);
}
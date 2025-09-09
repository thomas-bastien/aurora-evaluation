// Centralized status utilities for consistent status handling across the app

export type StatusType = 'pending' | 'under_review' | 'selected' | 'rejected' | 'not_evaluated' | 'draft' | 'submitted';

// Status labels for UI display
export const STATUS_LABELS: Record<StatusType, string> = {
  pending: 'Pending',
  under_review: 'Under Review', 
  selected: 'Selected',
  rejected: 'Rejected',
  not_evaluated: 'Not Evaluated',
  draft: 'Draft',
  submitted: 'Evaluated'
};

// Status colors for badges and UI elements
export const STATUS_COLORS: Record<StatusType, string> = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  selected: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200', 
  rejected: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  not_evaluated: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  draft: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  submitted: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
};

// Status colors for text (used in lists and simple displays)
export const STATUS_TEXT_COLORS: Record<StatusType, string> = {
  pending: 'text-gray-600',
  under_review: 'text-blue-600',
  selected: 'text-green-600',
  rejected: 'text-red-600',
  not_evaluated: 'text-yellow-600',
  draft: 'text-orange-600',
  submitted: 'text-emerald-600'
};

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
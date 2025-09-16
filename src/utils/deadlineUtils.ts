import { differenceInDays, format, isPast } from 'date-fns';

/**
 * Calculate days remaining until a deadline
 */
export const calculateDaysRemaining = (deadline: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  return differenceInDays(deadline, today);
};

/**
 * Check if a deadline has passed
 */
export const isDeadlinePassed = (deadline: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  return isPast(deadline);
};

/**
 * Format deadline display with days remaining or closed status
 */
export const formatDeadlineDisplay = (deadline: Date, roundClosed?: boolean): string => {
  const formattedDate = format(deadline, 'dd/MM/yyyy');
  
  if (roundClosed || isDeadlinePassed(deadline)) {
    return `Round closed (Deadline: ${formattedDate})`;
  }
  
  const daysRemaining = calculateDaysRemaining(deadline);
  
  if (daysRemaining === 0) {
    return `Deadline: ${formattedDate} (Today)`;
  } else if (daysRemaining === 1) {
    return `Deadline: ${formattedDate} (1 day left)`;
  } else if (daysRemaining > 0) {
    return `Deadline: ${formattedDate} (${daysRemaining} days left)`;
  } else {
    return `Round closed (Deadline: ${formattedDate})`;
  }
};

/**
 * Get deadline status for display (active, ending soon, closed)
 */
export const getDeadlineStatus = (deadline: Date): 'active' | 'ending-soon' | 'closed' => {
  if (isDeadlinePassed(deadline)) {
    return 'closed';
  }
  
  const daysRemaining = calculateDaysRemaining(deadline);
  if (daysRemaining <= 3) {
    return 'ending-soon';
  }
  
  return 'active';
};

/**
 * Format deadline display with simplified format - shows only days remaining
 */
export const formatDeadlineSimple = (deadline: Date, roundClosed?: boolean): string => {
  if (roundClosed || isDeadlinePassed(deadline)) {
    return 'Round closed';
  }
  
  const daysRemaining = calculateDaysRemaining(deadline);
  
  if (daysRemaining === 0) {
    return 'Today';
  } else if (daysRemaining === 1) {
    return '1 day left';
  } else if (daysRemaining > 0) {
    return `${daysRemaining} days left`;
  } else {
    return 'Round closed';
  }
};

/**
 * Format date for form inputs (YYYY-MM-DD)
 */
export const formatDateForInput = (date: Date | string): string => {
  if (typeof date === 'string') {
    return date;
  }
  return format(date, 'yyyy-MM-dd');
};

/**
 * Parse date from form input
 */
export const parseDateFromInput = (dateString: string): Date => {
  return new Date(dateString);
};
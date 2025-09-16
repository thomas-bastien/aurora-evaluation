// Utility functions for calculating unified jury status

import { supabase } from '@/integrations/supabase/client';
import type { StatusType } from './statusUtils';

export type { StatusType };

interface JuryAssignmentCounts {
  assigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

// Calculate unified jury status based on current active round
export async function calculateJurorStatus(jurorId: string): Promise<StatusType> {
  try {
    // Get current active round
    const { data: activeRound } = await supabase
      .from('rounds')
      .select('name')
      .eq('status', 'active')
      .single();

    if (!activeRound) {
      return 'inactive';
    }

    return calculateJuryRoundStatus(jurorId, activeRound.name as 'screening' | 'pitching');
  } catch (error) {
    console.error('Error calculating unified jury status:', error);
    return 'inactive';
  }
}

// Calculate jury status for a specific round (internal helper)
async function calculateJuryRoundStatus(
  jurorId: string, 
  roundName: 'screening' | 'pitching'
): Promise<StatusType> {
  try {
    // Get juror data first to check if they have a user_id
    const { data: jurorData, error: jurorError } = await supabase
      .from('jurors')
      .select('user_id')
      .eq('id', jurorId)
      .single();

    if (jurorError) throw jurorError;

    // If juror doesn't have a user_id, they're inactive
    if (!jurorData.user_id) {
      return 'inactive';
    }

    // Get assignment counts
    const counts = await getJuryAssignmentCounts(jurorId, roundName);

    // If no assignments, juror is inactive
    if (counts.assigned === 0) {
      return 'inactive';
    }

    // If all evaluations completed, status is completed
    if (counts.completed === counts.assigned) {
      return 'completed';
    }

    // If some evaluations started (completed or in progress), status is under_review
    if (counts.completed > 0 || counts.inProgress > 0) {
      return 'under_review';
    }

    // If assignments exist but no evaluations started, status is pending
    return 'pending';
  } catch (error) {
    console.error('Error calculating jury round status:', error);
    return 'inactive';
  }
}

// Get assignment and evaluation counts for a juror in a specific round
export async function getJuryAssignmentCounts(
  jurorId: string,
  roundName: 'screening' | 'pitching'
): Promise<JuryAssignmentCounts> {
  try {
    // Get juror's user_id
    const { data: jurorData, error: jurorError } = await supabase
      .from('jurors')
      .select('user_id')
      .eq('id', jurorId)
      .single();

    if (jurorError) throw jurorError;

    const assignmentTable = roundName === 'screening' ? 'screening_assignments' : 'pitching_assignments';
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

    // Get assignments count
    const { data: assignments, error: assignmentError } = await supabase
      .from(assignmentTable)
      .select('id')
      .eq('juror_id', jurorId);

    if (assignmentError) throw assignmentError;

    const assigned = assignments?.length || 0;

    // If no user_id or no assignments, return zeros
    if (!jurorData.user_id || assigned === 0) {
      return {
        assigned: assigned,
        completed: 0,
        inProgress: 0,
        notStarted: assigned
      };
    }

    // Get evaluation counts by status
    const { data: evaluations, error: evaluationError } = await supabase
      .from(evaluationTable)
      .select('status')
      .eq('evaluator_id', jurorData.user_id);

    if (evaluationError) throw evaluationError;

    const completed = evaluations?.filter(e => e.status === 'submitted').length || 0;
    const inProgress = evaluations?.filter(e => e.status === 'draft').length || 0;
    const notStarted = assigned - completed - inProgress;

    return {
      assigned,
      completed,
      inProgress,
      notStarted: Math.max(0, notStarted)
    };
  } catch (error) {
    console.error('Error getting jury assignment counts:', error);
    return {
      assigned: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0
    };
  }
}

// Calculate unified status for multiple jurors efficiently
export async function calculateMultipleJurorStatuses(
  jurorIds: string[]
): Promise<Record<string, { status: StatusType; counts: JuryAssignmentCounts }>> {
  try {
    // Get current active round
    const { data: activeRound } = await supabase
      .from('rounds')
      .select('name')
      .eq('status', 'active')
      .single();

    if (!activeRound) {
      // Return inactive status for all jurors if no active round
      const results: Record<string, { status: StatusType; counts: JuryAssignmentCounts }> = {};
      jurorIds.forEach(id => {
        results[id] = {
          status: 'inactive',
          counts: { assigned: 0, completed: 0, inProgress: 0, notStarted: 0 }
        };
      });
      return results;
    }

    return calculateMultipleJuryRoundStatuses(jurorIds, activeRound.name as 'screening' | 'pitching');
  } catch (error) {
    console.error('Error calculating multiple unified jury statuses:', error);
    return {};
  }
}

// Calculate status for multiple jurors for a specific round (internal helper)
async function calculateMultipleJuryRoundStatuses(
  jurorIds: string[],
  roundName: 'screening' | 'pitching'
): Promise<Record<string, { status: StatusType; counts: JuryAssignmentCounts }>> {
  const results: Record<string, { status: StatusType; counts: JuryAssignmentCounts }> = {};

  try {
    // Get all jurors data in one query
    const { data: jurorsData, error: jurorsError } = await supabase
      .from('jurors')
      .select('id, user_id')
      .in('id', jurorIds);

    if (jurorsError) throw jurorsError;

    const assignmentTable = roundName === 'screening' ? 'screening_assignments' : 'pitching_assignments';
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

    // Get all assignments in one query
    const { data: allAssignments, error: assignmentError } = await supabase
      .from(assignmentTable)
      .select('juror_id')
      .in('juror_id', jurorIds);

    if (assignmentError) throw assignmentError;

    // Get user IDs that have accounts
    const userIds = jurorsData?.filter(j => j.user_id).map(j => j.user_id!) || [];
    
    // Get all evaluations in one query
    let allEvaluations: any[] = [];
    if (userIds.length > 0) {
      const { data: evaluations, error: evaluationError } = await supabase
        .from(evaluationTable)
        .select('evaluator_id, status')
        .in('evaluator_id', userIds);

      if (evaluationError) throw evaluationError;
      allEvaluations = evaluations || [];
    }

    // Process each juror
    for (const juror of jurorsData || []) {
      const assignments = allAssignments?.filter(a => a.juror_id === juror.id) || [];
      const assigned = assignments.length;

      if (!juror.user_id || assigned === 0) {
        const status: StatusType = assigned === 0 ? 'inactive' : 'pending';
        results[juror.id] = {
          status,
          counts: {
            assigned,
            completed: 0,
            inProgress: 0,
            notStarted: assigned
          }
        };
        continue;
      }

      const evaluations = allEvaluations.filter(e => e.evaluator_id === juror.user_id);
      const completed = evaluations.filter(e => e.status === 'submitted').length;
      const inProgress = evaluations.filter(e => e.status === 'draft').length;
      const notStarted = Math.max(0, assigned - completed - inProgress);

      let status: StatusType;
      if (completed === assigned) {
        status = 'completed';
      } else if (completed > 0 || inProgress > 0) {
        status = 'under_review';
      } else {
        status = 'pending';
      }

      results[juror.id] = {
        status,
        counts: {
          assigned,
          completed,
          inProgress,
          notStarted
        }
      };
    }

    return results;
  } catch (error) {
    console.error('Error calculating multiple jury statuses:', error);
    return {};
  }
}
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

export interface ProgressiveJurorStatus {
  status: StatusType;
  currentRound: 'screening' | 'pitching' | null;
  completedRounds: ('screening' | 'pitching')[];
}

// Calculate progressive jury status - screening must be completed before pitching
export async function calculateProgressiveJurorStatus(jurorId: string): Promise<ProgressiveJurorStatus> {
  // First, check if juror has been invited
  const { data: juror } = await supabase
    .from('jurors')
    .select('invitation_sent_at, user_id')
    .eq('id', jurorId)
    .single();

  if (!juror?.invitation_sent_at) {
    return {
      status: 'not_invited' as StatusType,
      currentRound: 'screening',
      completedRounds: []
    };
  }

  if (!juror.user_id) {
    return {
      status: 'pending' as StatusType,
      currentRound: 'screening', 
      completedRounds: []
    };
  }

  try {
    // Get counts for both rounds
    const [screeningCounts, pitchingCounts] = await Promise.all([
      getJuryAssignmentCounts(jurorId, 'screening'),
      getJuryAssignmentCounts(jurorId, 'pitching')
    ]);

    const completedRounds: ('screening' | 'pitching')[] = [];
    
    // Check screening completion
    const screeningCompleted = screeningCounts.assigned > 0 && screeningCounts.completed === screeningCounts.assigned;
    if (screeningCompleted) {
      completedRounds.push('screening');
    }

    // Progressive logic: pitching only available after screening completion
    let status: StatusType = 'inactive';
    let currentRound: 'screening' | 'pitching' = 'screening';

    // If no assignments in either round, juror is inactive
    if (screeningCounts.assigned === 0 && pitchingCounts.assigned === 0) {
      return { status: 'inactive', currentRound: 'screening', completedRounds };
    }

    // Check current status based on progression
    if (screeningCounts.assigned > 0 && !screeningCompleted) {
      // Still working on screening
      currentRound = 'screening';
      if (screeningCounts.completed > 0 || screeningCounts.inProgress > 0) {
        status = 'under_review';
      } else {
        status = 'pending';
      }
    } else if (screeningCompleted && pitchingCounts.assigned > 0) {
      // Screening complete, working on pitching
      currentRound = 'pitching';
      const pitchingCompleted = pitchingCounts.completed === pitchingCounts.assigned;
      
      if (pitchingCompleted) {
        completedRounds.push('pitching');
        status = 'completed';
      } else if (pitchingCounts.completed > 0 || pitchingCounts.inProgress > 0) {
        status = 'under_review';
      } else {
        status = 'pending';
      }
    } else if (screeningCompleted && pitchingCounts.assigned === 0) {
      // Screening complete, no pitching assignments
      status = 'completed';
      currentRound = 'screening'; // Show as completed screening
    }

    return { status, currentRound, completedRounds };
  } catch (error) {
    console.error('Error calculating progressive jury status:', error);
    return { status: 'inactive', currentRound: 'screening', completedRounds: [] };
  }
}

// Calculate unified jury status based on current active round (legacy function)
export async function calculateJurorStatus(jurorId: string): Promise<StatusType> {
  const progressiveStatus = await calculateProgressiveJurorStatus(jurorId);
  return progressiveStatus.status;
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

// Calculate progressive status for multiple jurors efficiently
export async function calculateMultipleProgressiveJurorStatuses(
  jurorIds: string[]
): Promise<Record<string, ProgressiveJurorStatus>> {
  const results: Record<string, ProgressiveJurorStatus> = {};

  try {
    // Get all jurors data in one query
    const { data: jurorsData, error: jurorsError } = await supabase
      .from('jurors')
      .select('id, user_id')
      .in('id', jurorIds);

    if (jurorsError) throw jurorsError;

    // Get all screening assignments
    const { data: screeningAssignments, error: screeningError } = await supabase
      .from('screening_assignments')
      .select('juror_id')
      .in('juror_id', jurorIds);

    if (screeningError) throw screeningError;

    // Get all pitching assignments
    const { data: pitchingAssignments, error: pitchingError } = await supabase
      .from('pitching_assignments')
      .select('juror_id')
      .in('juror_id', jurorIds);

    if (pitchingError) throw pitchingError;

    // Get user IDs that have accounts
    const userIds = jurorsData?.filter(j => j.user_id).map(j => j.user_id!) || [];
    
    // Get all screening evaluations
    let screeningEvaluations: any[] = [];
    let pitchingEvaluations: any[] = [];
    
    if (userIds.length > 0) {
      const [screeningEvalData, pitchingEvalData] = await Promise.all([
        supabase
          .from('screening_evaluations')
          .select('evaluator_id, status')
          .in('evaluator_id', userIds),
        supabase
          .from('pitching_evaluations')
          .select('evaluator_id, status')
          .in('evaluator_id', userIds)
      ]);

      screeningEvaluations = screeningEvalData.data || [];
      pitchingEvaluations = pitchingEvalData.data || [];
    }

    // Process each juror
    for (const juror of jurorsData || []) {
      // First, check if juror has been invited
      const { data: jurorInvite } = await supabase
        .from('jurors')
        .select('invitation_sent_at, user_id')
        .eq('id', juror.id)
        .single();

      if (!jurorInvite?.invitation_sent_at) {
        results[juror.id] = {
          status: 'not_invited' as StatusType,
          currentRound: 'screening',
          completedRounds: []
        };
        continue;
      }

      if (!jurorInvite.user_id) {
        results[juror.id] = {
          status: 'pending' as StatusType,
          currentRound: 'screening',
          completedRounds: []
        };
        continue;
      }

      const screeningAssigned = screeningAssignments?.filter(a => a.juror_id === juror.id).length || 0;
      const pitchingAssigned = pitchingAssignments?.filter(a => a.juror_id === juror.id).length || 0;

      const completedRounds: ('screening' | 'pitching')[] = [];
      let status: StatusType = 'inactive';
      let currentRound: 'screening' | 'pitching' | null = null;

      // If no assignments in either round
      if (screeningAssigned === 0 && pitchingAssigned === 0) {
        results[juror.id] = { status: 'inactive', currentRound: null, completedRounds };
        continue;
      }

      // Calculate screening progress
      let screeningCompleted = 0;
      let screeningInProgress = 0;
      
      if (juror.user_id && screeningAssigned > 0) {
        const screeningEvals = screeningEvaluations.filter(e => e.evaluator_id === juror.user_id);
        screeningCompleted = screeningEvals.filter(e => e.status === 'submitted').length;
        screeningInProgress = screeningEvals.filter(e => e.status === 'draft').length;
      }

      const isScreeningComplete = screeningAssigned > 0 && screeningCompleted === screeningAssigned;
      if (isScreeningComplete) {
        completedRounds.push('screening');
      }

      // Calculate pitching progress
      let pitchingCompleted = 0;
      let pitchingInProgress = 0;
      
      if (juror.user_id && pitchingAssigned > 0) {
        const pitchingEvals = pitchingEvaluations.filter(e => e.evaluator_id === juror.user_id);
        pitchingCompleted = pitchingEvals.filter(e => e.status === 'submitted').length;
        pitchingInProgress = pitchingEvals.filter(e => e.status === 'draft').length;
      }

      const isPitchingComplete = pitchingAssigned > 0 && pitchingCompleted === pitchingAssigned;
      if (isPitchingComplete) {
        completedRounds.push('pitching');
      }

      // Progressive logic
      if (screeningAssigned > 0 && !isScreeningComplete) {
        // Still working on screening
        currentRound = 'screening';
        if (screeningCompleted > 0 || screeningInProgress > 0) {
          status = 'under_review';
        } else {
          status = 'pending';
        }
      } else if (isScreeningComplete && pitchingAssigned > 0) {
        // Screening complete, working on pitching
        currentRound = 'pitching';
        if (isPitchingComplete) {
          status = 'completed';
        } else if (pitchingCompleted > 0 || pitchingInProgress > 0) {
          status = 'under_review';
        } else {
          status = 'pending';
        }
      } else if (isScreeningComplete && pitchingAssigned === 0) {
        // Screening complete, no pitching assignments
        status = 'completed';
        currentRound = 'screening';
      }

      results[juror.id] = { status, currentRound, completedRounds };
    }

    return results;
  } catch (error) {
    console.error('Error calculating multiple progressive jury statuses:', error);
    return {};
  }
}

// Calculate unified status for multiple jurors efficiently (legacy function)
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
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Round {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useRounds = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRounds = async () => {
    try {
      const { data, error } = await supabase
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const roundsData = (data || []).map(round => ({
        ...round,
        status: round.status as 'pending' | 'active' | 'completed'
      }));

      setRounds(roundsData);
      const active = roundsData.find(round => round.status === 'active') || null;
      setActiveRound(active);
    } catch (error) {
      console.error('Error fetching rounds:', error);
      toast.error('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const completeRound = async (roundName: string): Promise<boolean> => {
    try {
      // Validate round completion requirements
      const validation = await validateRoundCompletion(roundName);
      if (!validation.canComplete) {
        toast.error(`Cannot complete round: ${validation.reason}`);
        return false;
      }

      // Complete current round
      const { error: completeError } = await supabase
        .from('rounds')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('name', roundName);

      if (completeError) throw completeError;

      // Note: Removed automatic activation of next round to allow multiple active rounds

      await fetchRounds();
      toast.success(`${roundName} round completed successfully`);
      return true;
    } catch (error) {
      console.error('Error completing round:', error);
      toast.error('Failed to complete round');
      return false;
    }
  };

  const validateRoundCompletion = async (roundName: string) => {
    try {
      if (roundName === 'screening') {
        // Check if startup selection is made using startup_round_statuses
        const screeningRound = rounds.find(r => r.name === 'screening');
        if (!screeningRound) {
          return { canComplete: false, reason: 'Screening round not found' };
        }

        const { count } = await supabase
          .from('startup_round_statuses')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', screeningRound.id)
          .eq('status', 'selected');

        if (!count || count === 0) {
          return { canComplete: false, reason: 'No startups selected for pitching round' };
        }

        // Check if all screening evaluations are submitted
        const { data: assignments } = await supabase
          .from('screening_assignments')
          .select('startup_id, juror_id');

        const { data: evaluations } = await supabase
          .from('screening_evaluations')
          .select('startup_id, evaluator_id')
          .eq('status', 'submitted');

        const assignmentCount = assignments?.length || 0;
        const evaluationCount = evaluations?.length || 0;

        // Removed 80% completion constraint - allow completion regardless of evaluation count

        return { canComplete: true, reason: '' };
      }

      if (roundName === 'pitching') {
        // Check pitching round requirements using startup_round_statuses  
        const pitchingRound = rounds.find(r => r.name === 'pitching');
        if (!pitchingRound) {
          return { canComplete: false, reason: 'Pitching round not found' };
        }

        // Allow completion without strict requirements for now
        return { canComplete: true, reason: '' };
      }

      return { canComplete: false, reason: 'Unknown round' };
    } catch (error) {
      console.error('Error validating round completion:', error);
      return { canComplete: false, reason: 'Error validating requirements' };
    }
  };

  const getNextRound = (currentRound: string): string | null => {
    const roundOrder = ['screening', 'pitching'];
    const currentIndex = roundOrder.indexOf(currentRound);
    return currentIndex >= 0 && currentIndex < roundOrder.length - 1 
      ? roundOrder[currentIndex + 1] 
      : null;
  };

  const canModifyRound = (roundName: string): boolean => {
    const round = rounds.find(r => r.name === roundName);
    return round?.status !== 'completed';
  };

  const getRoundProgress = async (roundName: string) => {
    try {
      if (roundName === 'screening') {
        const [assignments, evaluations, startups] = await Promise.all([
          supabase.from('screening_assignments').select('*', { count: 'exact', head: true }),
          supabase.from('screening_evaluations').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('startups').select('*', { count: 'exact', head: true }).eq('status', 'selected')
        ]);

        return {
          assignmentsTotal: assignments.count || 0,
          evaluationsCompleted: evaluations.count || 0,
          startupsSelected: startups.count || 0,
          completionRate: assignments.count ? ((evaluations.count || 0) / assignments.count) * 100 : 0
        };
      }

      if (roundName === 'pitching') {
        const [assignments, evaluations, pitches] = await Promise.all([
          supabase.from('pitching_assignments').select('*', { count: 'exact', head: true }),
          supabase.from('pitching_evaluations').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('pitch_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed')
        ]);

        return {
          assignmentsTotal: assignments.count || 0,
          evaluationsCompleted: evaluations.count || 0,
          pitchesCompleted: pitches.count || 0,
          completionRate: assignments.count ? ((evaluations.count || 0) / assignments.count) * 100 : 0
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting round progress:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const reopenRound = async (roundName: string): Promise<boolean> => {
    try {
      // Validate reopen requirements
      const validation = await validateRoundReopen(roundName);
      if (!validation.canReopen) {
        toast.error(`Cannot reopen round: ${validation.reason}`);
        return false;
      }

      // Reopen current round (set back to active)
      const { error: reopenError } = await supabase
        .from('rounds')
        .update({ 
          status: 'active',
          completed_at: null
        })
        .eq('name', roundName);

      if (reopenError) throw reopenError;

      // Revert startup statuses if reopening screening round
      if (roundName === 'screening') {
        const { error: revertError } = await supabase
          .from('startups')
          .update({ status: 'pending' })
          .in('status', ['selected', 'rejected']);

        if (revertError) {
          console.error('Error reverting startup statuses:', revertError);
          toast.error('Failed to revert startup statuses');
          return false;
        }

        console.log('Startup statuses reverted to pending for screening round reopen');
      }

      // Deactivate next round if it exists
      const nextRound = getNextRound(roundName);
      if (nextRound) {
        const { error: deactivateError } = await supabase
          .from('rounds')
          .update({ 
            status: 'pending',
            started_at: null
          })
          .eq('name', nextRound);

        if (deactivateError) throw deactivateError;
      }

      await fetchRounds();
      toast.success(`${roundName} round reopened successfully`);
      return true;
    } catch (error) {
      console.error('Error reopening round:', error);
      toast.error('Failed to reopen round');
      return false;
    }
  };

  const validateRoundReopen = async (roundName: string) => {
    try {
      // Check if this is the most recently completed round
      const { data: rounds } = await supabase
        .from('rounds')
        .select('name, status, completed_at')
        .order('completed_at', { ascending: false });

      const completedRounds = rounds?.filter(r => r.status === 'completed') || [];
      const mostRecentCompleted = completedRounds[0];

      if (!mostRecentCompleted || mostRecentCompleted.name !== roundName) {
        return { canReopen: false, reason: 'Only the most recently completed round can be reopened' };
      }

      // Check for progress in next round that might be affected
      const nextRound = getNextRound(roundName);
      let affectedData = { assignments: 0, evaluations: 0, pitches: 0 };
      
      if (nextRound && roundName === 'screening') {
        const [assignments, evaluations, pitches] = await Promise.all([
          supabase.from('pitching_assignments').select('*', { count: 'exact', head: true }),
          supabase.from('pitching_evaluations').select('*', { count: 'exact', head: true }),
          supabase.from('pitch_requests').select('*', { count: 'exact', head: true })
        ]);

        affectedData = {
          assignments: assignments.count || 0,
          evaluations: evaluations.count || 0,
          pitches: pitches.count || 0
        };
      }

      return { canReopen: true, reason: '', affectedData };
    } catch (error) {
      console.error('Error validating round reopen:', error);
      return { canReopen: false, reason: 'Error validating reopen requirements' };
    }
  };

  return {
    rounds,
    activeRound,
    loading,
    fetchRounds,
    completeRound,
    reopenRound,
    validateRoundReopen,
    canModifyRound,
    getRoundProgress,
    validateRoundCompletion
  };
};
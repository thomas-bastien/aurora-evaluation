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

      // Activate next round if it exists
      const nextRound = getNextRound(roundName);
      if (nextRound) {
        const { error: activateError } = await supabase
          .from('rounds')
          .update({ 
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('name', nextRound);

        if (activateError) throw activateError;
      }

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
        // Check if top 30 selection is made
        const { count } = await supabase
          .from('startups')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shortlisted');

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

        if (evaluationCount < assignmentCount * 0.8) { // Allow 80% completion rate
          return { canComplete: false, reason: 'Not enough evaluations completed (need 80% completion)' };
        }

        return { canComplete: true, reason: '' };
      }

      if (roundName === 'pitching') {
        // Check pitching round requirements
        const { count } = await supabase
          .from('startups')
          .select('*', { count: 'exact', head: true })
          .in('status', ['finalist', 'winner']);

        return { canComplete: true, reason: '' }; // Allow completion without strict requirements for now
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
    return round?.status === 'active';
  };

  const getRoundProgress = async (roundName: string) => {
    try {
      if (roundName === 'screening') {
        const [assignments, evaluations, startups] = await Promise.all([
          supabase.from('screening_assignments').select('*', { count: 'exact', head: true }),
          supabase.from('screening_evaluations').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('startups').select('*', { count: 'exact', head: true }).eq('status', 'shortlisted')
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

  return {
    rounds,
    activeRound,
    loading,
    fetchRounds,
    completeRound,
    canModifyRound,
    getRoundProgress,
    validateRoundCompletion
  };
};
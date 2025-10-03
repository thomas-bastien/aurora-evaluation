import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRoundData = (roundName: string) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoundData = async () => {
    if (!roundName) return;
    
    setLoading(true);
    try {
      const [evaluationsResult, assignmentsResult] = await Promise.all([
        roundName === 'screening' 
          ? supabase
              .from('screening_evaluations')
              .select(`
                *,
                startups!startup_id(id, name, verticals, regions, stage, location, status),
                jurors!evaluator_id(id, name, email, company)
              `)
          : supabase
              .from('pitching_evaluations')
              .select(`
                *,
                startups!startup_id(id, name, verticals, regions, stage, location, status),
                jurors!evaluator_id(id, name, email, company)
              `),
        roundName === 'screening'
          ? supabase
              .from('screening_assignments')
              .select(`
                *,
                startups!startup_id(id, name, verticals, regions, stage, location, status),
                jurors!juror_id(id, name, email, company)
              `)
          : supabase
              .from('pitching_assignments')
              .select(`
                *,
                startups!startup_id(id, name, verticals, regions, stage, location, status),
                jurors!juror_id(id, name, email, company)
              `)
      ]);

      if (evaluationsResult.error) throw evaluationsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      setEvaluations(evaluationsResult.data || []);
      setAssignments(assignmentsResult.data || []);
    } catch (error) {
      console.error('Error fetching round data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartupsForRound = async () => {
    try {
      // Fetch startups that have participated in this round (have assignments or evaluations)
      // regardless of their current status to preserve historical data
      if (roundName === 'screening') {
        // Get startups with screening assignments or evaluations
        const [assignmentsResult, evaluationsResult] = await Promise.all([
          supabase
            .from('screening_assignments')
            .select('startup_id')
            .then(res => res.data?.map(a => a.startup_id) || []),
          supabase
            .from('screening_evaluations')
            .select('startup_id')
            .then(res => res.data?.map(e => e.startup_id) || [])
        ]);
        
        const participantIds = [...new Set([...assignmentsResult, ...evaluationsResult])];
        
        if (participantIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .in('id', participantIds);
          
        if (error) throw error;
        return data || [];
        
      } else if (roundName === 'pitching') {
        // Get startups with pitching assignments or evaluations
        const [assignmentsResult, evaluationsResult] = await Promise.all([
          supabase
            .from('pitching_assignments')
            .select('startup_id')
            .then(res => res.data?.map(a => a.startup_id) || []),
          supabase
            .from('pitching_evaluations')
            .select('startup_id')
            .then(res => res.data?.map(e => e.startup_id) || [])
        ]);
        
        const participantIds = [...new Set([...assignmentsResult, ...evaluationsResult])];
        
        if (participantIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from('startups')
          .select('*')
          .in('id', participantIds);
          
        if (error) throw error;
        return data || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching startups for round:', error);
      return [];
    }
  };

  const getEvaluationsWithScores = async () => {
    try {
      const { data, error } = roundName === 'screening'
        ? await supabase
            .from('screening_evaluations')
            .select(`
              *,
              startups!startup_id(id, name, verticals, regions, stage, location),
              jurors!evaluator_id(id, name, email)
            `)
            .eq('status', 'submitted')
        : await supabase
            .from('pitching_evaluations')
            .select(`
              *,
              startups!startup_id(id, name, verticals, regions, stage, location),
              jurors!evaluator_id(id, name, email)
            `)
            .eq('status', 'submitted');

      if (error) throw error;

      // Group by startup and calculate scores
      const startupScores = (data || []).reduce((acc: any, evaluation: any) => {
        const startupId = evaluation.startup_id;
        if (!acc[startupId]) {
          acc[startupId] = {
            startup: evaluation.startups,
            evaluations: [],
            totalScore: 0,
            averageScore: 0,
            evaluationCount: 0
          };
        }
        
        acc[startupId].evaluations.push(evaluation);
        acc[startupId].totalScore += evaluation.overall_score || 0;
        acc[startupId].evaluationCount += 1;
        acc[startupId].averageScore = acc[startupId].totalScore / acc[startupId].evaluationCount;
        
        return acc;
      }, {});

      return Object.values(startupScores).sort((a: any, b: any) => {
        // Sort by average score (higher scores first)
        if (a.averageScore === 0 && b.averageScore > 0) return 1;
        if (b.averageScore === 0 && a.averageScore > 0) return -1;
        return b.averageScore - a.averageScore;
      });
    } catch (error) {
      console.error('Error fetching evaluations with scores:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchRoundData();
  }, [roundName]);

  return {
    evaluations,
    assignments,
    loading,
    fetchRoundData,
    getStartupsForRound,
    getEvaluationsWithScores
  };
};
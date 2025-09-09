import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EvaluationStats {
  screeningStats: {
    averageScore: number | null;
    reviewCount: number;
  };
  pitchingStats: {
    averageScore: number | null;
    reviewCount: number;
  };
  overallStats: {
    averageScore: number | null;
    totalReviews: number;
  };
}

export const useStartupEvaluationStats = (startupId: string) => {
  const [stats, setStats] = useState<EvaluationStats>({
    screeningStats: { averageScore: null, reviewCount: 0 },
    pitchingStats: { averageScore: null, reviewCount: 0 },
    overallStats: { averageScore: null, totalReviews: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvaluationStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch screening evaluations (submitted only)
        const { data: screeningEvals, error: screeningError } = await supabase
          .from('screening_evaluations')
          .select('overall_score')
          .eq('startup_id', startupId)
          .eq('status', 'submitted')
          .not('overall_score', 'is', null);

        if (screeningError) {
          throw screeningError;
        }

        // Fetch pitching evaluations (submitted only)
        const { data: pitchingEvals, error: pitchingError } = await supabase
          .from('pitching_evaluations')
          .select('overall_score')
          .eq('startup_id', startupId)
          .eq('status', 'submitted')
          .not('overall_score', 'is', null);

        if (pitchingError) {
          throw pitchingError;
        }

        // Calculate screening stats
        const screeningScores = screeningEvals?.map(evaluation => Number(evaluation.overall_score)) || [];
        const screeningAvg = screeningScores.length > 0 
          ? screeningScores.reduce((sum, score) => sum + score, 0) / screeningScores.length 
          : null;

        // Calculate pitching stats
        const pitchingScores = pitchingEvals?.map(evaluation => Number(evaluation.overall_score)) || [];
        const pitchingAvg = pitchingScores.length > 0 
          ? pitchingScores.reduce((sum, score) => sum + score, 0) / pitchingScores.length 
          : null;

        // Calculate overall stats
        const allScores = [...screeningScores, ...pitchingScores];
        const overallAvg = allScores.length > 0 
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length 
          : null;

        setStats({
          screeningStats: {
            averageScore: screeningAvg,
            reviewCount: screeningScores.length
          },
          pitchingStats: {
            averageScore: pitchingAvg,
            reviewCount: pitchingScores.length
          },
          overallStats: {
            averageScore: overallAvg,
            totalReviews: allScores.length
          }
        });
      } catch (err) {
        console.error('Error fetching evaluation stats:', err);
        setError('Failed to load evaluation statistics');
      } finally {
        setLoading(false);
      }
    };

    if (startupId) {
      fetchEvaluationStats();
    }
  }, [startupId]);

  return { stats, loading, error };
};
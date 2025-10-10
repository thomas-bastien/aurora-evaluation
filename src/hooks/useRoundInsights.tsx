import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CohortPattern {
  category: string;
  finding: string;
  percentage: number;
  significance: 'high' | 'medium' | 'low';
}

interface OutlierAnalysis {
  startup_name: string;
  type: 'high_score' | 'low_score' | 'polarized';
  score: number;
  score_variance: number;
  explanation: string;
}

interface BiasAnalysis {
  juror_name: string;
  pattern: string;
  avg_score_given: number;
  cohort_avg: number;
  deviation: number;
  assessment: string;
}

interface RiskTheme {
  theme: string;
  frequency: number;
  examples: string[];
}

export interface RoundInsights {
  generated_at: string;
  round_name: string;
  executive_summary: string[];
  cohort_patterns: CohortPattern[];
  outliers: OutlierAnalysis[];
  bias_check: BiasAnalysis[];
  risk_themes: RiskTheme[];
}

interface UseRoundInsightsReturn {
  insights: RoundInsights | null;
  loading: boolean;
  error: Error | null;
  lastGenerated: string | null;
  refresh: () => Promise<void>;
  canRefresh: boolean;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

export function useRoundInsights(roundName: string): UseRoundInsightsReturn {
  const [insights, setInsights] = useState<RoundInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const canRefresh = Date.now() - lastRefreshTime > REFRESH_COOLDOWN;

  const fetchInsights = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!force) {
        // Check database cache first
        const { data: cached, error: cacheError } = await supabase
          .from('round_insights_cache')
          .select('insights, computed_at')
          .eq('round_name', roundName)
          .maybeSingle();
        
        if (!cacheError && cached) {
          setInsights(cached.insights as unknown as RoundInsights);
          setLastGenerated(cached.computed_at);
          setLoading(false);
          return;
        }
      }

      // Fetch fresh insights from edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-round-insights',
        {
          body: { roundName }
        }
      );

      if (functionError) throw functionError;

      // Store in database cache
      await supabase
        .from('round_insights_cache')
        .upsert({
          round_name: roundName,
          insights: data,
          evaluation_count: data.total_evaluations || 0
        });

      setInsights(data);
      setLastGenerated(data.generated_at);
      setLastRefreshTime(Date.now());

    } catch (err) {
      console.error('Error fetching round insights:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch insights'));
    } finally {
      setLoading(false);
    }
  }, [roundName]);

  const refresh = useCallback(async () => {
    if (!canRefresh) {
      setError(new Error('Please wait before refreshing again'));
      return;
    }
    await fetchInsights(true);
  }, [canRefresh, fetchInsights]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    loading,
    error,
    lastGenerated,
    refresh,
    canRefresh
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for statistical analysis (zero-failure)
function calculateStatistics(evaluations: any[]) {
  if (!evaluations.length) return { avgScore: 0, minScore: 0, maxScore: 0 };
  
  const scores = evaluations.map(e => e.overall_score).filter(s => s !== null && s !== undefined);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length || 0;
  const minScore = Math.min(...scores) || 0;
  const maxScore = Math.max(...scores) || 0;
  
  return { avgScore, minScore, maxScore };
}

function identifyOutliers(evaluations: any[], startups: any[]) {
  const startupScores = startups.map(startup => {
    const evals = evaluations.filter(e => e.startup_id === startup.id);
    const avgScore = evals.length > 0 
      ? evals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evals.length 
      : 0;
    return { ...startup, avgScore, evalCount: evals.length };
  }).filter(s => s.evalCount > 0);

  const sorted = startupScores.sort((a, b) => b.avgScore - a.avgScore);
  
  return {
    top5: sorted.slice(0, 5).map(s => ({
      startup_name: s.name,
      average_score: s.avgScore.toFixed(2),
      type: 'top_performer',
      description: `Strong performance with ${s.avgScore.toFixed(1)}/10 average`
    })),
    bottom5: sorted.slice(-5).reverse().map(s => ({
      startup_name: s.name,
      average_score: s.avgScore.toFixed(2),
      type: 'needs_attention',
      description: `Below average at ${s.avgScore.toFixed(1)}/10`
    }))
  };
}

function detectBiasPatterns(evaluations: any[], jurors: any[]) {
  const jurorStats = jurors.map(juror => {
    const jurorEvals = evaluations.filter(e => e.evaluator_id === juror.user_id);
    if (jurorEvals.length === 0) return null;
    
    const avgScore = jurorEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / jurorEvals.length;
    return { jurorName: juror.name || 'Unknown', avgScore, evalCount: jurorEvals.length };
  }).filter(j => j !== null);

  const cohortAvg = evaluations.reduce((sum, e) => sum + (e.overall_score || 0), 0) / evaluations.length || 0;

  const biases = jurorStats
    .filter(j => Math.abs(j.avgScore - cohortAvg) > 1.5)
    .map(j => ({
      juror_name: j.jurorName,
      pattern: j.avgScore > cohortAvg ? 'consistently_high' : 'consistently_low',
      description: `Scores ${j.avgScore > cohortAvg ? 'above' : 'below'} cohort average`,
      significance: Math.abs(j.avgScore - cohortAvg) > 2 ? 'high' : 'medium'
    }));

  return biases.length > 0 ? biases : [{
    juror_name: 'Cohort-wide',
    pattern: 'balanced',
    description: 'No significant scoring biases detected',
    significance: 'low'
  }];
}

function extractRiskThemes(evaluations: any[]) {
  const themes: Record<string, number> = {};
  
  evaluations.forEach(e => {
    const improvements = (e.improvement_areas || '').toString();
    const keywords = ['team', 'market', 'product', 'traction', 'revenue', 'funding', 'competition', 'scalability'];
    
    keywords.forEach(keyword => {
      if (improvements.toLowerCase().includes(keyword)) {
        themes[keyword] = (themes[keyword] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return sorted.map(([theme, count]) => ({
    theme: theme.charAt(0).toUpperCase() + theme.slice(1),
    frequency: count,
    severity: count > evaluations.length * 0.3 ? 'high' : count > evaluations.length * 0.15 ? 'medium' : 'low',
    description: `Mentioned in ${count} evaluations (${((count / evaluations.length) * 100).toFixed(0)}%)`
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roundName } = await req.json();

    if (!roundName) {
      return new Response(
        JSON.stringify({ error: 'Round name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch data
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
    
    const [evalsResult, startupsResult, jurorsResult] = await Promise.all([
      supabase.from(evaluationTable).select('*').eq('status', 'submitted'),
      supabase.from('startups').select('*'),
      supabase.from('jurors').select('*')
    ]);

    const evaluations = evalsResult.data || [];
    const startups = startupsResult.data || [];
    const jurors = jurorsResult.data || [];

    console.log(`Generating insights for ${roundName}: ${evaluations.length} evaluations, ${startups.length} startups`);

    // Generate statistical insights (always succeeds, zero-failure)
    const stats = calculateStatistics(evaluations);
    const outliers = identifyOutliers(evaluations, startups);
    const biases = detectBiasPatterns(evaluations, jurors);
    const risks = extractRiskThemes(evaluations);

    // Count score distribution
    const scoreDistribution = {
      high: evaluations.filter(e => e.overall_score >= 8).length,
      medium: evaluations.filter(e => e.overall_score >= 5 && e.overall_score < 8).length,
      low: evaluations.filter(e => e.overall_score < 5).length
    };

    // Top sectors
    const sectorCounts: Record<string, number> = {};
    startups.forEach(s => {
      (s.verticals || []).forEach((v: string) => {
        sectorCounts[v] = (sectorCounts[v] || 0) + 1;
      });
    });
    const topSector = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    const statisticalInsights = {
      executive_summary: [
        `Analyzed ${evaluations.length} evaluations across ${startups.length} startups`,
        `Average score: ${stats.avgScore.toFixed(2)} (range: ${stats.minScore.toFixed(1)} - ${stats.maxScore.toFixed(1)})`,
        `Distribution: ${scoreDistribution.high} high (≥8), ${scoreDistribution.medium} medium (5-7.9), ${scoreDistribution.low} low (<5)`,
        `Top sector: ${topSector}`
      ],
      cohort_patterns: [
        {
          category: 'Score Distribution',
          finding: `${scoreDistribution.high} high performers, ${scoreDistribution.medium} moderate, ${scoreDistribution.low} low`,
          percentage: scoreDistribution.high,
          significance: scoreDistribution.high > scoreDistribution.medium ? 'high' : 'medium'
        },
        {
          category: 'Sector Focus',
          finding: `Most startups in ${topSector}`,
          percentage: 0,
          significance: 'medium'
        }
      ],
      outliers: [...outliers.top5, ...outliers.bottom5],
      bias_check: biases,
      risk_themes: risks.length > 0 ? risks : [
        { theme: 'General', frequency: 0, examples: [], description: 'No common themes detected' }
      ],
      generated_at: new Date().toISOString(),
      round_name: roundName,
      ai_enhanced: false
    };

    // Try to add AI narrative (optional enhancement, won't fail if it doesn't work)
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (GOOGLE_GEMINI_API_KEY && evaluations.length > 0) {
      try {
        const { callGemini } = await import('../_shared/gemini-client.ts');

        const summary = {
          total_startups: startups.length,
          total_evaluations: evaluations.length,
          avg_score: stats.avgScore.toFixed(2),
          top_5_startups: outliers.top5.map(s => s.startup_name).join(', '),
          bottom_5_startups: outliers.bottom5.map(s => s.startup_name).join(', '),
          high_performers: scoreDistribution.high,
          medium_performers: scoreDistribution.medium,
          low_performers: scoreDistribution.low,
          top_sector: topSector
        };

        const systemPrompt = `You are analyzing startup evaluation data. Provide concise insights in plain text.`;

        const userPrompt = `Round: ${roundName}
Evaluated: ${summary.total_startups} startups, ${summary.total_evaluations} evaluations
Average score: ${summary.avg_score}

Top performers: ${summary.top_5_startups}
Bottom performers: ${summary.bottom_5_startups}
Score distribution: ${summary.high_performers} high (≥8), ${summary.medium_performers} medium (5-7.9), ${summary.low_performers} low (<5)

Provide 3-5 bullet points of key insights about cohort quality and trends.`;

        const geminiResponse = await callGemini({
          model: 'gemini-2.5-flash',
          systemPrompt,
          userPrompt,
          temperature: 0.7,
          maxTokens: 1500
        });

        if (geminiResponse.success && geminiResponse.content) {
          const aiInsights = geminiResponse.content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .slice(0, 5);
          
          statisticalInsights.executive_summary = [
            ...aiInsights,
            ...statisticalInsights.executive_summary
          ];
          statisticalInsights.ai_enhanced = true;
          console.log('✨ AI-enhanced insights generated successfully');
        }
      } catch (aiError) {
        console.warn('AI enhancement failed, using statistical insights only:', aiError);
      }
    }

    // ALWAYS return 200 with valid data
    return new Response(
      JSON.stringify(statisticalInsights),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    
    // Even on error, return a valid structure
    return new Response(
      JSON.stringify({
        executive_summary: ['Error generating insights. Please try again.'],
        cohort_patterns: [],
        outliers: [],
        bias_check: [],
        risk_themes: [],
        generated_at: new Date().toISOString(),
        round_name: 'unknown',
        ai_enhanced: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

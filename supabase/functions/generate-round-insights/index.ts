import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface AIInsightsResponse {
  executive_summary: string[];
  cohort_patterns: CohortPattern[];
  outliers: OutlierAnalysis[];
  bias_check: BiasAnalysis[];
  risk_themes: RiskTheme[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roundName } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch evaluation data
    const tableName = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
    const { data: evaluations, error: evalError } = await supabase
      .from(tableName)
      .select(`
        overall_score,
        criteria_scores,
        strengths,
        improvement_areas,
        overall_notes,
        recommendation,
        startup_id,
        evaluator_id
      `)
      .eq('status', 'submitted');

    if (evalError) throw evalError;

    // Fetch startup data
    const startupIds = [...new Set(evaluations.map((e: any) => e.startup_id))];
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select('id, name, verticals, regions, stage')
      .in('id', startupIds);

    if (startupsError) throw startupsError;

    // Fetch juror data
    const evaluatorIds = [...new Set(evaluations.map((e: any) => e.evaluator_id))];
    const { data: jurors, error: jurorsError } = await supabase
      .from('jurors')
      .select('user_id, name')
      .in('user_id', evaluatorIds);

    if (jurorsError) throw jurorsError;

    // Create lookup maps
    const startupMap = new Map(startups.map((s: any) => [s.id, s]));
    const jurorMap = new Map(jurors.map((j: any) => [j.user_id, j]));

    // Aggregate data for AI analysis
    const aggregatedData = {
      total_evaluations: evaluations.length,
      total_startups: startupIds.length,
      total_jurors: evaluatorIds.length,
      
      // Score distribution
      score_distribution: {
        mean: evaluations.reduce((sum: number, e: any) => sum + (e.overall_score || 0), 0) / evaluations.length,
        min: Math.min(...evaluations.map((e: any) => e.overall_score || 0)),
        max: Math.max(...evaluations.map((e: any) => e.overall_score || 0)),
      },
      
      // Startup-level aggregates
      startup_data: startupIds.map(startupId => {
        const startup = startupMap.get(startupId);
        const startupEvals = evaluations.filter((e: any) => e.startup_id === startupId);
        const scores = startupEvals.map((e: any) => e.overall_score).filter((s: any) => s !== null);
        
        const mean = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        const variance = scores.length > 0 
          ? scores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / scores.length 
          : 0;

        return {
          name: startup?.name,
          avg_score: mean,
          score_variance: variance,
          eval_count: startupEvals.length,
          verticals: startup?.verticals || [],
          regions: startup?.regions || [],
        };
      }),
      
      // Juror-level aggregates
      juror_data: evaluatorIds.map(evaluatorId => {
        const juror = jurorMap.get(evaluatorId);
        const jurorEvals = evaluations.filter((e: any) => e.evaluator_id === evaluatorId);
        const scores = jurorEvals.map((e: any) => e.overall_score).filter((s: any) => s !== null);
        const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

        return {
          name: juror?.name || 'Unknown',
          eval_count: jurorEvals.length,
          avg_score_given: avgScore,
        };
      }),
      
      // Common feedback themes
      common_strengths: evaluations.flatMap((e: any) => e.strengths || []),
      common_improvements: evaluations.flatMap((e: any) => e.improvement_areas || []),
      recommendations: evaluations.map((e: any) => e.recommendation).filter(Boolean),
    };

    // Construct AI prompt
    const systemPrompt = `You are an expert startup evaluation analyst for Aurora Tech Awards. Analyze evaluation data to provide strategic insights for venture capital decision-making.

Focus on:
1. Cohort-wide patterns (strengths/weaknesses)
2. Statistical outliers and anomalies
3. Potential evaluator biases
4. Common risk themes across startups

Be specific, data-driven, and actionable. Provide percentages and counts to support your findings.`;

    const userPrompt = `Analyze the following evaluation data for ${roundName} round:

Total Evaluations: ${aggregatedData.total_evaluations}
Total Startups: ${aggregatedData.total_startups}
Total Jurors: ${aggregatedData.total_jurors}

Score Distribution:
- Mean: ${aggregatedData.score_distribution.mean.toFixed(2)}
- Min: ${aggregatedData.score_distribution.min}
- Max: ${aggregatedData.score_distribution.max}

Per-Startup Data (sample):
${JSON.stringify(aggregatedData.startup_data.slice(0, 10), null, 2)}

Per-Juror Data:
${JSON.stringify(aggregatedData.juror_data, null, 2)}

Common Feedback Themes:
- Strengths mentioned: ${aggregatedData.common_strengths.slice(0, 20).join(', ')}
- Improvements needed: ${aggregatedData.common_improvements.slice(0, 20).join(', ')}

Generate comprehensive insights covering executive summary, cohort patterns, outliers, bias checks, and risk themes.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_insights',
            description: 'Generate structured insights from evaluation data',
            parameters: {
              type: 'object',
              properties: {
                executive_summary: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3 key insights as bullet points'
                },
                cohort_patterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      finding: { type: 'string' },
                      percentage: { type: 'number' },
                      significance: { type: 'string', enum: ['high', 'medium', 'low'] }
                    }
                  }
                },
                outliers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      startup_name: { type: 'string' },
                      type: { type: 'string', enum: ['high_score', 'low_score', 'polarized'] },
                      score: { type: 'number' },
                      score_variance: { type: 'number' },
                      explanation: { type: 'string' }
                    }
                  }
                },
                bias_check: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      juror_name: { type: 'string' },
                      pattern: { type: 'string' },
                      avg_score_given: { type: 'number' },
                      cohort_avg: { type: 'number' },
                      deviation: { type: 'number' },
                      assessment: { type: 'string' }
                    }
                  }
                },
                risk_themes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      frequency: { type: 'number' },
                      examples: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              },
              required: ['executive_summary', 'cohort_patterns', 'outliers', 'bias_check', 'risk_themes']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_insights' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const insights: AIInsightsResponse = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        round_name: roundName,
        ...insights
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        generated_at: new Date().toISOString(),
        executive_summary: ['Unable to generate AI insights at this time. Please try again later.'],
        cohort_patterns: [],
        outliers: [],
        bias_check: [],
        risk_themes: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

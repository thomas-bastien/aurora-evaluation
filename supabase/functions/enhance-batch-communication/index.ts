import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { communicationType, roundName, currentTemplate, startupIds } = await req.json();

    if (!communicationType || !roundName || !startupIds || !Array.isArray(startupIds)) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine evaluation table based on round
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

    // Fetch all evaluations for these startups
    const { data: evaluations, error: evalError } = await supabase
      .from(evaluationTable)
      .select(`
        *,
        startups!inner(name, verticals)
      `)
      .in('startup_id', startupIds);

    if (evalError) {
      console.error('Error fetching evaluations:', evalError);
      throw evalError;
    }

    if (!evaluations || evaluations.length === 0) {
      throw new Error('No evaluations found for the given startups');
    }

    // Aggregate feedback patterns
    const allStrengths: string[] = [];
    const allImprovements: string[] = [];
    const scores: number[] = [];
    const verticals = new Set<string>();

    evaluations.forEach((eval: any) => {
      if (eval.strengths && Array.isArray(eval.strengths)) {
        allStrengths.push(...eval.strengths);
      }
      if (eval.improvement_areas) {
        allImprovements.push(eval.improvement_areas);
      }
      if (eval.overall_score) {
        scores.push(eval.overall_score);
      }
      if (eval.startups?.verticals && Array.isArray(eval.startups.verticals)) {
        eval.startups.verticals.forEach((v: string) => verticals.add(v));
      }
    });

    // Calculate statistics
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Find most common themes
    const strengthCounts: Record<string, number> = {};
    allStrengths.forEach(s => {
      const normalized = s.toLowerCase().trim();
      strengthCounts[normalized] = (strengthCounts[normalized] || 0) + 1;
    });

    const topStrengths = Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength]) => strength);

    // Build AI prompt
    const systemPrompt = `You are an expert at crafting professional, empathetic, and actionable feedback emails for startup evaluation programs. Your goal is to enhance batch email templates by incorporating aggregated insights from multiple juror evaluations.`;

    const userPrompt = `I need to enhance a ${communicationType} email template for ${startupIds.length} startups in the ${roundName} round.

AGGREGATED INSIGHTS:
- Number of startups: ${startupIds.length}
- Average score: ${avgScore.toFixed(2)} (range: ${minScore.toFixed(1)} - ${maxScore.toFixed(1)})
- Most common strengths: ${topStrengths.join(', ')}
- Industry verticals: ${Array.from(verticals).join(', ')}
- Total evaluations: ${evaluations.length}

CURRENT TEMPLATE:
${currentTemplate || 'No template provided'}

Please enhance this email template to:
1. Sound professional yet warm and encouraging
2. Reference the aggregated insights where appropriate
3. ${communicationType === 'selected' ? 'Celebrate their achievement and set clear next steps' : 'Provide constructive feedback while remaining supportive'}
4. Include personalization placeholders like [STARTUP_NAME], [FEEDBACK_SUMMARY], [SCORE]
5. Keep the tone consistent with Aurora Tech Awards brand
6. Make it actionable and clear

Return a JSON object with:
{
  "subject": "Enhanced email subject line",
  "body": "Enhanced email body with proper formatting",
  "aggregatedInsights": "Brief summary of key patterns found across evaluations"
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      
      throw new Error(`AI enhancement failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const enhancedContent = JSON.parse(aiData.choices[0].message.content);

    return new Response(
      JSON.stringify({
        success: true,
        enhancedTemplate: {
          subject: enhancedContent.subject,
          body: enhancedContent.body,
          aggregatedInsights: enhancedContent.aggregatedInsights
        },
        metadata: {
          startupCount: startupIds.length,
          averageScore: avgScore,
          evaluationCount: evaluations.length,
          model: 'google/gemini-2.5-flash'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in enhance-batch-communication:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to enhance template'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

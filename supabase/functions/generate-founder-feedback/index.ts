import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { callGemini } from '../_shared/gemini-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupId, roundName } = await req.json();

    if (!startupId || !roundName) {
      throw new Error('Missing required parameters: startupId and roundName');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch startup data
    const { data: startup, error: startupError } = await supabase
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single();

    if (startupError) throw startupError;

    // Fetch evaluations based on round
    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';
    
    const { data: evaluations, error: evalError } = await supabase
      .from(evaluationTable)
      .select(`
        *,
        jurors:evaluator_id(
          name,
          company,
          fund_focus,
          target_verticals
        )
      `)
      .eq('startup_id', startupId)
      .eq('status', 'submitted');

    if (evalError) throw evalError;

    if (!evaluations || evaluations.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No submitted evaluations found for this startup',
          hasEvaluations: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first
    const { data: cached } = await supabase
      .from('founder_feedback_cache')
      .select('*')
      .eq('startup_id', startupId)
      .eq('round_name', roundName)
      .maybeSingle();

    // If cache exists and evaluation count matches, return cached
    if (cached && cached.evaluation_count === evaluations.length) {
      console.log(`Using cached feedback for startup ${startupId}`);
      return new Response(
        JSON.stringify({
          success: true,
          feedback: cached.feedback_data,
          metadata: {
            ...cached.metadata,
            cached: true,
            cachedAt: cached.computed_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract evaluation data
    const scores = evaluations.map(e => e.overall_score).filter(Boolean);
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;

    const allStrengths = evaluations.flatMap(e => e.strengths || []).filter(Boolean);
    const allImprovements = evaluations.map(e => e.improvement_areas).filter(Boolean);
    const allNotes = evaluations.map(e => e.overall_notes).filter(Boolean);
    const allRecommendations = evaluations.map(e => e.recommendation).filter(Boolean);

    // Build AI prompt
    const systemPrompt = `You are a professional feedback writer for Aurora Tech Awards. Your goal is to transform juror evaluations into clear, constructive, and encouraging feedback for startup founders.

Tone Guidelines:
- Professional but warm and encouraging
- Specific and actionable (avoid generic statements like "great team" without context)
- Balanced (acknowledge both strengths and growth areas)
- Future-focused (emphasize learning and improvement)
- Respectful of the founder's effort and vision

Key Requirements:
- Extract SPECIFIC details from the evaluations (not generic praise)
- When mentioning strengths, include WHY they impressed jurors
- When mentioning challenges, frame them constructively
- Provide ACTIONABLE next steps (not vague advice)
- Keep language professional yet approachable

Avoid:
- Overly harsh criticism
- Vague or generic statements
- Technical jargon without explanation
- Comparing startups to each other
- Phrases like "good job" or "nice work" without specifics`;

    const userPrompt = `Generate founder-facing feedback for ${startup.name}.

Evaluation Data:
- Number of evaluations: ${evaluations.length}
- Average score: ${averageScore.toFixed(1)}/10
- Score range: ${Math.min(...scores).toFixed(1)} to ${Math.max(...scores).toFixed(1)}

Strengths mentioned by jurors:
${allStrengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Areas for improvement mentioned:
${allImprovements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

Additional notes from jurors:
${allNotes.map((note, i) => `${i + 1}. ${note}`).join('\n')}

Recommendations:
${allRecommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

Generate structured feedback using the generate_founder_feedback function.`;

    // Call Gemini AI with structured output
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const geminiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      tools: [
        {
          type: 'function',
          function: {
            name: 'generate_founder_feedback',
            description: 'Generate structured feedback for startup founders',
            parameters: {
              type: 'object',
              properties: {
                strengths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 specific strengths that impressed the evaluation panel, with context about WHY they stood out'
                },
                challenges: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2-3 constructive areas for improvement or risks to address, framed positively'
                },
                next_steps: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-4 specific, actionable recommendations that founders can implement'
                },
                overall_summary: {
                  type: 'string',
                  description: '2-3 sentence summary that captures the essence of the evaluation and sets a constructive tone'
                }
              },
              required: ['strengths', 'challenges', 'next_steps', 'overall_summary'],
              additionalProperties: false
            }
          }
        }
      ],
      toolChoice: { function: { name: 'generate_founder_feedback' } }
    });

    if (!geminiResponse.success) {
      if (geminiResponse.error?.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Gemini API rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(geminiResponse.error || 'Gemini API error');
    }

    console.log('Gemini response:', JSON.stringify(geminiResponse, null, 2));

    // Extract the function call result
    if (!geminiResponse.functionCall || geminiResponse.functionCall.name !== 'generate_founder_feedback') {
      throw new Error('Gemini did not return expected structured output');
    }

    const feedbackData = geminiResponse.functionCall.args;

    // Store in cache
    const metadata = {
      startupName: startup.name,
      evaluationCount: evaluations.length,
      averageScore: averageScore.toFixed(1),
      generatedAt: new Date().toISOString(),
      model: geminiResponse.model
    };

    await supabase
      .from('founder_feedback_cache')
      .upsert([{
        startup_id: startupId,
        round_name: roundName,
        feedback_data: feedbackData,
        metadata: metadata,
        evaluation_count: evaluations.length
      }]);

    return new Response(
      JSON.stringify({
        success: true,
        feedback: feedbackData,
        metadata
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-founder-feedback:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate feedback',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancementRequest {
  feedbackSummary: string;
  startupName: string;
  roundName: string;
  communicationType: 'selected' | 'rejected' | 'vc-feedback-details';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbackSummary, startupName, roundName, communicationType }: EnhancementRequest = await req.json();

    if (!feedbackSummary || !startupName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip enhancement for placeholder text
    if (feedbackSummary.includes('[AI Feedback not yet generated')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot enhance placeholder feedback. Generate feedback first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate feedback length
    if (feedbackSummary.length > 10000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Feedback too long for enhancement (max 10,000 characters). Please shorten it first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional feedback editor specializing in startup evaluations. Your role is to enhance existing feedback to be more specific, actionable, and professionally worded while preserving all key insights.

Guidelines:
1. Keep enhanced feedback similar in length to original (1.2-1.5x max)
2. Focus on clarity and actionability, not adding extra content
3. Make strengths more specific with concrete examples
4. Make challenges constructive with clear next steps
5. Remove vague language and replace with specific descriptions
6. Maintain a professional yet encouraging tone
7. Preserve the original structure and all key points

DO NOT add information that wasn't in the original feedback. Only clarify and enhance what's already there.`;

    const userPrompt = `Enhance this ${communicationType} feedback for ${startupName} (${roundName} round):

${feedbackSummary}

Focus on making it more specific, actionable, and professional while maintaining all the original insights and tone.`;

    console.log(`Enhancing feedback for ${startupName} (length: ${feedbackSummary.length} chars)`);

    const { callGemini } = await import('../_shared/gemini-client.ts');

    // Single API call with reasonable token limit
    let aiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 4000,
    });

    // Simple retry logic for network/temporary issues
    if (!aiResponse.success && !aiResponse.error?.toLowerCase().includes('rate limit')) {
      console.log('First attempt failed, retrying once...');
      aiResponse = await callGemini({
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.8,
        maxTokens: 4000,
      });
    }

    // Handle rate limits
    if (aiResponse.error?.toLowerCase().includes('rate limit')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle failure after retry
    if (!aiResponse.success || !aiResponse.content) {
      console.error('Enhancement failed:', aiResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: aiResponse.error || 'Enhancement failed. Please try again.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✨ Enhanced feedback for ${startupName} successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        enhancedFeedback: aiResponse.content,
        metadata: {
          startupName,
          roundName,
          originalLength: feedbackSummary.length,
          enhancedLength: aiResponse.content.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error enhancing feedback:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

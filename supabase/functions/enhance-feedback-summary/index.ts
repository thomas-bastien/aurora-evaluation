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
1. Make strengths more specific by adding context and concrete examples
2. Make challenges constructive and actionable with clear next steps
3. Remove vague language (e.g., 'great', 'good', 'nice') and replace with specific descriptions
4. Maintain a professional yet encouraging tone
5. Ensure all recommendations are concrete and actionable
6. Preserve the original structure and all key points
7. Keep the overall length similar to the original

DO NOT add information that wasn't in the original feedback. Only clarify and enhance what's already there.`;

    const userPrompt = `Enhance this ${communicationType} feedback for ${startupName} (${roundName} round):

${feedbackSummary}

Focus on making it more specific, actionable, and professional while maintaining all the original insights and tone.`;

    console.log(`Enhancing feedback for ${startupName}`);

    const { callGemini } = await import('../_shared/gemini-client.ts');
    
    const aiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      temperature: 0.7,
      maxTokens: 3000
    });

    if (!aiResponse.success || !aiResponse.content) {
      console.error('Gemini API error:', aiResponse.error);
      
      if (aiResponse.error?.includes('rate limit')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please wait a moment and try again.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(aiResponse.error || 'Failed to enhance feedback');
    }

    const enhancedFeedback = aiResponse.content;

    if (!enhancedFeedback) {
      throw new Error('No enhanced feedback received from AI');
    }

    // Analyze improvements made
    const improvements: string[] = [];
    
    if (enhancedFeedback.length > feedbackSummary.length * 1.1) {
      improvements.push('Added more specific details and context');
    }
    if (!enhancedFeedback.match(/\b(great|good|nice|excellent)\b/i) && feedbackSummary.match(/\b(great|good|nice|excellent)\b/i)) {
      improvements.push('Replaced vague language with specific descriptions');
    }
    if ((enhancedFeedback.match(/•/g) || []).length > (feedbackSummary.match(/•/g) || []).length) {
      improvements.push('Added more actionable recommendations');
    }
    if (improvements.length === 0) {
      improvements.push('Improved clarity and professional tone');
    }

    console.log(`Enhanced feedback for ${startupName} successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        enhancedFeedback,
        improvements,
        model: aiResponse.model,
        metadata: {
          startupName,
          roundName,
          originalLength: feedbackSummary.length,
          enhancedLength: enhancedFeedback.length
        }
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

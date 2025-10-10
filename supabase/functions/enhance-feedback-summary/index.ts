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

CRITICAL LENGTH CONSTRAINT: Enhanced feedback MUST be 1.2-1.3x original length MAX.
- If original = 300 chars → enhanced = 360-390 chars MAX
- If original = 500 chars → enhanced = 600-650 chars MAX
- If original = 1000 chars → enhanced = 1200-1300 chars MAX

Enhancement Rules (STRICT):
1. Remove vague words ONLY (e.g., "good"→"demonstrated 40% growth")
2. Add ONE concrete example per strength (not multiple)
3. Make ONE actionable step per improvement (not lists)
4. NO expanding, NO adding context, NO elaborating beyond original scope
5. Keep professional but CONCISE tone
6. Preserve original structure exactly

DO NOT add information that wasn't in the original feedback. Only clarify what's there - nothing more.`;

    const userPrompt = `Enhance this ${communicationType} feedback for ${startupName} (${roundName} round):

${feedbackSummary}

Focus on making it more specific, actionable, and professional while maintaining all the original insights and tone.`;

    console.log(`Enhancing feedback for ${startupName} (length: ${feedbackSummary.length} chars)`);

    const { callGemini } = await import('../_shared/gemini-client.ts');

    // Single API call with constrained token limit to enforce brevity
    let aiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.7, // Lower temperature for more focused output
      maxTokens: 2500, // Reduced to enforce brevity
    });

    // Simple retry logic for network/temporary issues
    if (!aiResponse.success && !aiResponse.error?.toLowerCase().includes('rate limit')) {
      console.log('First attempt failed, retrying once...');
      aiResponse = await callGemini({
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 2500,
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

    // Validate output length - truncate if too long
    let enhancedContent = aiResponse.content;
    let wasTruncated = false;
    const maxAllowedLength = feedbackSummary.length * 2; // 2x original max

    if (enhancedContent.length > maxAllowedLength) {
      console.warn(`Enhanced feedback too long (${enhancedContent.length} chars). Truncating to ${maxAllowedLength} chars.`);
      enhancedContent = enhancedContent.substring(0, maxAllowedLength - 50) + '... [Enhanced feedback truncated for brevity]';
      wasTruncated = true;
    }

    console.log(`✨ Enhanced feedback for ${startupName} successfully (${feedbackSummary.length} → ${enhancedContent.length} chars${wasTruncated ? ', truncated' : ''})`);

    return new Response(
      JSON.stringify({
        success: true,
        enhancedFeedback: enhancedContent,
        wasTruncated,
        metadata: {
          startupName,
          roundName,
          originalLength: feedbackSummary.length,
          enhancedLength: enhancedContent.length,
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

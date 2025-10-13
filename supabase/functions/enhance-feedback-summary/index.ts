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
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Placeholder text - generate feedback first'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Smart pre-validation: Skip enhancement if too short
    if (feedbackSummary.trim().length < 100) {
      console.log(`Skipping enhancement for ${startupName} - too short (${feedbackSummary.length} chars)`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Too short - no enhancement needed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if lacks substance (mostly filler words)
    const substantiveWords = feedbackSummary
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'very', 'good', 'nice', 'great', 'well'].includes(w));

    if (substantiveWords.length < 20) {
      console.log(`Skipping enhancement for ${startupName} - lacks substance (${substantiveWords.length} words)`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Insufficient detail - no enhancement needed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if already well-structured
    const numberedList = /(^|\n)\s*\d+[.)]\s/.test(feedbackSummary);
    const dashedList = /(^|\n)\s*[-•]\s/.test(feedbackSummary);
    const hasStructure = feedbackSummary.includes('•') || 
                        feedbackSummary.includes('\n\n') || 
                        numberedList || 
                        dashedList;
    
    console.log('hasStructure?', { numberedList, dashedList, hasStructure, length: feedbackSummary.length });

    if (hasStructure && feedbackSummary.length < 500) {
      console.log(`Skipping enhancement for ${startupName} - already well-structured`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Already well-structured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      console.error('GOOGLE_GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'AI service not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ultra-minimal system prompt
    const systemPrompt = `Restructure this feedback for clarity. DO NOT add new information.

Your ONLY job:
1. Break walls of text into short paragraphs
2. Add bullet points if listing multiple items
3. Fix obvious typos/grammar
4. Ensure consistent tense

If feedback is already clear, return it EXACTLY as-is. Never expand beyond 1.1x original length.`;

    const userPrompt = `Restructure this ${communicationType} feedback for ${startupName}:

${feedbackSummary}`;

    console.log(`Enhancing feedback for ${startupName} (length: ${feedbackSummary.length} chars)`);

    const { callGemini } = await import('../_shared/gemini-client.ts');

    // 12-second timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 12000);

    let aiResponse;
    try {
      aiResponse = await callGemini({
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 1500,
      });
    } catch (error) {
      console.error('Enhancement timeout or error:', error);
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Timeout - original preserved'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Guaranteed fallback: validate length ratio
    if (aiResponse.success && aiResponse.content) {
      const enhanced = aiResponse.content.trim();
      const lengthRatio = enhanced.length / feedbackSummary.length;
      
      if (lengthRatio > 1.3 || lengthRatio < 0.8) {
        console.warn(`Enhanced feedback length ratio out of bounds (${lengthRatio.toFixed(2)}x). Using original.`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            enhancedFeedback: feedbackSummary,
            skipped: true,
            skipReason: 'AI output too different - original preserved'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`✨ Enhanced feedback for ${startupName} (${feedbackSummary.length} → ${enhanced.length} chars)`);
      return new Response(
        JSON.stringify({
          success: true,
          enhancedFeedback: enhanced,
          skipped: false,
          metadata: {
            startupName,
            roundName,
            originalLength: feedbackSummary.length,
            enhancedLength: enhanced.length,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Any other case → return original
    console.log(`No AI output for ${startupName}, preserving original`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        enhancedFeedback: feedbackSummary,
        skipped: true,
        skipReason: 'No AI output - original preserved'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

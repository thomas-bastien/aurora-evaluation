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
  mode?: 'auto' | 'chunked';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbackSummary, startupName, roundName, communicationType, mode }: EnhancementRequest = await req.json();

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

    // Helpers for chunked enhancement
    const splitIntoChunks = (text: string, maxChunkChars = 1800): string[] => {
      const paras = text.split(/\n{2,}/);
      const chunks: string[] = [];
      let current = '';
      for (const p of paras) {
        const next = current ? `${current}\n\n${p}` : p;
        if (next.length > maxChunkChars) {
          if (current) chunks.push(current);
          if (p.length <= maxChunkChars) {
            current = p;
          } else {
            // Hard-wrap very long single paragraphs
            for (let i = 0; i < p.length; i += maxChunkChars) {
              chunks.push(p.slice(i, i + maxChunkChars));
            }
            current = '';
          }
        } else {
          current = next;
        }
      }
      if (current) chunks.push(current);
      return chunks.filter(Boolean);
    };

    const enhanceOnce = async (text: string) => {
      const prompt = `Enhance this section for ${startupName} (${roundName} round):\n\n${text}\n\n` +
        `Focus on clarity, specificity, and actionable recommendations. Preserve structure and meaning. Do not add new facts.`;
      return await callGemini({
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt: prompt,
        temperature: 0.7,
        maxTokens: 600,
      });
    };

    // Try single-shot first unless forced to chunk or obviously too long
    const forceChunked = mode === 'chunked';
    const obviouslyLong = feedbackSummary.length > 8000;

    let enhancedFeedback: string | null = null;

    if (!forceChunked && !obviouslyLong) {
      const aiResponse = await callGemini({
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens: 3000,
      });

      if (aiResponse.success && aiResponse.content) {
        enhancedFeedback = aiResponse.content;
      } else {
        console.warn('Single-shot enhancement failed, considering chunked fallback:', aiResponse.error);
        if (aiResponse.error?.toLowerCase().includes('rate limit')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Fall back to chunked mode for length/token related issues
      }
    }

    if (!enhancedFeedback) {
      console.log('Using chunked enhancement fallback');
      const chunks = splitIntoChunks(feedbackSummary);
      console.log(`Chunked into ${chunks.length} section(s)`);

      const enhancedParts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const section = chunks[i];
        const res = await enhanceOnce(section);
        if (!res.success || !res.content) {
          console.error(`Chunk ${i + 1} enhancement failed:`, res.error);
          // Known failures should not bubble as 500; provide helpful message
          return new Response(
            JSON.stringify({
              success: false,
              error: `AI enhancement failed on section ${i + 1}. Try again in a moment or shorten the text.`,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        enhancedParts.push(res.content);
      }
      enhancedFeedback = enhancedParts.join('\n\n');
    }

    if (!enhancedFeedback) {
      return new Response(
        JSON.stringify({ success: false, error: 'No enhanced feedback produced.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        metadata: {
          startupName,
          roundName,
          originalLength: feedbackSummary.length,
          enhancedLength: enhancedFeedback.length,
          mode: enhancedFeedback.length > 0 && (forceChunked || obviouslyLong) ? 'chunked' : 'single',
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

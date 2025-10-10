import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  startupId?: string;
  stream?: boolean;
}

// Helper to compute SHA-256 hash
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { 
      feedbackSummary, 
      startupName, 
      roundName, 
      communicationType, 
      mode,
      startupId,
      stream = false 
    }: EnhancementRequest = await req.json();

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

    // Phase 3: Check cache first
    let cachedResult: string | null = null;
    if (startupId) {
      const inputHash = await computeHash(feedbackSummary);
      console.log(`Checking cache for hash: ${inputHash.substring(0, 12)}...`);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: cached } = await supabase
        .from('vc_feedback_enhancement_cache')
        .select('enhanced_text, created_at')
        .eq('startup_id', startupId)
        .eq('round_name', roundName)
        .eq('input_hash', inputHash)
        .maybeSingle();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge < sevenDays) {
          console.log(`✅ Cache hit! Age: ${Math.floor(cacheAge / 1000 / 60)} minutes`);
          cachedResult = cached.enhanced_text;
        } else {
          console.log(`⏰ Cache expired (${Math.floor(cacheAge / 1000 / 60 / 60)} hours old), refreshing...`);
        }
      }
    }

    if (cachedResult) {
      return new Response(
        JSON.stringify({
          success: true,
          enhancedFeedback: cachedResult,
          improvements: ['Retrieved from cache'],
          metadata: {
            startupName,
            roundName,
            originalLength: feedbackSummary.length,
            enhancedLength: cachedResult.length,
            mode: 'cached',
            timeTaken: Date.now() - startTime,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Enhancing feedback for ${startupName} (length: ${feedbackSummary.length} chars)`);

    const { callGemini } = await import('../_shared/gemini-client.ts');

    // Phase 2: Optimistic chunking with smarter splitting
    const splitIntoChunks = (text: string, maxChunkChars = 2500): string[] => {
      // First try to split by VC sections (natural boundaries)
      const vcSections = text.split(/\n(?=VC fund #)/);
      
      // If sections are small enough, use them directly
      if (vcSections.every(s => s.length <= maxChunkChars) && vcSections.length > 1) {
        console.log(`✂️ Split into ${vcSections.length} natural VC sections`);
        return vcSections;
      }
      
      // Otherwise, fall back to paragraph-based chunking
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
        temperature: 0.8, // Phase 1: Increased for faster generation
        maxTokens: 400, // Phase 1: Reduced from 600
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
        temperature: 0.8, // Phase 1: Increased from 0.7
        maxTokens: 2000, // Phase 1: Reduced from 3000
      });

      if (aiResponse.success && aiResponse.content) {
        enhancedFeedback = aiResponse.content;
        console.log(`✅ Single-shot enhancement completed in ${Date.now() - startTime}ms`);
      } else {
        console.warn('Single-shot enhancement failed, switching to chunked:', aiResponse.error);
        if (aiResponse.error?.toLowerCase().includes('rate limit')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait and try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Phase 1: Parallel chunk processing
    if (!enhancedFeedback) {
      console.log('🔀 Using parallel chunked enhancement');
      const chunks = splitIntoChunks(feedbackSummary);
      console.log(`📦 Chunked into ${chunks.length} section(s), processing in parallel...`);

      // Process all chunks in parallel
      const enhancementPromises = chunks.map((section, i) => 
        enhanceOnce(section)
          .then(res => {
            console.log(`✓ Chunk ${i + 1}/${chunks.length} completed`);
            return { index: i, result: res };
          })
      );

      const results = await Promise.all(enhancementPromises);
      console.log(`✅ All ${chunks.length} chunks processed in ${Date.now() - startTime}ms`);

      // Sort by original order and combine
      const enhancedParts: string[] = results
        .sort((a, b) => a.index - b.index)
        .map(r => {
          if (!r.result.success || !r.result.content) {
            throw new Error(`Section ${r.index + 1} enhancement failed: ${r.result.error || 'Unknown error'}`);
          }
          return r.result.content;
        });

      enhancedFeedback = enhancedParts.join('\n\n');
    }

    if (!enhancedFeedback) {
      return new Response(
        JSON.stringify({ success: false, error: 'No enhanced feedback produced.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Phase 3: Cache the result
    if (startupId) {
      const inputHash = await computeHash(feedbackSummary);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('vc_feedback_enhancement_cache')
        .upsert({
          startup_id: startupId,
          round_name: roundName,
          input_hash: inputHash,
          enhanced_text: enhancedFeedback,
          metadata: {
            startup_name: startupName,
            communication_type: communicationType,
            original_length: feedbackSummary.length,
            enhanced_length: enhancedFeedback.length,
          },
        });
      console.log('💾 Cached enhancement result');
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

    const timeTaken = Date.now() - startTime;
    console.log(`✨ Enhanced feedback for ${startupName} successfully in ${timeTaken}ms`);

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
          mode: obviouslyLong || forceChunked ? 'chunked-parallel' : 'single',
          timeTaken,
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

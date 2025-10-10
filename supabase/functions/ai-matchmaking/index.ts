import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchmakingRequest {
  startup: {
    id: string;
    name: string;
    verticals: string[];
    stage: string;
    regions: string[];
    description: string;
  };
  jurors: Array<{
    id: string;
    name: string;
    company: string;
    job_title: string;
    target_verticals: string[];
    preferred_stages: string[];
    preferred_regions: string[];
  }>;
  roundType: 'screening' | 'pitching';
  seed?: number;
}

interface AIMatchScore {
  juror_id: string;
  compatibility_score: number;
  confidence: number;
  brief_reasoning: string;
  recommendation: 'Highly Recommended' | 'Recommended' | 'Consider' | 'Not Recommended';
}

// Batch processing configuration
const BATCH_SIZE = 5; // Process 5 jurors at a time for optimal speed
const MAX_PARALLEL_BATCHES = 4; // Maximum concurrent API calls

// Process a single batch of jurors
async function processBatch(
  batch: any[],
  startup: any,
  roundType: string,
  systemPrompt: string,
  batchIndex: number,
  totalBatches: number,
  seed?: number
): Promise<AIMatchScore[]> {
  const userPrompt = `Startup:
Name: ${startup.name}
Verticals: ${startup.verticals.join(', ')}
Stage: ${startup.stage}
Regions: ${startup.regions.join(', ')}
Description: ${startup.description || 'N/A'}

Jurors to evaluate (batch ${batchIndex + 1} of ${totalBatches}, ${batch.length} jurors):
${batch.map((j, i) => `
${i + 1}. ID: ${j.id}
   Name: ${j.name}
   Role: ${j.job_title} at ${j.company}
   Verticals: ${j.target_verticals?.join(', ') || 'Not specified'}
   Stages: ${j.preferred_stages?.join(', ') || 'Not specified'}
   Regions: ${j.preferred_regions?.join(', ') || 'Not specified'}
`).join('\n')}

Analyze compatibility for these ${batch.length} jurors and return the JSON array.`;

  console.log(`[Batch ${batchIndex + 1}/${totalBatches}] Processing ${batch.length} jurors`);

  const { callGemini } = await import('../_shared/gemini-client.ts');
  
  const aiResponse = await callGemini({
    model: 'gemini-2.5-flash',
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    temperature: 0.3,
    maxTokens: 8192 // Reduced since processing fewer jurors
  });

  if (!aiResponse.success || !aiResponse.content) {
    console.error(`[Batch ${batchIndex + 1}] Gemini API error:`, aiResponse.error);
    throw new Error(aiResponse.error || 'Failed to get AI matchmaking response');
  }

  // Parse JSON response
  let jsonStr = aiResponse.content.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '').trim();
  }
  
  const matchScores = JSON.parse(jsonStr);
  
  if (!Array.isArray(matchScores)) {
    throw new Error(`[Batch ${batchIndex + 1}] Invalid AI response format`);
  }

  console.log(`[Batch ${batchIndex + 1}/${totalBatches}] Completed: ${matchScores.length} jurors scored`);
  
  return matchScores;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startup, jurors, roundType, seed }: MatchmakingRequest = await req.json();
    
    if (!startup || !jurors || jurors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: startup, jurors' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    // Build the AI prompt
    const systemPrompt = `You are an expert VC matchmaking analyst specializing in ${roundType} round evaluations. 
Analyze the compatibility between jurors and a startup for evaluation purposes.${seed ? ` Use seed ${seed} for deterministic results.` : ''}

Consider:
1. Semantic similarity in verticals (not just exact matches)
2. Industry expertise and investment focus depth
3. Geographic relevance and market knowledge
4. Stage expertise and investment patterns
5. Contextual fit based on job title, company background, and startup description

Return a JSON array with one object per juror containing:
- juror_id: string
- compatibility_score: number (0-10, where 10 = perfect match, 0 = no match)
- confidence: number (0-1, how confident you are in this score)
- brief_reasoning: string (1-2 concise sentences explaining the key compatibility factors)
- recommendation: "Highly Recommended" | "Recommended" | "Consider" | "Not Recommended"

Be discerning with scores - most should fall between 3-7. Focus on the most important factors in your reasoning.`;

    // Split jurors into batches for parallel processing
    const batches: any[][] = [];
    for (let i = 0; i < jurors.length; i += BATCH_SIZE) {
      batches.push(jurors.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${jurors.length} jurors in ${batches.length} parallel batches of ~${BATCH_SIZE} each`);
    const startTime = Date.now();

    // Process all batches in parallel
    let allScores: AIMatchScore[] = [];
    try {
      const batchResults = await Promise.all(
        batches.map((batch, index) => 
          processBatch(batch, startup, roundType, systemPrompt, index, batches.length, seed)
        )
      );
      
      // Flatten all results
      allScores = batchResults.flat();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`All ${batches.length} batches completed in ${duration}s. Total jurors scored: ${allScores.length}`);
      
    } catch (error) {
      console.error('Batch processing error:', error);
      
      if (error instanceof Error && error.message?.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw error;
    }

    // Validate we got scores for all jurors
    if (allScores.length !== jurors.length) {
      console.warn(`Expected ${jurors.length} scores but got ${allScores.length}`);
    }

    // Sort by compatibility score (highest first)
    allScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    console.log(`AI matchmaking completed for startup ${startup.name}: ${allScores.length} jurors scored`);

    return new Response(
      JSON.stringify({ 
        success: true,
        scores: allScores,
        startup_id: startup.id,
        round_type: roundType,
        processing_time_seconds: ((Date.now() - startTime) / 1000).toFixed(1),
        batches_processed: batches.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('AI matchmaking error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

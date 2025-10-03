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
}

interface AIMatchScore {
  juror_id: string;
  compatibility_score: number;
  confidence: number;
  reasoning: {
    vertical_match: { score: number; explanation: string };
    stage_match: { score: number; explanation: string };
    region_match: { score: number; explanation: string };
    contextual_fit: { score: number; explanation: string };
  };
  recommendation: 'Highly Recommended' | 'Recommended' | 'Consider' | 'Not Recommended';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startup, jurors, roundType }: MatchmakingRequest = await req.json();
    
    if (!startup || !jurors || jurors.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: startup, jurors' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build the AI prompt
    const systemPrompt = `You are an expert VC matchmaking analyst specializing in ${roundType} round evaluations. 
Analyze the compatibility between jurors and a startup for evaluation purposes.

Consider:
1. Semantic similarity in verticals (not just exact matches) - e.g., "AI/ML" ≈ "Artificial Intelligence", "HealthTech" ≈ "Medical Technology"
2. Industry expertise and investment focus depth
3. Geographic relevance and market knowledge
4. Stage expertise and investment patterns
5. Contextual fit based on job title, company background, and startup description

Return a JSON array with one object per juror containing:
- juror_id: string
- compatibility_score: number (0-100)
- confidence: number (0-1, how confident you are in this score)
- reasoning: {
    vertical_match: { score: number (0-100), explanation: string },
    stage_match: { score: number (0-100), explanation: string },
    region_match: { score: number (0-100), explanation: string },
    contextual_fit: { score: number (0-100), explanation: string }
  }
- recommendation: "Highly Recommended" | "Recommended" | "Consider" | "Not Recommended"

Be concise but specific in explanations. Focus on semantic understanding and real-world relevance.`;

    const userPrompt = `Startup:
Name: ${startup.name}
Verticals: ${startup.verticals.join(', ')}
Stage: ${startup.stage}
Regions: ${startup.regions.join(', ')}
Description: ${startup.description || 'N/A'}

Jurors to evaluate (${jurors.length} total):
${jurors.map((j, i) => `
${i + 1}. ID: ${j.id}
   Name: ${j.name}
   Role: ${j.job_title} at ${j.company}
   Verticals: ${j.target_verticals?.join(', ') || 'Not specified'}
   Stages: ${j.preferred_stages?.join(', ') || 'Not specified'}
   Regions: ${j.preferred_regions?.join(', ') || 'Not specified'}
`).join('\n')}

Analyze compatibility for all ${jurors.length} jurors and return the JSON array.`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        temperature: 0.3, // Lower temperature for more consistent scoring
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content in AI response');
    }

    // Parse AI response (handle JSON in markdown code blocks)
    let matchScores: AIMatchScore[];
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      matchScores = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse AI recommendations');
    }

    // Validate response structure
    if (!Array.isArray(matchScores) || matchScores.length === 0) {
      throw new Error('Invalid AI response format');
    }

    // Sort by compatibility score (highest first)
    matchScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    console.log(`AI matchmaking completed for startup ${startup.name}: ${matchScores.length} jurors scored`);

    return new Response(
      JSON.stringify({ 
        success: true,
        scores: matchScores,
        startup_id: startup.id,
        round_type: roundType
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

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestionRequest {
  draftText: string;
  fieldType: 'strengths' | 'improvement_areas' | 'pitch_development' | 'overall_notes';
  rubric: {
    sections: Array<{
      key: string;
      title: string;
      criteria: Array<{
        key: string;
        label: string;
        description: string;
      }>;
      guidance: string;
    }>;
  };
  startupContext: {
    name: string;
    vertical: string;
    stage: string;
    description?: string;
    businessModel?: string[];
    teamSize?: number;
    fundingRaised?: number;
    hasPitchDeck?: boolean;
    hasDemo?: boolean;
  };
  criterionScores: Record<string, number>; // Juror's 1-5 scores per criterion
  overallScore: number; // Calculated 0-10 overall score
  relevantCriteria: Array<{
    sectionKey: string;
    sectionTitle: string;
    criteriaWithScores: Array<{
      key: string;
      label: string;
      description: string;
      score: number;
    }>;
  }>;
  roundName: 'screening' | 'pitching';
}

interface Suggestion {
  text: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      draftText, 
      fieldType, 
      rubric, 
      startupContext, 
      criterionScores,
      overallScore,
      relevantCriteria,
      roundName 
    }: SuggestionRequest = await req.json();

    // Return empty suggestions for very short drafts
    if (!draftText || draftText.length < 10) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error('GOOGLE_GEMINI_API_KEY is not configured');
    }

    // Build context strings
    const startupDetails = [
      `Name: ${startupContext.name}`,
      `Vertical: ${startupContext.vertical}`,
      `Stage: ${startupContext.stage}`,
      startupContext.description && `Description: ${startupContext.description}`,
      startupContext.businessModel && `Business Model: ${startupContext.businessModel.join(', ')}`,
      startupContext.teamSize && `Team Size: ${startupContext.teamSize}`,
      startupContext.fundingRaised && `Funding Raised: ${startupContext.fundingRaised}`,
      startupContext.hasPitchDeck !== undefined && `Has Pitch Deck: ${startupContext.hasPitchDeck ? 'Yes' : 'No'}`,
      startupContext.hasDemo !== undefined && `Has Demo: ${startupContext.hasDemo ? 'Yes' : 'No'}`,
    ].filter(Boolean).join('\n');

    // Build criterion scores context
    const lowScoredCriteria = relevantCriteria
      .flatMap(section => section.criteriaWithScores
        .filter(c => c.score <= 3)
        .map(c => `- ${section.sectionTitle} > ${c.label}: ${c.score}/5`)
      );
    
    const highScoredCriteria = relevantCriteria
      .flatMap(section => section.criteriaWithScores
        .filter(c => c.score >= 4)
        .map(c => `- ${section.sectionTitle} > ${c.label}: ${c.score}/5`)
      );

    // System prompt
    const systemPrompt = `You are an evaluation feedback assistant for Aurora Tech Awards. Your role is to help jurors improve their feedback quality WITHOUT changing their voice or adding facts not present in their draft.

STRICT RULES (NEVER VIOLATE):
1. ONLY suggest improvements to EXISTING draft text - never add new claims
2. NEVER invent startup details, metrics, or facts
3. ONLY reference data from: juror's scores, rubric criteria, startup context provided
4. If draft is already clear and references scores appropriately, return ZERO suggestions

YOUR TASK:
- Detect misalignment between scores and feedback
- Flag missing explanations for low scores (≤3/5)
- Suggest adding specificity WITHOUT inventing details
- Recommend referencing rubric criteria when relevant

SUGGESTION FORMAT (max 15 words):
✅ "Explain why you scored 'Market Size' as 2/5"
✅ "Clarify which specific competitor analysis is weak"
❌ "Mention their competitor Acme Corp" (inventing)
❌ "Add that market is £50M" (inventing numbers)`;

    // Build field-specific user prompt
    let userPrompt = `Evaluation Context:
Round: ${roundName}
Overall Score: ${overallScore.toFixed(1)}/10

Startup:
${startupDetails}

Field Type: ${fieldType}
Current Draft:
"${draftText}"
`;

    if (fieldType === 'improvement_areas' && lowScoredCriteria.length > 0) {
      userPrompt += `\nJuror's Low Scores (≤3/5):
${lowScoredCriteria.join('\n')}

Task: Suggest 1-2 improvements ONLY IF:
- Draft doesn't explain WHY low-scored criteria failed
- Draft is too generic (no rubric reference)
- Draft is too short (<50 words) for overall score of ${overallScore.toFixed(1)}/10

Return ZERO suggestions if draft already addresses low scores clearly.`;
    } else if (fieldType === 'strengths' && highScoredCriteria.length > 0) {
      userPrompt += `\nJuror's High Scores (≥4/5):
${highScoredCriteria.join('\n')}

Task: Suggest improvements ONLY IF:
- Strength doesn't reference WHY criterion scored high
- Strength is generic (could apply to any startup)
- Missing connection to rubric criteria

Be invisible if strength is specific and evidence-based.`;
    } else {
      userPrompt += `\nAll Criterion Scores:
${relevantCriteria.map(section => 
  `${section.sectionTitle}:\n${section.criteriaWithScores.map(c => `  - ${c.label}: ${c.score}/5`).join('\n')}`
).join('\n\n')}

Task: Suggest 1-2 improvements to make feedback more specific and actionable. Reference scores when relevant.`;
    }

    console.log(`Generating suggestions for ${fieldType} field`);

    const { callGemini } = await import('../_shared/gemini-client.ts');
    
    const aiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      temperature: 0.5,
      maxTokens: 1000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_feedback_improvements',
            description: 'Return 2-3 actionable suggestions to improve evaluation feedback',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: {
                        type: 'string',
                        description: 'Suggestion text (max 20 words)'
                      },
                      reason: {
                        type: 'string',
                        description: 'Why this helps (references rubric if relevant)'
                      },
                      priority: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                        description: 'Importance of this suggestion'
                      }
                    },
                    required: ['text', 'reason', 'priority'],
                    additionalProperties: false
                  },
                  maxItems: 3
                }
              },
              required: ['suggestions'],
              additionalProperties: false
            }
          }
        }
      ],
      toolChoice: { function: { name: 'suggest_feedback_improvements' } }
    });

    if (!aiResponse.success || !aiResponse.functionCall) {
      console.error('Gemini API error:', aiResponse.error);

      if (aiResponse.error?.includes('rate limit')) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            suggestions: []
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions: Suggestion[] = aiResponse.functionCall.args.suggestions || [];

    console.log(`Generated ${suggestions.length} suggestions for ${fieldType}`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-evaluation-feedback:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

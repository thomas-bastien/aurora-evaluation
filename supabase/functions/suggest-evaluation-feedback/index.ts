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
  };
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
    const { draftText, fieldType, rubric, startupContext, roundName }: SuggestionRequest = await req.json();

    // Return empty suggestions for very short drafts
    if (!draftText || draftText.length < 10) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build rubric context
    const rubricContext = rubric.sections
      .map(section => `${section.title}: ${section.guidance}`)
      .join('\n');

    // System prompt
    const systemPrompt = `You are an evaluation feedback assistant for Aurora Tech Awards. Your role is to help jurors improve their feedback quality WITHOUT changing their voice or adding facts not present in their draft.

Guidelines:
- Suggest 2-3 specific improvements (max 20 words each)
- Reference rubric criteria when relevant
- Focus on: clarity, evidence, balance, actionability
- NEVER suggest adding information not implied by the draft
- Keep the juror's tone and perspective
- Be concise and actionable

Common improvement patterns:
- "Add 1-2 proof points for [claim]" when assertions lack evidence
- "Balance: include 1 risk to pair with strengths" when only positives mentioned
- "Make next step specific (timeline/metric)" when recommendations are vague
- "Clarify: what specifically about [aspect]?" when feedback is too general`;

    // User prompt
    const userPrompt = `Evaluation Context:
Round: ${roundName}
Startup: ${startupContext.name} (${startupContext.vertical}, ${startupContext.stage})
Field Type: ${fieldType}

Rubric Guidance:
${rubricContext}

Current Draft Feedback:
"${draftText}"

Provide 2-3 specific, actionable suggestions to improve this feedback. Focus on clarity, evidence, and actionability.`;

    // Call Lovable AI with structured output
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
        tool_choice: {
          type: 'function',
          function: { name: 'suggest_feedback_improvements' }
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
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
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(
          JSON.stringify({ 
            error: 'AI service credits exhausted. Please contact support.',
            suggestions: []
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract suggestions from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in response');
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const functionArgs = JSON.parse(toolCall.function.arguments);
    const suggestions: Suggestion[] = functionArgs.suggestions || [];

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

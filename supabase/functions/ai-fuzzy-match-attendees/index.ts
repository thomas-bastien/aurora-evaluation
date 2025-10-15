import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { callGemini } from "../_shared/gemini-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchRequest {
  attendeeEmails: string[];
  eventSummary: string;
  eventDescription?: string;
  eventLocation?: string;
  startups: Array<{ id: string; name: string; email: string; description?: string; verticals?: string[] }>;
  jurors: Array<{ id: string; name: string; email: string; company?: string }>;
}

interface MatchSuggestion {
  startup_id: string;
  startup_name: string;
  startup_confidence: number;
  startup_reasoning: string;
  juror_id: string;
  juror_name: string;
  juror_confidence: number;
  juror_reasoning: string;
  combined_confidence: number;
  match_method: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: MatchRequest = await req.json();
    
    console.log("[AI Fuzzy Match] Request received:", {
      attendeeCount: requestData.attendeeEmails.length,
      startupsCount: requestData.startups.length,
      jurorsCount: requestData.jurors.length,
      eventSummary: requestData.eventSummary
    });

    // Build context for Gemini
    const systemPrompt = `You are an expert at matching calendar meeting attendees to database records.

Your task: Analyze the calendar invitation details and suggest which Startup and Juror from the database are most likely attending this meeting.

MATCHING RULES:
1. Email similarity (typos, variations like john.smith vs johnsmith)
2. Name matching (event title often contains participant names)
3. Domain matching (emails from same company)
4. Context clues (event description, location)

OUTPUT FORMAT:
- Provide up to 3 match suggestions, ordered by confidence
- Each suggestion must include BOTH a startup_id and juror_id (complete pair)
- Include confidence scores (0-100) for startup and juror separately
- Provide clear reasoning for each match
- If no confident match exists (below 60%), return empty array

Be conservative with confidence scores:
- 95-100%: Near-certain match (exact email with minor variation)
- 85-94%: Very likely match (strong name/domain evidence)
- 70-84%: Probable match (multiple weak signals)
- 60-69%: Possible match (single weak signal)
- Below 60%: Don't suggest

IMPORTANT: Only suggest complete pairs (startup + juror). Don't suggest partial matches.`;

    const userPrompt = `CALENDAR EVENT:
Title: ${requestData.eventSummary}
Description: ${requestData.eventDescription || 'N/A'}
Location: ${requestData.eventLocation || 'N/A'}
Attendee Emails: ${requestData.attendeeEmails.join(', ')}

AVAILABLE STARTUPS (${requestData.startups.length}):
${requestData.startups.slice(0, 50).map((s, i) => 
  `${i + 1}. ID: ${s.id}
   Name: ${s.name}
   Email: ${s.email}
   Description: ${s.description?.substring(0, 100) || 'N/A'}
   Verticals: ${s.verticals?.join(', ') || 'N/A'}`
).join('\n\n')}

AVAILABLE JURORS (${requestData.jurors.length}):
${requestData.jurors.slice(0, 50).map((j, i) => 
  `${i + 1}. ID: ${j.id}
   Name: ${j.name}
   Email: ${j.email}
   Company: ${j.company || 'N/A'}`
).join('\n\n')}

Analyze and suggest the best matches.`;

    // Define tool for structured output
    const tools = [{
      type: 'function' as const,
      function: {
        name: 'suggest_matches',
        description: 'Return structured match suggestions with confidence scores',
        parameters: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  startup_id: { type: 'string' },
                  startup_name: { type: 'string' },
                  startup_confidence: { type: 'number', minimum: 0, maximum: 100 },
                  startup_reasoning: { type: 'string' },
                  juror_id: { type: 'string' },
                  juror_name: { type: 'string' },
                  juror_confidence: { type: 'number', minimum: 0, maximum: 100 },
                  juror_reasoning: { type: 'string' },
                  combined_confidence: { type: 'number', minimum: 0, maximum: 100 },
                  match_method: { type: 'string' }
                },
                required: [
                  'startup_id', 'startup_name', 'startup_confidence', 'startup_reasoning',
                  'juror_id', 'juror_name', 'juror_confidence', 'juror_reasoning',
                  'combined_confidence', 'match_method'
                ]
              }
            }
          },
          required: ['suggestions']
        }
      }
    }];

    // Call Gemini
    const geminiResponse = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Lower temperature for more consistent matching
      maxTokens: 4096,
      tools,
      toolChoice: { function: { name: 'suggest_matches' } }
    });

    if (!geminiResponse.success) {
      console.error("[AI Fuzzy Match] Gemini error:", geminiResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: geminiResponse.error,
          suggestions: [] 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!geminiResponse.functionCall) {
      console.warn("[AI Fuzzy Match] No function call in response");
      return new Response(
        JSON.stringify({ 
          success: true,
          suggestions: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestions: MatchSuggestion[] = geminiResponse.functionCall.args.suggestions || [];
    
    console.log("[AI Fuzzy Match] Suggestions generated:", {
      count: suggestions.length,
      topConfidence: suggestions[0]?.combined_confidence
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        model: geminiResponse.model
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI Fuzzy Match] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

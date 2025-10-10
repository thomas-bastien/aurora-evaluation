/**
 * Centralized Google Gemini API Client
 * Handles all direct Gemini API calls with format conversion and error handling
 */

export interface GeminiRequest {
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  tools?: OpenAIStyleTool[];
  toolChoice?: 'auto' | 'required' | { function: { name: string } };
}

export interface OpenAIStyleTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface GeminiResponse {
  success: boolean;
  content?: string;
  functionCall?: {
    name: string;
    args: any;
  };
  error?: string;
  model: string;
}

/**
 * Remove OpenAI-specific fields that Gemini doesn't support
 */
function cleanParametersForGemini(params: any): any {
  if (!params || typeof params !== 'object') return params;
  
  const cleaned = { ...params };
  
  // Remove additionalProperties (OpenAI-specific)
  delete cleaned.additionalProperties;
  
  // Recursively clean nested objects
  if (cleaned.properties) {
    Object.keys(cleaned.properties).forEach(key => {
      cleaned.properties[key] = cleanParametersForGemini(cleaned.properties[key]);
    });
  }
  
  if (cleaned.items) {
    cleaned.items = cleanParametersForGemini(cleaned.items);
  }
  
  return cleaned;
}

/**
 * Call Google Gemini API with OpenAI-style inputs
 */
export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  }

  const model = request.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build Gemini request payload
  const geminiPayload: any = {
    systemInstruction: {
      parts: [{ text: request.systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: request.userPrompt }]
      }
    ],
    generationConfig: {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 8192
    }
  };

  // Add tools if provided
  if (request.tools && request.tools.length > 0) {
    geminiPayload.tools = [{
      functionDeclarations: request.tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: cleanParametersForGemini(tool.function.parameters)
      }))
    }];

    // Configure tool calling behavior
    if (request.toolChoice) {
      if (request.toolChoice === 'required' || 
          (typeof request.toolChoice === 'object' && request.toolChoice.function)) {
        
        const functionName = typeof request.toolChoice === 'object' 
          ? request.toolChoice.function.name 
          : request.tools[0].function.name;

        geminiPayload.toolConfig = {
          functionCallingConfig: {
            mode: 'ANY',
            allowedFunctionNames: [functionName]
          }
        };
      } else if (request.toolChoice === 'auto') {
        geminiPayload.toolConfig = {
          functionCallingConfig: {
            mode: 'AUTO'
          }
        };
      }
    }
  }

  console.log(`[Gemini] Calling ${model} API`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini] API error:`, response.status, errorText);

      // Handle specific error codes
      if (response.status === 429) {
        return {
          success: false,
          error: 'Gemini API rate limit exceeded. Please try again shortly.',
          model
        };
      }
      
      if (response.status === 403) {
        return {
          success: false,
          error: 'Gemini API key invalid or insufficient permissions',
          model
        };
      }

      if (response.status === 400) {
        return {
          success: false,
          error: 'Invalid request to Gemini API',
          model
        };
      }

      return {
        success: false,
        error: `Gemini API error: ${response.status}`,
        model
      };
    }

    const data = await response.json();
    
    // Parse Gemini response
    const candidate = data.candidates?.[0];
    if (!candidate) {
      console.error('[Gemini] No candidates in response:', data);
      return {
        success: false,
        error: 'No response from Gemini API',
        model
      };
    }

    // Check for MAX_TOKENS finish reason before checking parts
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.error('[Gemini] Response truncated due to MAX_TOKENS limit');
      return {
        success: false,
        error: 'Response too long. The feedback text may be too large to enhance in one request. Try with shorter feedback or contact support.',
        model
      };
    }

    const part = candidate.content?.parts?.[0];
    if (!part) {
      console.error('[Gemini] No parts in candidate:', candidate);
      return {
        success: false,
        error: 'Invalid response structure from Gemini API',
        model
      };
    }

    // Check if it's a function call
    if (part.functionCall) {
      console.log(`[Gemini] Function call: ${part.functionCall.name}`);
      return {
        success: true,
        functionCall: {
          name: part.functionCall.name,
          args: part.functionCall.args
        },
        model
      };
    }

    // Otherwise it's text content
    if (part.text) {
      console.log(`[Gemini] Text response received (${part.text.length} chars)`);
      return {
        success: true,
        content: part.text,
        model
      };
    }

    console.error('[Gemini] No text or function call in part:', part);
    return {
      success: false,
      error: 'Empty response from Gemini API',
      model
    };

  } catch (error) {
    console.error('[Gemini] Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      model
    };
  }
}

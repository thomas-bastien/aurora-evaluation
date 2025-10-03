import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const STAGE_OPTIONS = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'IPO'];
const REGION_OPTIONS = ['Africa', 'Asia Pacific (APAC)', 'Europe', 'Latin America (LATAM)', 'Middle East & North Africa (MENA)', 'North America'];
const BUSINESS_MODELS = [
  'B2C – Business to Consumer',
  'B2B2C – Business to Business to Consumer',
  'B2B – Business to Business (Enterprise & SMEs)',
  'B2B – Business to Business (Enterprise)',
  'B2B – Business to Business (SMEs)',
  'D2C – Direct to Consumer',
  'C2C – Consumer to Consumer (incl. Marketplaces/Platforms)'
];

const VERTICALS = [
  'Artificial Intelligence (AI/ML)',
  'Fintech',
  'HealthTech & MedTech',
  'Wellbeing, Longevity & Life Sciences',
  'PharmTech',
  'RetailTech & E-commerce',
  'Enterprise Software',
  'Cybersecurity',
  'Productivity Tools',
  'Transportation & Mobility',
  'Energy & Sustainability',
  'AgriTech & Food Tech',
  'Media & Entertainment',
  'AdTech & MarTech',
  'Real Estate & PropTech',
  'Education Technology (EdTech)',
  'Logistics & Supply Chain',
  'Construction Tech',
  'Space Technology',
  'Semiconductors & Hardware',
  'Data Infrastructure & Analytics',
  'Industrial Automation & Robotics',
  'Aerospace & Defense',
  'Gaming & Visual Assets',
  'SportTech',
  'Web3 / Blockchain / Crypto',
  'TravelTech',
  'No Tech, not a Venture Business',
  'Others (Specify)'
];

interface EnhancementSuggestion {
  field: string;
  original: any;
  suggested: any;
  confidence: number;
  reason: string;
}

interface StartupEnhancement {
  original: any;
  enhanced: any;
  suggestions: EnhancementSuggestion[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startups } = await req.json();

    if (!startups || !Array.isArray(startups) || startups.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: startups array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Enhancing ${startups.length} startups...`);

    const enhancements: StartupEnhancement[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < startups.length; i += batchSize) {
      const batch = startups.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(startup => enhanceStartup(startup))
      );
      enhancements.push(...batchResults);
    }

    console.log(`Enhanced ${enhancements.length} startups successfully`);

    return new Response(
      JSON.stringify({ enhancements }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in enhance-startup-data:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enhanceStartup(startup: any): Promise<StartupEnhancement> {
  const suggestions: EnhancementSuggestion[] = [];
  const enhanced = { ...startup };

  // Fix URLs
  const urlFields = ['website', 'linkedin_url', 'pitch_deck_url', 'demo_url', 'founder_linkedin'];
  for (const field of urlFields) {
    if (startup[field]) {
      const fixed = fixURL(startup[field], field);
      if (fixed !== startup[field]) {
        enhanced[field] = fixed;
        suggestions.push({
          field,
          original: startup[field],
          suggested: fixed,
          confidence: 1.0,
          reason: 'Auto-fixed URL format'
        });
      }
    }
  }

  // Use AI for fuzzy matching of dropdown values
  try {
    const aiEnhancements = await callAIForFuzzyMatching(startup);
    
    // Apply AI suggestions
    if (aiEnhancements.stage && aiEnhancements.stage !== startup.stage) {
      enhanced.stage = aiEnhancements.stage;
      suggestions.push({
        field: 'stage',
        original: startup.stage,
        suggested: aiEnhancements.stage,
        confidence: aiEnhancements.stage_confidence || 0.8,
        reason: aiEnhancements.stage_reason || 'AI matched to standard format'
      });
    }

    if (aiEnhancements.region && aiEnhancements.region !== startup.region) {
      enhanced.region = aiEnhancements.region;
      suggestions.push({
        field: 'region',
        original: startup.region,
        suggested: aiEnhancements.region,
        confidence: aiEnhancements.region_confidence || 0.8,
        reason: aiEnhancements.region_reason || 'AI matched to standard region'
      });
    }

    if (aiEnhancements.business_model && JSON.stringify(aiEnhancements.business_model) !== JSON.stringify(startup.business_model)) {
      enhanced.business_model = aiEnhancements.business_model;
      suggestions.push({
        field: 'business_model',
        original: startup.business_model,
        suggested: aiEnhancements.business_model,
        confidence: aiEnhancements.business_model_confidence || 0.8,
        reason: aiEnhancements.business_model_reason || 'AI matched to standard business models'
      });
    }

    if (aiEnhancements.verticals && JSON.stringify(aiEnhancements.verticals) !== JSON.stringify(startup.verticals)) {
      enhanced.verticals = aiEnhancements.verticals;
      suggestions.push({
        field: 'verticals',
        original: startup.verticals,
        suggested: aiEnhancements.verticals,
        confidence: aiEnhancements.verticals_confidence || 0.8,
        reason: aiEnhancements.verticals_reason || 'AI matched to Aurora verticals'
      });
    }

  } catch (aiError) {
    console.error('AI enhancement failed for startup:', startup.name, aiError);
    // Continue with URL fixes even if AI fails
  }

  return {
    original: startup,
    enhanced,
    suggestions
  };
}

function fixURL(url: string, fieldType: string): string {
  let fixed = url.trim();

  // Remove whitespace
  fixed = fixed.replace(/\s+/g, '');

  // Fix common typos
  fixed = fixed.replace(/^htps:\/\//i, 'https://');
  fixed = fixed.replace(/^http:\/\//i, 'https://');
  fixed = fixed.replace(/^htp:\/\//i, 'https://');
  fixed = fixed.replace(/^https:\/([^/])/i, 'https://$1');
  fixed = fixed.replace(/^http\/\//i, 'https://');

  // Add https:// if missing
  if (!fixed.startsWith('http://') && !fixed.startsWith('https://')) {
    fixed = 'https://' + fixed;
  }

  // Standardize LinkedIn URLs
  if (fieldType.includes('linkedin')) {
    // Remove trailing slashes
    fixed = fixed.replace(/\/+$/, '');
    
    // Ensure proper linkedin.com domain
    if (fixed.includes('linkedin') && !fixed.includes('linkedin.com')) {
      fixed = fixed.replace(/linkedin/i, 'linkedin.com');
    }

    // Standardize /in/ and /company/ paths
    if (fieldType === 'founder_linkedin') {
      if (!fixed.includes('/in/') && !fixed.includes('/company/')) {
        // Try to extract username and add /in/
        const match = fixed.match(/linkedin\.com\/([^\/]+)$/);
        if (match) {
          fixed = fixed.replace(/linkedin\.com\/[^\/]+$/, `linkedin.com/in/${match[1]}`);
        }
      }
    } else if (fieldType === 'linkedin_url') {
      if (!fixed.includes('/company/') && !fixed.includes('/in/')) {
        const match = fixed.match(/linkedin\.com\/([^\/]+)$/);
        if (match) {
          fixed = fixed.replace(/linkedin\.com\/[^\/]+$/, `linkedin.com/company/${match[1]}`);
        }
      }
    }
  }

  return fixed;
}

async function callAIForFuzzyMatching(startup: any): Promise<any> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `You are a data normalization assistant. Your job is to map startup data fields to standardized values.

Available options:
- Stages: ${STAGE_OPTIONS.join(', ')}
- Regions: ${REGION_OPTIONS.join(', ')}
- Business Models: ${BUSINESS_MODELS.join(', ')}
- Verticals: ${VERTICALS.join(', ')}

Match the user's input to the closest standard value(s). Handle typos, variations, abbreviations, and synonyms.
For example:
- "pre seed" → "Pre-Seed"
- "B2B" → "B2B – Business to Business (Enterprise & SMEs)"
- "ML" or "Machine Learning" → "Artificial Intelligence (AI/ML)"
- "USA" or "United States" → "North America"
- "EMEA" → "Europe" (or suggest both Europe and MENA if unclear)`;

  const userPrompt = `Normalize this startup data:
- Stage: ${startup.stage || 'not provided'}
- Region: ${startup.region || 'not provided'}
- Business Model: ${JSON.stringify(startup.business_model) || 'not provided'}
- Verticals: ${JSON.stringify(startup.verticals) || 'not provided'}

Return your suggestions with confidence scores (0-1) and brief reasons.`;

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
            name: 'normalize_startup_data',
            description: 'Normalize startup data fields to standard formats',
            parameters: {
              type: 'object',
              properties: {
                stage: { type: 'string', enum: STAGE_OPTIONS },
                stage_confidence: { type: 'number', minimum: 0, maximum: 1 },
                stage_reason: { type: 'string' },
                region: { type: 'string', enum: REGION_OPTIONS },
                region_confidence: { type: 'number', minimum: 0, maximum: 1 },
                region_reason: { type: 'string' },
                business_model: { type: 'array', items: { type: 'string', enum: BUSINESS_MODELS } },
                business_model_confidence: { type: 'number', minimum: 0, maximum: 1 },
                business_model_reason: { type: 'string' },
                verticals: { type: 'array', items: { type: 'string', enum: VERTICALS } },
                verticals_confidence: { type: 'number', minimum: 0, maximum: 1 },
                verticals_reason: { type: 'string' }
              },
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'normalize_startup_data' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall && toolCall.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return args;
  }

  return {};
}

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

interface VCSection {
  vcNumber: number;
  vcName: string;
  evaluatorName: string;
  strengths: string[];
  improvements: string;
  pitchDevelopment: string;
  focusAreas: string;
  additionalComments: string;
}

interface CleaningResult {
  cleaned: string;
  wasModified: boolean;
}

function parseVCFeedback(feedback: string): VCSection[] {
  const sections: VCSection[] = [];
  
  // Split by the separator line (60 equals signs)
  const vcBlocks = feedback.split(/={60,}/);
  
  for (const block of vcBlocks) {
    if (!block.trim()) continue;
    
    const section: VCSection = {
      vcNumber: 0,
      vcName: '',
      evaluatorName: '',
      strengths: [],
      improvements: '',
      pitchDevelopment: '',
      focusAreas: '',
      additionalComments: ''
    };
    
    // Extract VC fund # and name
    const fundMatch = block.match(/VC fund #(\d+) - (.+)/);
    if (fundMatch) {
      section.vcNumber = parseInt(fundMatch[1]);
      section.vcName = fundMatch[2].trim();
    }
    
    // Extract evaluator name
    const evaluatorMatch = block.match(/Evaluator: (.+)/);
    if (evaluatorMatch) {
      section.evaluatorName = evaluatorMatch[1].trim();
    }
    
    // Extract strengths (bullet points)
    const strengthsSection = block.match(/Strengths of the startup:\n([\s\S]*?)(?=\n\n[A-Z]|$)/);
    if (strengthsSection) {
      const strengthLines = strengthsSection[1].split('\n').filter(l => l.trim().startsWith('•'));
      section.strengths = strengthLines.map(l => l.replace(/^•\s*/, '').trim());
    }
    
    // Extract main areas that need improvement
    const improvementsMatch = block.match(/Main areas that need improvement:\n([\s\S]*?)(?=\n\n[A-Z]|$)/);
    if (improvementsMatch) {
      section.improvements = improvementsMatch[1].trim();
    }
    
    // Extract pitch development aspects
    const pitchMatch = block.match(/Aspects of the pitch that need further development:\n([\s\S]*?)(?=\n\n[A-Z]|$)/);
    if (pitchMatch) {
      section.pitchDevelopment = pitchMatch[1].trim();
    }
    
    // Extract focus areas
    const focusMatch = block.match(/Key areas the team should focus on:\n([\s\S]*?)(?=\n\n[A-Z]|$)/);
    if (focusMatch) {
      section.focusAreas = focusMatch[1].trim();
    }
    
    // Extract additional comments
    const commentsMatch = block.match(/Additional comments:\n([\s\S]*?)$/);
    if (commentsMatch) {
      section.additionalComments = commentsMatch[1].trim();
    }
    
    sections.push(section);
  }
  
  return sections;
}

function needsCleaning(text: string): boolean {
  // Skip if empty or placeholder
  if (!text || text.length < 20 || text.includes('No specific') || text.includes('not provided')) {
    return false;
  }
  
  // Skip if already well-formatted with bullet points or numbered lists
  if (/(^|\n)\s*[-•]\s/.test(text) || /(^|\n)\s*\d+[.)]\s/.test(text)) {
    return false;
  }
  
  // Skip if it's just one very short, clear sentence (e.g., "Improve the pitch deck")
  if (text.length < 50 && text.split('. ').length <= 1) {
    return false;
  }
  
  // Default: assume text could benefit from cleaning
  // This includes: medium-length text, run-on sentences, grammar issues, etc.
  return true;
}

async function cleanTextSection(
  text: string, 
  sectionType: string,
  callGemini: any
): Promise<CleaningResult> {
  
  if (!needsCleaning(text)) {
    return { cleaned: text, wasModified: false };
  }
  
  const systemPrompt = `Clean this ${sectionType} section. DO NOT add new information.

Rules:
1. Break long sentences into shorter ones
2. Add bullet points if listing multiple items (use • not -)
3. Fix typos/grammar only
4. Keep it concise - remove filler words
5. Maximum 1.2x original length

If already clear, return EXACTLY as-is.`;

  const userPrompt = `Clean this ${sectionType}:\n\n${text}`;
  
  try {
    const response = await callGemini({
      model: 'gemini-2.5-flash',
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 800, // Small calls only
    });
    
    if (response.success && response.content) {
      const cleaned = response.content.trim();
      const lengthRatio = cleaned.length / text.length;
      
      // Accept if reasonable length change
      if (lengthRatio > 0.7 && lengthRatio < 1.3) {
        return { cleaned, wasModified: true };
      }
    }
  } catch (error) {
    console.log(`Failed to clean ${sectionType}, using original`);
  }
  
  return { cleaned: text, wasModified: false };
}

function reassembleVCFeedback(sections: VCSection[]): string {
  let result = '';
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    result += `VC fund #${section.vcNumber} - ${section.vcName}\n`;
    result += `Evaluator: ${section.evaluatorName}\n\n`;
    
    // Strengths
    result += `Strengths of the startup:\n`;
    if (section.strengths.length > 0) {
      section.strengths.forEach(strength => {
        result += `• ${strength}\n`;
      });
    } else {
      result += `• No specific strengths provided\n`;
    }
    result += `\n`;
    
    // Improvements
    result += `Main areas that need improvement:\n`;
    result += section.improvements || 'No specific improvement areas provided';
    result += `\n\n`;
    
    // Pitch development
    result += `Aspects of the pitch that need further development:\n`;
    result += section.pitchDevelopment || 'No specific pitch development aspects provided';
    result += `\n\n`;
    
    // Focus areas
    result += `Key areas the team should focus on:\n`;
    result += section.focusAreas || 'No specific focus areas provided';
    result += `\n\n`;
    
    // Additional comments
    result += `Additional comments:\n`;
    result += section.additionalComments || 'No additional comments provided';
    
    // Add separator between VCs (except for last one)
    if (i < sections.length - 1) {
      result += `\n\n${'='.repeat(60)}\n\n`;
    }
  }
  
  return result;
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

    const { callGemini } = await import('../_shared/gemini-client.ts');

    console.log(`[Enhance Feedback] Starting structured enhancement for ${startupName}`);
    console.log(`[Enhance Feedback] Input length: ${feedbackSummary.length} chars`);

    // Parse the structured feedback
    const vcSections = parseVCFeedback(feedbackSummary);
    console.log(`[Enhance Feedback] Parsed ${vcSections.length} VC sections`);
    
    if (vcSections.length === 0) {
      console.log('[Enhance Feedback] No VC sections found, skipping enhancement');
      return new Response(
        JSON.stringify({ 
          success: true, 
          enhancedFeedback: feedbackSummary,
          skipped: true,
          skipReason: 'Unable to parse feedback structure'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean each subsection independently
    let totalCleaned = 0;
    let totalSkipped = 0;
    
    for (const section of vcSections) {
      console.log(`[Enhance Feedback] Processing VC fund #${section.vcNumber} - ${section.vcName}`);
      
      // Clean improvements section
      const improvementsResult = await cleanTextSection(
        section.improvements, 
        'improvement areas',
        callGemini
      );
      section.improvements = improvementsResult.cleaned;
      if (improvementsResult.wasModified) totalCleaned++;
      else totalSkipped++;
      
      // Clean pitch development section
      const pitchResult = await cleanTextSection(
        section.pitchDevelopment,
        'pitch development aspects',
        callGemini
      );
      section.pitchDevelopment = pitchResult.cleaned;
      if (pitchResult.wasModified) totalCleaned++;
      else totalSkipped++;
      
      // Clean focus areas section
      const focusResult = await cleanTextSection(
        section.focusAreas,
        'key focus areas',
        callGemini
      );
      section.focusAreas = focusResult.cleaned;
      if (focusResult.wasModified) totalCleaned++;
      else totalSkipped++;
      
      // Clean additional comments section
      const commentsResult = await cleanTextSection(
        section.additionalComments,
        'additional comments',
        callGemini
      );
      section.additionalComments = commentsResult.cleaned;
      if (commentsResult.wasModified) totalCleaned++;
      else totalSkipped++;
      
      // Note: We don't clean strengths since they're already bullet points
      // Note: We don't clean headers since they're already structured
    }

    // Reassemble the cleaned feedback
    const enhancedFeedback = reassembleVCFeedback(vcSections);
    
    console.log(`[Enhance Feedback] Completed: ${totalCleaned} sections cleaned, ${totalSkipped} sections preserved`);
    console.log(`[Enhance Feedback] Output length: ${enhancedFeedback.length} chars`);
    console.log(`[Enhance Feedback] Length change: ${feedbackSummary.length} → ${enhancedFeedback.length} (${(enhancedFeedback.length / feedbackSummary.length * 100).toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        enhancedFeedback,
        skipped: false,
        metadata: {
          startupName,
          roundName,
          originalLength: feedbackSummary.length,
          enhancedLength: enhancedFeedback.length,
          vcSectionsProcessed: vcSections.length,
          sectionsCleaned: totalCleaned,
          sectionsPreserved: totalSkipped,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Enhance Feedback] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

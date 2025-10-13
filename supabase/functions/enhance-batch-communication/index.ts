import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { communicationType, roundName, currentTemplate, startupIds } = await req.json();

    if (!communicationType || !roundName || !startupIds || !Array.isArray(startupIds)) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const evaluationTable = roundName === 'screening' ? 'screening_evaluations' : 'pitching_evaluations';

    // Limit to 50 most recent evaluations
    const { data: evaluations, error: evalError } = await supabase
      .from(evaluationTable)
      .select(`*, startups!inner(name, verticals)`)
      .in('startup_id', startupIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (evalError) throw evalError;
    if (!evaluations || evaluations.length === 0) {
      throw new Error('No evaluations found');
    }

    // Pre-aggregate data
    const scores: number[] = [];
    const strengths: string[] = [];
    const verticals = new Set<string>();

    evaluations.forEach((e: any) => {
      if (e.overall_score) scores.push(e.overall_score);
      if (e.strengths && Array.isArray(e.strengths)) strengths.push(...e.strengths);
      if (e.startups?.verticals) e.startups.verticals.forEach((v: string) => verticals.add(v));
    });

    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 'N/A';
    const strengthCounts: Record<string, number> = {};
    strengths.forEach(s => {
      const clean = s.trim().toLowerCase();
      strengthCounts[clean] = (strengthCounts[clean] || 0) + 1;
    });
    const topStrengths = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    // Fallback template
    const fallbackTemplate = {
      subject: `[Aurora] ${communicationType === 'selected' ? 'Next Steps' : 'Feedback'} - ${roundName}`,
      body: currentTemplate || `Dear [STARTUP_NAME],\n\nYour score: [SCORE]\n\nFeedback: [FEEDBACK_SUMMARY]\n\nBest regards,\nAurora Team`,
      aggregatedInsights: `${evaluations.length} evaluations processed`
    };

    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(JSON.stringify({ success: true, enhancedTemplate: fallbackTemplate, note: 'AI unavailable' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    try {
      const { callGemini } = await import('../_shared/gemini-client.ts');
      const systemPrompt = `Enhance email templates for startup feedback. Be professional, warm, and concise.`;
      const userPrompt = `Enhance this ${communicationType} email for ${startupIds.length} startups in ${roundName}.

Context: ${evaluations.length} evaluations, avg score ${avgScore}, top strengths: ${topStrengths.join(', ')}
Template: ${currentTemplate || '[No template]'}

Make it professional and ${communicationType === 'selected' ? 'celebratory' : 'constructive'}.
Include: [STARTUP_NAME], [FEEDBACK_SUMMARY], [SCORE]

Format:
Subject: [subject]
Body: [body]`;

      const response = await callGemini({ model: 'gemini-2.5-flash', systemPrompt, userPrompt, temperature: 0.7, maxTokens: 2000 });

      if (response.success && response.content) {
        const lines = response.content.split('\n');
        const subjectLine = lines.find(l => l.toLowerCase().includes('subject:'));
        const subject = subjectLine ? subjectLine.split(':').slice(1).join(':').trim() : fallbackTemplate.subject;
        const bodyStart = response.content.toLowerCase().indexOf('body:');
        const body = bodyStart !== -1 ? response.content.substring(bodyStart + 5).trim() : response.content;

        return new Response(JSON.stringify({ success: true, enhancedTemplate: { subject, body, aggregatedInsights: `${evaluations.length} evaluations` } }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } catch (aiError) {
      console.error('AI error:', aiError);
    }

    return new Response(JSON.stringify({ success: true, enhancedTemplate: fallbackTemplate, note: 'Using fallback' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { startupId, roundName, communicationType } = await req.json();

    console.log('[Preview Email] Generating preview for:', { startupId, roundName, communicationType });

    // Fetch startup details
    const { data: startup, error: startupError } = await supabaseClient
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .single();

    if (startupError) {
      throw new Error(`Failed to fetch startup: ${startupError.message}`);
    }

    // Fetch evaluations based on round
    let evaluations = [];
    if (roundName === 'screening') {
      const { data, error } = await supabaseClient
        .from('screening_evaluations')
        .select(`
          *,
          jurors:evaluator_id (
            name,
            company,
            job_title
          )
        `)
        .eq('startup_id', startupId)
        .eq('status', 'submitted');

      if (error) throw error;
      evaluations = data || [];
    } else if (roundName === 'pitching') {
      const { data, error } = await supabaseClient
        .from('pitching_evaluations')
        .select(`
          *,
          jurors:evaluator_id (
            name,
            company,
            job_title
          )
        `)
        .eq('startup_id', startupId)
        .eq('status', 'submitted');

      if (error) throw error;
      evaluations = data || [];
    }

    // Fetch email template
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('category', 'results-selected')
      .eq('is_active', true)
      .single();

    if (templateError) {
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    // Build VC feedback sections
    let vcFeedbackSections = '';
    
    evaluations.forEach((evaluation: any, index: number) => {
      const jurorName = evaluation.jurors?.name || 'Anonymous VC';
      const jurorCompany = evaluation.jurors?.company || '';
      
      vcFeedbackSections += `
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #2563eb;">
          <h3 style="color: #1e293b; margin-top: 0;">VC Fund #${index + 1}${jurorCompany ? ` - ${jurorCompany}` : ''}</h3>
          
          <div style="margin-bottom: 15px;">
            <strong style="color: #475569;">Strengths of the startup:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${(evaluation.strengths || []).map((strength: string) => `<li style="margin: 5px 0;">${strength}</li>`).join('')}
            </ul>
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong style="color: #475569;">Main areas that need improvement:</strong>
            <p style="margin: 5px 0;">${evaluation.improvement_areas || 'No specific areas identified'}</p>
          </div>
          
          ${evaluation.pitch_development_aspects ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Aspects of the pitch that need further development:</strong>
              <p style="margin: 5px 0;">${evaluation.pitch_development_aspects}</p>
            </div>
          ` : ''}
          
          ${evaluation.overall_notes ? `
            <div style="margin-bottom: 15px;">
              <strong style="color: #475569;">Key areas the team should focus on:</strong>
              <p style="margin: 5px 0;">${evaluation.overall_notes}</p>
            </div>
          ` : ''}
          
          ${evaluation.recommendation ? `
            <div>
              <strong style="color: #475569;">Additional comments:</strong>
              <p style="margin: 5px 0;">${evaluation.recommendation}</p>
            </div>
          ` : ''}
        </div>
      `;
    });

    // Generate subject and body
    const founderName = startup.founder_first_name || 'Founder';
    const startupName = startup.name || 'Your Startup';
    
    const subject = template.subject_template
      .replace(/\{\{founder_first_name\}\}/g, founderName)
      .replace(/\{\{startup_name\}\}/g, startupName);

    const body = template.body_template
      .replace(/\{\{founder_first_name\}\}/g, founderName)
      .replace(/\{\{startup_name\}\}/g, startupName)
      .replace(/\{\{vc_feedback_sections\}\}/g, vcFeedbackSections || '<p>No feedback sections available yet.</p>');

    // Create full HTML email
    const previewHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${body}
        </body>
      </html>
    `;

    console.log('[Preview Email] Successfully generated preview');

    return new Response(
      JSON.stringify({
        success: true,
        subject,
        body,
        preview_html: previewHtml,
        evaluation_count: evaluations.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Preview Email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

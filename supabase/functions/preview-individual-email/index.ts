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

    // Check for approved enhanced feedback first
    const { data: approvedFeedback, error: feedbackError } = await supabaseClient
      .from('startup_vc_feedback_details')
      .select('plain_text_feedback')
      .eq('startup_id', startupId)
      .eq('round_name', roundName)
      .eq('is_approved', true)
      .maybeSingle();

    if (feedbackError) {
      console.log('[Preview Email] Error fetching approved feedback:', feedbackError);
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

    // Map communication type to template category
    const templateCategoryMap: Record<string, string> = {
      'selected': 'founder_selection',
      'rejected': 'founder_rejection',
      'under-review': 'founder_under_review',
      'top-100-feedback': 'top-100-feedback'
    };
    
    const templateCategory = templateCategoryMap[communicationType] || 'founder_selection';
    console.log('[Preview Email] Using template category:', templateCategory);

    // Fetch email template
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('category', templateCategory)
      .eq('is_active', true)
      .single();

    if (templateError) {
      throw new Error(`Failed to fetch template: ${templateError.message}`);
    }

    // Build VC feedback sections - use approved enhanced feedback if available
    let vcFeedbackSections = '';
    
    if (approvedFeedback?.plain_text_feedback) {
      console.log('[Preview Email] Using approved enhanced feedback');
      
      // Smart parsing: handle headings, paragraphs, and bullets
      const lines = approvedFeedback.plain_text_feedback.split('\n');
      const htmlParts: string[] = [];
      let currentParagraph: string[] = [];
      let inBulletList = false;
      
      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          htmlParts.push(`<p style="margin: 10px 0; line-height: 1.6;">${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
      };
      
      const flushBulletList = () => {
        if (inBulletList) {
          htmlParts.push('</ul>');
          inBulletList = false;
        }
      };
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip the intro line "Here's the enhanced feedback..."
        if (trimmed.toLowerCase().includes("here's the enhanced feedback")) {
          continue;
        }
        
        // Blank line = paragraph/section break
        if (!trimmed) {
          flushParagraph();
          flushBulletList();
          continue;
        }
        
        // Heading: **Text** or **Text:**
        if (trimmed.startsWith('**') && (trimmed.endsWith('**') || trimmed.endsWith(':**'))) {
          flushParagraph();
          flushBulletList();
          const headingText = trimmed.replace(/\*\*/g, '').replace(/:$/, '');
          htmlParts.push(`<h3 style="color: #1e293b; margin-top: 20px; margin-bottom: 10px; font-weight: 600;">${headingText}${trimmed.endsWith(':**') ? ':' : ''}</h3>`);
          continue;
        }
        
        // Bullet point: *   text or - text
        if (trimmed.match(/^(\*\s{2,}|-\s)/)) {
          flushParagraph();
          if (!inBulletList) {
            htmlParts.push('<ul style="margin: 10px 0; padding-left: 25px;">');
            inBulletList = true;
          }
          const bulletText = trimmed.replace(/^(\*\s{2,}|-\s)/, '');
          htmlParts.push(`<li style="margin: 5px 0;">${bulletText}</li>`);
          continue;
        }
        
        // Regular text: accumulate into current paragraph
        flushBulletList();
        currentParagraph.push(trimmed);
      }
      
      // Flush any remaining content
      flushParagraph();
      flushBulletList();
      
      vcFeedbackSections = `
        <div style="margin-bottom: 30px; padding: 25px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
          ${htmlParts.join('\n')}
        </div>
      `;
    } else {
      // Build from raw evaluations
      console.log('[Preview Email] Building feedback from raw evaluations');
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
    }

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

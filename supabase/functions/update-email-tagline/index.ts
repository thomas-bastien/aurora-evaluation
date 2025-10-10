import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OLD_TAGLINE = 'Excellence in Innovation';
const NEW_TAGLINE = 'Backing the boldest female tech founders in emerging markets';

interface UpdateCounts {
  email_templates: number;
  custom_emails_body: number;
  custom_emails_preview: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));

    console.log(`[Update Email Tagline] Starting ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);

    const counts: UpdateCounts = {
      email_templates: 0,
      custom_emails_body: 0,
      custom_emails_preview: 0,
    };

    // 1. Update email_templates.body_template
    console.log('[Update Email Tagline] Updating email_templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select('id, body_template')
      .ilike('body_template', `%${OLD_TAGLINE}%`);

    if (templatesError) {
      console.error('[Update Email Tagline] Error fetching templates:', templatesError);
      throw templatesError;
    }

    if (templates && templates.length > 0) {
      console.log(`[Update Email Tagline] Found ${templates.length} templates to update`);
      
      if (!dryRun) {
        for (const template of templates) {
          const updatedBody = template.body_template.replaceAll(OLD_TAGLINE, NEW_TAGLINE);
          const { error: updateError } = await supabase
            .from('email_templates')
            .update({ body_template: updatedBody })
            .eq('id', template.id);

          if (updateError) {
            console.error(`[Update Email Tagline] Error updating template ${template.id}:`, updateError);
          } else {
            counts.email_templates++;
          }
        }
      } else {
        counts.email_templates = templates.length;
      }
    }

    // 2. Update startup_custom_emails.custom_body
    console.log('[Update Email Tagline] Updating startup_custom_emails.custom_body...');
    const { data: customBodies, error: bodiesError } = await supabase
      .from('startup_custom_emails')
      .select('id, custom_body')
      .not('custom_body', 'is', null)
      .ilike('custom_body', `%${OLD_TAGLINE}%`);

    if (bodiesError) {
      console.error('[Update Email Tagline] Error fetching custom bodies:', bodiesError);
      throw bodiesError;
    }

    if (customBodies && customBodies.length > 0) {
      console.log(`[Update Email Tagline] Found ${customBodies.length} custom bodies to update`);
      
      if (!dryRun) {
        for (const record of customBodies) {
          const updatedBody = record.custom_body.replaceAll(OLD_TAGLINE, NEW_TAGLINE);
          const { error: updateError } = await supabase
            .from('startup_custom_emails')
            .update({ custom_body: updatedBody })
            .eq('id', record.id);

          if (updateError) {
            console.error(`[Update Email Tagline] Error updating custom body ${record.id}:`, updateError);
          } else {
            counts.custom_emails_body++;
          }
        }
      } else {
        counts.custom_emails_body = customBodies.length;
      }
    }

    // 3. Update startup_custom_emails.preview_html
    console.log('[Update Email Tagline] Updating startup_custom_emails.preview_html...');
    const { data: previews, error: previewsError } = await supabase
      .from('startup_custom_emails')
      .select('id, preview_html')
      .not('preview_html', 'is', null)
      .ilike('preview_html', `%${OLD_TAGLINE}%`);

    if (previewsError) {
      console.error('[Update Email Tagline] Error fetching previews:', previewsError);
      throw previewsError;
    }

    if (previews && previews.length > 0) {
      console.log(`[Update Email Tagline] Found ${previews.length} preview HTMLs to update`);
      
      if (!dryRun) {
        for (const record of previews) {
          const updatedPreview = record.preview_html.replaceAll(OLD_TAGLINE, NEW_TAGLINE);
          const { error: updateError } = await supabase
            .from('startup_custom_emails')
            .update({ preview_html: updatedPreview })
            .eq('id', record.id);

          if (updateError) {
            console.error(`[Update Email Tagline] Error updating preview ${record.id}:`, updateError);
          } else {
            counts.custom_emails_preview++;
          }
        }
      } else {
        counts.custom_emails_preview = previews.length;
      }
    }

    console.log('[Update Email Tagline] Update complete:', counts);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        message: dryRun ? 'Dry run completed - no changes made' : 'Tagline updated successfully',
        counts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Update Email Tagline] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);

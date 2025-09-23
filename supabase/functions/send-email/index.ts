import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  templateId?: string;
  templateCategory?: string;
  recipientEmail: string;
  recipientType: 'juror' | 'startup' | 'admin';
  recipientId?: string;
  variables?: Record<string, any>;
  subject?: string;
  body?: string;
  preventDuplicates?: boolean;
}

interface EmailTemplate {
  id: string;
  subject_template: string;
  body_template: string;
  variables: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SendEmailRequest = await req.json();
    console.log("Processing email request:", { 
      templateId: requestData.templateId,
      templateCategory: requestData.templateCategory,
      recipientEmail: requestData.recipientEmail,
      recipientType: requestData.recipientType
    });

    let template: EmailTemplate | null = null;
    let subject = requestData.subject || "";
    let body = requestData.body || "";

    // Get template if specified
    if (requestData.templateId || requestData.templateCategory) {
      const templateQuery = requestData.templateId 
        ? supabase.from('email_templates').select('*').eq('id', requestData.templateId).eq('is_active', true)
        : supabase.from('email_templates').select('*').eq('category', requestData.templateCategory).eq('is_active', true).order('created_at', { ascending: false }).limit(1);

      const { data: templateData, error: templateError } = await templateQuery.single();
      
      if (templateError) {
        console.error("Template fetch error:", templateError);
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      template = templateData;
      subject = template.subject_template;
      body = template.body_template;
    }

    // Apply variable substitution
    if (requestData.variables && Object.keys(requestData.variables).length > 0) {
      for (const [key, value] of Object.entries(requestData.variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    // Generate content hash for duplicate prevention
    const contentString = `${requestData.recipientEmail}:${subject}:${body}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await createHash("md5").update(data).digest();
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for duplicates if enabled
    if (requestData.preventDuplicates !== false) {
      const { data: existing, error: duplicateError } = await supabase
        .from('email_communications')
        .select('id, created_at')
        .eq('content_hash', contentHash)
        .eq('recipient_email', requestData.recipientEmail)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .single();

      if (existing && !duplicateError) {
        console.log("Duplicate email prevented:", existing.id);
        return new Response(JSON.stringify({ 
          message: "Email not sent - duplicate detected",
          duplicateId: existing.id 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Create email communication record
    const { data: communication, error: commError } = await supabase
      .from('email_communications')
      .insert({
        template_id: template?.id,
        recipient_email: requestData.recipientEmail,
        recipient_type: requestData.recipientType,
        recipient_id: requestData.recipientId,
        subject,
        body,
        content_hash: contentHash,
        status: 'pending',
        metadata: {
          template_category: requestData.templateCategory,
          variables: requestData.variables
        }
      })
      .select()
      .single();

    if (commError) {
      console.error("Error creating communication record:", commError);
      return new Response(JSON.stringify({ error: "Failed to create communication record" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email via Resend
    try {
      const emailResponse = await resend.emails.send({
        from: "Aurora Tech Awards <noreply@resend.dev>",
        to: [requestData.recipientEmail],
        subject,
        html: body,
      });

      console.log("Email sent successfully via Resend:", emailResponse);

      // Update communication record with Resend ID and status
      await supabase
        .from('email_communications')
        .update({
          resend_email_id: emailResponse.data?.id,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', communication.id);

      // Create delivery event
      await supabase
        .from('email_delivery_events')
        .insert({
          communication_id: communication.id,
          event_type: 'sent',
          resend_event_id: emailResponse.data?.id,
          raw_payload: { resend_response: emailResponse }
        });

      return new Response(JSON.stringify({
        success: true,
        communicationId: communication.id,
        resendId: emailResponse.data?.id,
        message: "Email sent successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (resendError) {
      console.error("Resend API error:", resendError);
      
      // Update communication record with error
      await supabase
        .from('email_communications')
        .update({
          status: 'failed',
          error_message: resendError.message || 'Unknown Resend error'
        })
        .eq('id', communication.id);

      return new Response(JSON.stringify({ 
        error: "Failed to send email",
        details: resendError.message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
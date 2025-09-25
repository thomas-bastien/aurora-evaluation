import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
// Using Web Crypto API for hash generation

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test mode configuration from environment
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
const TEST_EMAIL = "delivered@resend.dev";

// Get appropriate "From" address based on mode
const getFromAddress = (): string => {
  if (TEST_MODE) {
    return Deno.env.get("RESEND_FROM_SANDBOX") || "Aurora Evaluation <onboarding@resend.dev>";
  }
  const prodFrom = Deno.env.get("RESEND_FROM");
  if (!prodFrom) {
    console.error("RESEND_FROM not configured for production mode");
    throw new Error("RESEND_FROM must be set for production email sending");
  }
  return prodFrom;
};

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
        console.log("Using fallback template for category:", requestData.templateCategory);
        
        // Use fallback template instead of returning error
        const fallback = getDefaultContentByCategory(requestData.templateCategory);
        subject = fallback.subject;
        body = fallback.body;
      } else {
        const templateLocal = templateData as EmailTemplate;
        template = templateLocal;
        subject = templateLocal.subject_template;
        body = templateLocal.body_template;
      }

    }

    // Apply variable substitution
    if (requestData.variables && Object.keys(requestData.variables).length > 0) {
      for (const [key, value] of Object.entries(requestData.variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    // Generate content hash for duplicate prevention using Web Crypto API
    const contentString = `${requestData.recipientEmail}:${subject}:${body}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for duplicates if enabled (disabled in TEST_MODE)
    if (requestData.preventDuplicates !== false && !TEST_MODE) {
      const { data: existing, error: duplicateError } = await supabase
        .from('email_communications')
        .select('id, created_at')
        .eq('content_hash', contentHash)
        .eq('recipient_email', requestData.recipientEmail)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
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
      // Determine actual recipient (redirect in test mode)
      const actualRecipient = TEST_MODE ? TEST_EMAIL : requestData.recipientEmail;

      if (TEST_MODE) {
        console.log(`🧪 SANDBOX MODE: Redirecting email from ${requestData.recipientEmail} to ${TEST_EMAIL}`);
      }

      const fromAddress = getFromAddress();
      console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Recipient=${actualRecipient}`);

      const emailResponse = await resend.emails.send({
        from: fromAddress,
        to: [actualRecipient],
        subject: TEST_MODE ? `[SANDBOX] ${subject}` : subject,
        html: TEST_MODE ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
            <strong>🧪 SANDBOX MODE:</strong> This email would normally be sent to: <strong>${requestData.recipientEmail}</strong>
          </div>
          ${body}
        ` : body,
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

    } catch (resendError: any) {
      console.error("Resend API error:", resendError);
      const errMsg = (resendError && resendError.message) ? resendError.message : 'Unknown Resend error';
      
      // Update communication record with error
      await supabase
        .from('email_communications')
        .update({
          status: 'failed',
          error_message: errMsg
        })
        .eq('id', communication.id);

      return new Response(JSON.stringify({ 
        error: "Failed to send email",
        details: errMsg
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

// Default content by category when templates are missing
const getDefaultContentByCategory = (category?: string) => {
  const defaults = {
    'juror_invitation': {
      subject: 'You\'re invited to evaluate startups',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>You're Invited to Evaluate Startups</h1>
          <p>Dear {{juror_name}},</p>
          <p>You've been invited to participate as an evaluator in our startup evaluation process.</p>
          <p><a href="{{magic_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Get Started</a></p>
          <p>This invitation expires on {{expiry_date}}.</p>
        </div>
      `
    },
    'assignment-notification': {
      subject: 'New startup assignments available',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>New Assignments Available</h1>
          <p>Dear {{juror_name}},</p>
          <p>You have new assignments for the {{round_name}} round.</p>
          <p>Please log in to view your assignments.</p>
        </div>
      `
    },
    'juror-reminder': {
      subject: 'Reminder: Complete your evaluations',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Reminder: Complete Your Evaluations</h1>
          <p>Dear {{juror_name}},</p>
          <p>You have {{pending_count}} pending evaluations for the {{round_name}} round.</p>
          <p>Current completion rate: {{completion_rate}}%</p>
          <p><a href="{{login_link}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Evaluations</a></p>
        </div>
      `
    }
  };
  
  return defaults[category as keyof typeof defaults] || {
    subject: 'Notification from Aurora Evaluation',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Notification</h1>
        <p>You have a notification from the Aurora Evaluation platform.</p>
      </div>
    `
  };
};

serve(handler);
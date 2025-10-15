import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

interface ScreeningResultsRequest {
  startupId: string;
  name: string;
  email: string;
  isSelected: boolean;
  feedbackSummary: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('send-screening-results function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupId, name, email, isSelected, feedbackSummary }: ScreeningResultsRequest = await req.json();
    
    console.log(`Sending screening results to: ${name} (${email}), selected: ${isSelected}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which template to use based on selection status
    const templateDisplayOrder = isSelected ? 16 : 17;

    // Fetch template by display_order; fallback by category
    let template: any = null;
    let templateError: any = null;
    const primary = await supabase
      .from('email_templates')
      .select('*')
      .eq('display_order', templateDisplayOrder)
      .eq('is_active', true)
      .maybeSingle();

    if (!primary.error && primary.data) {
      template = primary.data;
    } else {
      const category = isSelected ? 'founder_selection' : 'founder_rejection';
      const fallback = await supabase
        .from('email_templates')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      templateError = primary.error || fallback.error;
      template = fallback.data || null;
    }

    if (!template) {
      console.error('Failed to find screening results template. Tip: run ensure-email-templates function to seed required templates.', templateError);
      throw new Error('Email template not found');
    }

    // Substitute variables in template
    let subject = template.subject_template;
    let htmlContent = template.body_template
      .replace(/\{\{startup_name\}\}/g, name)
      .replace(/\{\{feedback_summary\}\}/g, feedbackSummary);

    // Determine recipient based on test mode
    const actualRecipient = TEST_MODE ? TEST_EMAIL : email;
    const fromAddress = getFromAddress();
    
    console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Original recipient=${email}, Actual recipient=${actualRecipient}`);
    
    if (TEST_MODE) {
      console.log(`🧪 SANDBOX MODE: Redirecting email from ${email} to ${TEST_EMAIL}`);
    }

    // ✅ PHASE 1: Create communication record for tracking
    const communicationType = isSelected ? 'selection' : 'rejection';
    
    // Generate content hash using Web Crypto API
    const contentString = `${email}:${subject}:screening:${communicationType}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: communication, error: commError } = await supabase
      .from('email_communications')
      .insert({
        template_id: template.id, // ✅ Now logging template ID
        recipient_email: email,
        recipient_type: 'startup',
        recipient_id: startupId,
        subject,
        body: htmlContent,
        content_hash: contentHash,
        round_name: 'screening',
        communication_type: communicationType,
        status: 'pending',
        metadata: {
          template_category: isSelected ? 'founder_selection' : 'founder_rejection',
          startup_name: name,
          test_mode: TEST_MODE,
          original_recipient: TEST_MODE ? email : null,
          sandbox_recipient: TEST_MODE ? actualRecipient : null
        }
      })
      .select()
      .single();

    if (commError) {
      console.error('Error creating communication record:', commError);
      throw new Error('Failed to create communication record');
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [actualRecipient],
      subject: TEST_MODE ? `[SANDBOX] ${subject}` : subject,
      html: TEST_MODE ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
          <strong>🧪 SANDBOX MODE:</strong> This email would normally be sent to: <strong>${email}</strong>
        </div>
        ${htmlContent}
      ` : htmlContent,
    });

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      
      // Update communication record with error
      await supabase
        .from('email_communications')
        .update({
          status: 'failed',
          error_message: `Resend API error: ${emailResponse.error.message || 'Unknown error'}`
        })
        .eq('id', communication.id);
      
      throw new Error(`Email send failed: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse);

    // Update communication record with success status
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

    // Update startup status if selected
    if (isSelected) {
      const { error: updateError } = await supabase
        .from('startups')
        .update({ status: 'shortlisted' })
        .eq('id', startupId);

      if (updateError) {
        console.error('Error updating startup status:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      communicationId: communication.id,
      message: `Screening results sent to ${name}`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-screening-results function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
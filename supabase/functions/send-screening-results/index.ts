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
    const templateDisplayOrder = isSelected ? 16 : 17; // Template #23 or #24

    // Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('display_order', templateDisplayOrder)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Failed to fetch screening results template:', templateError);
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
      throw new Error(`Email send failed: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse);

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
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

interface JurorTransitionRequest {
  jurorId: string;
  name: string;
  email: string;
  fromRound: 'screening' | 'pitching';
  toRound: 'screening' | 'pitching';
  evaluationCount?: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('send-juror-phase-transition function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jurorId, name, email, fromRound, toRound, evaluationCount }: JurorTransitionRequest = await req.json();
    
    console.log(`Sending round transition notification to: ${name} (${email}), from ${fromRound} to ${toRound}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine which template to use based on transition type
    let templateDisplayOrder: number;
    if (fromRound === 'screening' && toRound === 'pitching') {
      templateDisplayOrder = 14; // Template #21: Screening Complete
    } else {
      templateDisplayOrder = 15; // Template #22: Generic Transition
    }

    // Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('display_order', templateDisplayOrder)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Failed to fetch juror phase transition template:', templateError);
      throw new Error('Email template not found');
    }

    const actualRecipient = TEST_MODE ? TEST_EMAIL : email;
    const fromAddress = getFromAddress();
    
    console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Original recipient=${email}, Actual recipient=${actualRecipient}`);
    
    if (TEST_MODE) {
      console.log(`🧪 SANDBOX MODE: Redirecting email from ${email} to ${TEST_EMAIL}`);
    }

    // Substitute variables in template
    const subject = template.subject_template
      .replace(/\{\{from_round\}\}/g, fromRound)
      .replace(/\{\{to_round\}\}/g, toRound);
    
    const htmlContent = template.body_template
      .replace(/\{\{juror_name\}\}/g, name)
      .replace(/\{\{evaluation_count\}\}/g, evaluationCount?.toString() || '0')
      .replace(/\{\{from_round\}\}/g, fromRound)
      .replace(/\{\{to_round\}\}/g, toRound);

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

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      message: `Round transition notification sent to ${name}`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-juror-phase-transition function:", error);
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
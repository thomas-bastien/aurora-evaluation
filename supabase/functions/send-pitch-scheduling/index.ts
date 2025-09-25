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

interface PitchSchedulingRequest {
  startupId: string;
  startupName: string;
  startupEmail: string;
  assignedJurors: Array<{
    id: string;
    name: string;
    email: string;
    company: string;
    calendlyLink: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('send-pitch-scheduling function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupId, startupName, startupEmail, assignedJurors }: PitchSchedulingRequest = await req.json();
    
    console.log(`Sending pitch scheduling email to: ${startupName} (${startupEmail}) with ${assignedJurors.length} jurors`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate juror list HTML
    const jurorListHtml = assignedJurors.map(juror => `
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <h4 style="margin: 0 0 8px 0; color: #1e40af;">${juror.name}</h4>
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">${juror.company}</p>
        <p style="margin: 0 0 12px 0; font-size: 14px;">
          <strong>Email:</strong> ${juror.email}
        </p>
        <a href="${juror.calendlyLink}" 
           style="display: inline-block; background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
          📅 Schedule with ${juror.name.split(' ')[0]}
        </a>
      </div>
    `).join('');

    // Determine recipients based on test mode
    const actualRecipient = TEST_MODE ? TEST_EMAIL : startupEmail;
    const ccEmails = TEST_MODE ? [] : assignedJurors.map(juror => juror.email);
    const fromAddress = getFromAddress();
    
    console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Original recipient=${startupEmail}, Actual recipient=${actualRecipient}`);
    
    if (TEST_MODE) {
      console.log(`🧪 SANDBOX MODE: Redirecting email from ${startupEmail} to ${TEST_EMAIL}, CC disabled`);
    }

    const subject = "🚀 Time to Schedule Your Pitch Sessions!";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Ready for Your Pitch Sessions!</h1>
        
        <p>Dear ${startupName} team,</p>
        
        <p>Congratulations again on making it to the <strong>Pitching Round</strong>! It's time to schedule your pitch sessions with our investor panel.</p>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Your Assigned Investors:</h3>
          <p style="margin-bottom: 15px;">You have been assigned <strong>${assignedJurors.length} investors</strong> for your pitch sessions. Please schedule a call with each investor using their individual calendar links below:</p>
          ${jurorListHtml}
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Pitch Session Guidelines:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Duration:</strong> 15-20 minutes total (10 min pitch + 5-10 min Q&A)</li>
            <li><strong>Format:</strong> Video call (link provided by each investor)</li>
            <li><strong>Preparation:</strong> Have your pitch deck ready and test your audio/video</li>
            <li><strong>Follow-up:</strong> Investors may request additional materials after the call</li>
          </ul>
        </div>
        
        <div style="background-color: #fee2e2; padding: 20px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc2626;">Important Reminders:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Schedule promptly:</strong> Please book your sessions within the next 2-3 days</li>
            <li><strong>Professional setup:</strong> Ensure good lighting, audio, and minimal distractions</li>
            <li><strong>Be punctual:</strong> Join calls 2-3 minutes early</li>
            <li><strong>Questions?</strong> Reply to this email if you need any assistance</li>
          </ul>
        </div>
        
        <p>Best of luck with your pitches! We're excited to see what you'll present.</p>
        
        <p>Best regards,<br>
        <strong>The Aurora Evaluation Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af;">
          This email has been sent to the assigned investors as well for coordination purposes.
        </p>
      </div>
    `;

    // Send email to startup with CC to all assigned jurors
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [actualRecipient],
      cc: ccEmails,
      subject: TEST_MODE ? `[SANDBOX] ${subject}` : subject,
      html: TEST_MODE ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
          <strong>🧪 SANDBOX MODE:</strong> This email would normally be sent to: <strong>${startupEmail}</strong> with CC to: <strong>${assignedJurors.map(j => j.email).join(', ')}</strong>
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
      message: `Pitch scheduling email sent to ${startupName}`,
      ccRecipients: ccEmails.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-pitch-scheduling function:", error);
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
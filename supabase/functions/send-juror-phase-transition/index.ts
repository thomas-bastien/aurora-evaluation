import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    let subject: string;
    let htmlContent: string;

    if (fromRound === 'screening' && toRound === 'pitching') {
      // Screening complete, transitioning to pitching
      subject = "Screening Complete - Pitching Round Assignments Coming Soon";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Screening Round Complete!</h1>
          
          <p>Dear ${name},</p>
          
          <p>Thank you for your valuable participation as an evaluator in the <strong>Screening Round</strong> of our startup evaluation process.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Your Contribution:</h3>
            <ul>
              <li>You completed evaluations for <strong>${evaluationCount || 'multiple'}</strong> startups</li>
              <li>Your insights helped us identify the finalists</li>
              <li>The Pitching Round is now beginning</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #92400e;">What's Next - Pitching Round:</h3>
            <ul>
              <li><strong>You will be assigned 2–3 finalists</strong> for pitch calls in the coming days</li>
              <li>Once assignments are ready, you'll receive full instructions and startup details</li>
              <li>Each pitch session will be 15-20 minutes (10 min pitch + Q&A)</li>
              <li>You'll evaluate startups based on their live presentations</li>
            </ul>
          </div>
          
          <p><strong>No action required right now.</strong> Simply wait for your pitch assignments and scheduling details.</p>
          
          <p>Thank you again for your expertise and time. The startup community benefits greatly from your involvement!</p>
          
          <p>Best regards,<br>
          <strong>The Aurora Evaluation Team</strong></p>
        </div>
      `;
    } else {
      // Generic transition message
      subject = `Round Transition: ${fromRound} → ${toRound}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Round Transition Update</h1>
          
          <p>Dear ${name},</p>
          
          <p>The evaluation process is transitioning from <strong>${fromRound}</strong> to <strong>${toRound}</strong> round.</p>
          
          <p>You will receive detailed instructions for the next round shortly.</p>
          
          <p>Best regards,<br>
          <strong>The Aurora Evaluation Team</strong></p>
        </div>
      `;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Aurora Evaluation <noreply@aurora.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
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
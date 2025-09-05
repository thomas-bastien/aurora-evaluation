import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Prepare email content based on selection status
    let subject: string;
    let htmlContent: string;

    if (isSelected) {
      // Selected startups email - congratulations but no scheduling yet
      subject = "🎉 Congratulations! You've been selected for the Pitching Round";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Congratulations, ${name}!</h1>
          
          <p>We're thrilled to inform you that your startup has been selected as a <strong>finalist</strong> for the Pitching Round of our evaluation process.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">What happens next?</h3>
            <ul>
              <li><strong>In the coming days</strong>, you will receive emails to schedule calls with 2–3 investors (jurors)</li>
              <li>Each call will be an opportunity to pitch your startup directly</li>
              <li>You'll receive detailed instructions and investor profiles before scheduling</li>
            </ul>
          </div>
          
          <p><strong>Please note:</strong> No action is required from you at this time. Simply wait for the scheduling emails which will include calendar links and further instructions.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Your Evaluation Feedback:</h4>
            <div style="white-space: pre-line; font-size: 14px; line-height: 1.6;">${feedbackSummary}</div>
          </div>
          
          <p>Congratulations again on this achievement. We look forward to your pitches!</p>
          
          <p>Best regards,<br>
          <strong>The Aurora Evaluation Team</strong></p>
        </div>
      `;
    } else {
      // Non-selected startups email - rejection with feedback
      subject = "Thank you for participating in our evaluation process";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #374151;">Thank you for your participation</h1>
          
          <p>Thank you for participating in the Screening Round of our startup evaluation process. While your startup was not selected to advance to the Pitching Round, we were impressed by your dedication and innovation.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Your Detailed Feedback:</h3>
            <div style="white-space: pre-line; font-size: 14px; line-height: 1.6;">${feedbackSummary}</div>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0;"><strong>Keep Building!</strong> We encourage you to continue developing your business and consider applying to future programs. The feedback above can help guide your next steps.</p>
          </div>
          
          <p>Thank you again for your time and effort. We wish you all the best in your entrepreneurial journey.</p>
          
          <p>Best regards,<br>
          <strong>The Aurora Evaluation Team</strong></p>
        </div>
      `;
    }

    // Send email using Resend (using dummy email for testing)
    const emailResponse = await resend.emails.send({
      from: "Aurora Evaluation <noreply@aurora.dev>",
      to: ["lucien98@gmail.com"], // Using dummy email for testing
      subject: subject,
      html: htmlContent,
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
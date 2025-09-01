import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JurorReminderRequest {
  jurorId: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Processing juror reminder request');
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jurorId, email }: JurorReminderRequest = await req.json();
    console.log('Sending reminder to juror:', { jurorId, email });

    // Fetch juror details
    const { data: juror, error: jurorError } = await supabase
      .from('jurors')
      .select('name, email, company, job_title')
      .eq('id', jurorId)
      .single();

    if (jurorError) {
      console.error('Error fetching juror:', jurorError);
      throw new Error('Juror not found');
    }

    console.log('Fetched juror details:', juror);

    // Get assignment count for context
    const { data: assignments, error: assignmentError } = await supabase
      .from('startup_assignments')
      .select('id')
      .eq('juror_id', jurorId);

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError);
    }

    const assignmentCount = assignments?.length || 0;

    // Send reminder email
    const emailResponse = await resend.emails.send({
      from: "Aurora Evaluation Platform <onboarding@resend.dev>",
      to: ["lucien98@gmail.com"], // Test email as requested
      subject: "🚀 Aurora Evaluation Platform - Reminder: Complete Your Startup Evaluations",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Aurora Evaluation Platform</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Reminder: Complete Your Evaluations</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Hi ${juror.name || 'there'},</h2>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              We hope this email finds you well! This is a friendly reminder that you have startup evaluations pending completion on the Aurora Evaluation Platform.
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Evaluation Status</h3>
              <p style="color: #666; margin: 5px 0;"><strong>Assigned Evaluations:</strong> ${assignmentCount}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Your Role:</strong> ${juror.job_title || 'Evaluator'} ${juror.company ? `at ${juror.company}` : ''}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 16px;">
              Your expertise and insights are crucial to helping us identify the most promising startups. Please log in to the platform to complete your pending evaluations at your earliest convenience.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://fadxytngwiporjqchsem.supabase.co'}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Complete Evaluations Now
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px; line-height: 1.5;">
              If you have any questions or need assistance, please don't hesitate to reach out to our team. Thank you for your valuable contribution to the Aurora evaluation process!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            
            <p style="color: #aaa; font-size: 12px; text-align: center;">
              Aurora Evaluation Platform<br>
              This is an automated reminder. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Reminder sent successfully',
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-juror-reminder function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send reminder',
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
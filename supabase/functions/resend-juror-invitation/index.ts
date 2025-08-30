import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jurorId, token } = await req.json();
    
    console.log(`Resending invitation for juror ID: ${jurorId}, token: ${token}`);

    // Get the juror record using either ID or token
    let query = supabase
      .from('jurors')
      .select('*');
      
    if (jurorId) {
      query = query.eq('id', jurorId);
    } else if (token) {
      query = query.eq('invitation_token', token);
    } else {
      throw new Error('Either jurorId or token must be provided');
    }

    const { data: jurorData, error: jurorError } = await query.single();

    if (jurorError || !jurorData) {
      console.error("Error fetching juror:", jurorError);
      throw new Error("Juror not found");
    }

    // Update invitation timestamps with new expiration
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days expiration

    await supabase
      .from('jurors')
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: expirationDate.toISOString()
      })
      .eq('id', jurorData.id);

    // Create magic link URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const magicLinkUrl = `${supabaseUrl}/functions/v1/authenticate-juror?token=${jurorData.invitation_token}`;

    // For testing, always send to lucien98@gmail.com
    const testEmail = "lucien98@gmail.com";

    const emailResponse = await resend.emails.send({
      from: "Aurora Evaluation Platform <onboarding@resend.dev>",
      to: [testEmail],
      subject: "🔄 Renewed Invitation to Join Aurora Evaluation Panel",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Aurora Evaluation Platform</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Renewed Invitation</p>
          </div>
          
          <div style="padding: 0 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${jurorData.name},</h2>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404;">
                <strong>⏰ Your invitation link has been renewed!</strong><br>
                We've extended your invitation for another 7 days.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your invitation to join the Aurora evaluation panel is still waiting for you. We value your expertise and would love to have you participate in our startup evaluation process.
            </p>
            
            ${jurorData.company || jurorData.job_title ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-top: 0;">Your Profile</h3>
                ${jurorData.job_title ? `<p style="margin: 5px 0; color: #666;"><strong>Position:</strong> ${jurorData.job_title}</p>` : ''}
                ${jurorData.company ? `<p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${jurorData.company}</p>` : ''}
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                Join Platform Now
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 10px;">
                One-click access • Link expires in 7 days
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              If you have any questions about this invitation or the evaluation process, please don't hesitate to reach out to our team.
            </p>
            
            <div style="text-align: center; padding: 20px 0;">
              <p style="color: #999; font-size: 14px;">
                This email was sent to: ${jurorData.email}<br>
                (For testing purposes, delivered to: ${testEmail})
              </p>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2024 Aurora Evaluation Platform. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Renewed invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation renewed and sent successfully",
      emailId: emailResponse.data?.id,
      sentTo: testEmail,
      originalRecipient: jurorData.email,
      expiresAt: expirationDate.toISOString()
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in resend-juror-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
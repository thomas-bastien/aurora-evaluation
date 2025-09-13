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

interface JurorInvitationRequest {
  jurorName: string;
  jurorEmail: string;
  company?: string;
  jobTitle?: string;
  preferredRegions?: string[];
  targetVerticals?: string[];
  preferredStages?: string[];
  linkedinUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      jurorName, 
      jurorEmail, 
      company, 
      jobTitle,
      preferredRegions,
      targetVerticals,
      preferredStages,
      linkedinUrl
    }: JurorInvitationRequest = await req.json();

    console.log(`Sending invitation to juror: ${jurorName} (${jurorEmail})`);

    // Get or create the juror record and generate invitation token
    const { data: jurorData, error: jurorError } = await supabase
      .from('jurors')
      .select('invitation_token')
      .eq('email', jurorEmail)
      .single();

    if (jurorError) {
      console.error("Error fetching juror:", jurorError);
      throw new Error("Failed to process invitation");
    }

    // Update invitation timestamps and preference fields
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // 7 days expiration

    const updateData: any = {
      invitation_sent_at: new Date().toISOString(),
      invitation_expires_at: expirationDate.toISOString()
    };

    // Include preference fields if provided
    if (preferredRegions !== undefined) updateData.preferred_regions = preferredRegions;
    if (targetVerticals !== undefined) updateData.target_verticals = targetVerticals;
    if (preferredStages !== undefined) updateData.preferred_stages = preferredStages;
    if (linkedinUrl !== undefined) updateData.linkedin_url = linkedinUrl;

    await supabase
      .from('jurors')
      .update(updateData)
      .eq('email', jurorEmail);

    // Create magic link URL pointing to the authentication edge function
    const frontendUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin');
    const baseUrl = frontendUrl?.replace(/\/$/, '') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const magicLinkUrl = `${supabaseUrl}/functions/v1/authenticate-juror?token=${jurorData.invitation_token}`;

    // For testing, always send to lucien98@gmail.com
    const testEmail = "lucien98@gmail.com";

    const emailResponse = await resend.emails.send({
      from: "Aurora Evaluation Platform <onboarding@resend.dev>",
      to: [testEmail], // Always send to test email for now
      subject: "Invitation to Join Aurora Evaluation Panel",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Aurora Evaluation Platform</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Invitation to Join Our Evaluation Panel</p>
          </div>
          
          <div style="padding: 0 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${jurorName},</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              You have been invited to join the Aurora evaluation panel as a juror. We value your expertise and would love to have you participate in our startup evaluation process.
            </p>
            
            ${company || jobTitle ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #333; margin-top: 0;">Your Profile</h3>
                ${jobTitle ? `<p style="margin: 5px 0; color: #666;"><strong>Position:</strong> ${jobTitle}</p>` : ''}
                ${company ? `<p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${company}</p>` : ''}
              </div>
            ` : ''}
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2; margin-top: 0;">What's Next?</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Click the access link below to join the platform instantly</li>
                <li>Complete your profile and add optional details</li>
                <li>Access the evaluation platform to review assigned startups</li>
                <li>Complete evaluations using our structured scoring system</li>
                <li>Participate in pitch sessions with selected startups</li>
              </ul>
            </div>
            
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
                This email was sent to: ${jurorEmail}<br>
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

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent successfully",
      emailId: emailResponse.data?.id,
      sentTo: testEmail,
      originalRecipient: jurorEmail
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-juror-invitation function:", error);
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
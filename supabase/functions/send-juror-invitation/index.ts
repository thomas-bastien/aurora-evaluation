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

    // Use centralized email service
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        templateCategory: 'juror_invitation',
        recipientEmail: jurorEmail,
        recipientType: 'juror',
        recipientId: undefined, // Will be set after finding the juror
        variables: {
          juror_name: jurorName,
          magic_link: magicLinkUrl,
          expiry_date: expirationDate.toDateString(),
          company: company || '',
          job_title: jobTitle || ''
        },
        preventDuplicates: true
      }
    });

    if (emailResponse.error) {
      console.error('Failed to send invitation email:', emailResponse.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to send invitation email',
        details: emailResponse.error 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Email sent successfully via centralized service:', emailResponse.data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent successfully",
      emailResponse: emailResponse.data,
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
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

  // Validate required environment variables
  const requiredSecrets = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
  for (const secret of requiredSecrets) {
    if (!Deno.env.get(secret)) {
      console.error(`Missing required secret: ${secret}`);
      return new Response(JSON.stringify({ 
        error: `Server configuration error: Missing ${secret}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
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

    console.log(`Processing invitation request for juror: ${jurorName} (${jurorEmail})`);

    // Get the juror record including ID for proper linking
    const { data: jurorData, error: jurorError } = await supabase
      .from('jurors')
      .select('id, invitation_token')
      .eq('email', jurorEmail)
      .single();

    if (jurorError) {
      console.error("Error fetching juror:", jurorError);
      throw new Error(`Failed to find juror record: ${jurorError.message}`);
    }

    if (!jurorData.invitation_token) {
      console.error("Juror missing invitation token");
      throw new Error("Juror record is missing invitation token");
    }

    console.log(`Found juror record with ID: ${jurorData.id}`);

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

    const { error: updateError } = await supabase
      .from('jurors')
      .update(updateData)
      .eq('email', jurorEmail);

    if (updateError) {
      console.error("Error updating juror timestamps:", updateError);
      throw new Error(`Failed to update juror record: ${updateError.message}`);
    }

    // Create magic link URL pointing to the authentication edge function
    const frontendUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const magicLinkUrl = `${supabaseUrl}/functions/v1/authenticate-juror?token=${jurorData.invitation_token}`;

    console.log(`Sending email to: ${jurorEmail} with magic link`);

    // Use centralized email service with retry mechanism
    let emailResponse;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Email attempt ${attempts} for ${jurorEmail}`);
      
      try {
        emailResponse = await supabase.functions.invoke('send-email', {
          body: {
            templateCategory: 'juror_invitation',
            recipientEmail: jurorEmail,
            recipientType: 'juror',
            recipientId: jurorData.id, // Now properly linking to juror record
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
        
        // If we get here without error, break out of retry loop
        break;
        
      } catch (invokeError) {
        console.error(`Email attempt ${attempts} failed:`, invokeError);
        if (attempts === maxAttempts) {
          throw invokeError;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (emailResponse?.error) {
      console.error('Failed to send invitation email after retries:', emailResponse.error);
      console.error('Email response details:', JSON.stringify(emailResponse, null, 2));
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to send invitation email',
        details: emailResponse.error,
        attempts: attempts
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Invitation email sent successfully after ${attempts} attempts:`, emailResponse?.data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent successfully",
      emailResponse: emailResponse?.data,
      recipientEmail: jurorEmail,
      jurorId: jurorData.id,
      attempts: attempts
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
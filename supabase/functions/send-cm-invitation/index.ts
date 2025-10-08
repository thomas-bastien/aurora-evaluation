import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CMInvitationRequest {
  cmName: string;
  cmEmail: string;
  organization?: string;
  jobTitle?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      cmName, 
      cmEmail, 
      organization, 
      jobTitle
    }: CMInvitationRequest = await req.json();

    console.log(`Processing invitation request for CM: ${cmName} (${cmEmail})`);

    const { data: cmData, error: cmError } = await supabase
      .from('community_managers')
      .select('id, invitation_token')
      .eq('email', cmEmail)
      .single();

    if (cmError) {
      console.error("Error fetching CM:", cmError);
      throw new Error(`Failed to find CM record: ${cmError.message}`);
    }

    if (!cmData.invitation_token) {
      console.error("CM missing invitation token");
      throw new Error("CM record is missing invitation token");
    }

    console.log(`Found CM record with ID: ${cmData.id}`);

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    const { error: updateError } = await supabase
      .from('community_managers')
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: expirationDate.toISOString()
      })
      .eq('email', cmEmail);

    if (updateError) {
      console.error("Error updating CM timestamps:", updateError);
      throw new Error(`Failed to update CM record: ${updateError.message}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const magicLinkUrl = `${supabaseUrl}/functions/v1/authenticate-cm?token=${cmData.invitation_token}`;

    console.log(`Sending email to: ${cmEmail} with magic link`);

    let emailResponse;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Email attempt ${attempts} for ${cmEmail}`);
      
      try {
        emailResponse = await supabase.functions.invoke('send-email', {
          body: {
            templateCategory: 'cm_invitation',
            recipientEmail: cmEmail,
            recipientType: 'admin',
            recipientId: cmData.id,
            variables: {
              cm_name: cmName,
              invitation_link: magicLinkUrl,
              invitation_expires_at: expirationDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              organization: organization || '',
              job_title: jobTitle || ''
            },
            preventDuplicates: true
          }
        });
        
        break;
        
      } catch (invokeError) {
        console.error(`Email attempt ${attempts} failed:`, invokeError);
        if (attempts === maxAttempts) {
          throw invokeError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (emailResponse?.error) {
      console.error('Failed to send invitation email after retries:', emailResponse.error);
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
      recipientEmail: cmEmail,
      cmId: cmData.id,
      attempts: attempts
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-cm-invitation function:", error);
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

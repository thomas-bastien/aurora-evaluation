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

interface AdminInvitationRequest {
  adminName: string;
  adminEmail: string;
  organization?: string;
  jobTitle?: string;
  linkedinUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate requesting user is admin
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }
    
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (userRole?.role !== 'admin') {
      throw new Error('Only admins can invite other admins');
    }

    const { adminName, adminEmail, organization, jobTitle, linkedinUrl }: AdminInvitationRequest = await req.json();

    console.log(`Processing invitation for admin: ${adminName} (${adminEmail})`);

    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, invitation_token')
      .eq('email', adminEmail)
      .single();

    if (adminError) {
      throw new Error(`Failed to find admin record: ${adminError.message}`);
    }

    if (!adminData.invitation_token) {
      throw new Error("Admin record is missing invitation token");
    }

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7);

    const { error: updateError } = await supabase
      .from('admins')
      .update({
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: expirationDate.toISOString()
      })
      .eq('email', adminEmail);

    if (updateError) {
      throw new Error(`Failed to update admin record: ${updateError.message}`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const magicLinkUrl = `${supabaseUrl}/functions/v1/authenticate-admin?token=${adminData.invitation_token}`;

    // Send invitation email
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        templateCategory: 'admin_invitation',
        recipientEmail: adminEmail,
        recipientType: 'admin',
        recipientId: adminData.id,
        variables: {
          admin_name: adminName,
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

    if (emailResponse?.error) {
      console.error('Email error:', emailResponse.error);
      throw new Error('Failed to send invitation email');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation sent successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-admin-invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);

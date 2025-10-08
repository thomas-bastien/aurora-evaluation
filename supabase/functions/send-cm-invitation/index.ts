import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CMInvitationRequest {
  name: string;
  email: string;
  organization?: string;
  jobTitle?: string;
  permissions?: {
    can_invite_cms: boolean;
    can_manage_jurors: boolean;
    can_manage_startups: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      name,
      email,
      organization,
      jobTitle,
      permissions,
    }: CMInvitationRequest = await req.json();

    console.log("Processing CM invitation for:", email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if CM already exists
    const { data: existingCM } = await supabaseAdmin
      .from("community_managers")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingCM) {
      return new Response(
        JSON.stringify({ error: "A community manager with this email already exists" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert CM record with invitation token
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 days expiry

    const { data: cm, error: insertError } = await supabaseAdmin
      .from("community_managers")
      .insert({
        name,
        email,
        organization,
        job_title: jobTitle,
        permissions: permissions || {
          can_invite_cms: true,
          can_manage_jurors: true,
          can_manage_startups: true,
        },
        invitation_sent_at: new Date().toISOString(),
        invitation_expires_at: invitationExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting CM:", insertError);
      throw insertError;
    }

    console.log("CM record created:", cm.id);

    // Generate invitation link
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const invitationLink = `${frontendUrl}/cm-signup?token=${cm.invitation_token}`;

    // Prepare email variables
    const emailVariables = {
      cm_name: name,
      invitation_link: invitationLink,
      invitation_expires_at: invitationExpiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      organization: organization || "",
      job_title: jobTitle || "",
    };

    console.log("Sending invitation email to:", email);

    // Send invitation email
    const { error: emailError } = await supabaseAdmin.functions.invoke(
      "send-email",
      {
        body: {
          recipientEmail: email,
          recipientType: 'admin',
          templateCategory: "onboarding",
          subject: "You're invited to join Aurora as a Community Manager",
          variables: emailVariables,
        },
      }
    );

    if (emailError) {
      console.error("Error sending email:", emailError);
      // Don't fail the request if email fails - CM is created
      return new Response(
        JSON.stringify({
          success: true,
          warning: "CM created but email failed to send",
          cm_id: cm.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Invitation email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        cm_id: cm.id,
        message: "Community manager invited successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
    );
  } catch (error: any) {
    console.error("Error in send-cm-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

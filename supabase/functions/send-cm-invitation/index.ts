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
  isResend?: boolean;
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
      isResend,
    }: CMInvitationRequest = await req.json();

    console.log("Processing CM invitation for:", email, "isResend:", isResend);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if CM already exists
    const { data: existingCM } = await supabaseAdmin
      .from("community_managers")
      .select("id, email, user_id, invitation_token")
      .eq("email", email)
      .maybeSingle();

    let cm;

    if (existingCM) {
      // Check if CM is already activated
      if (existingCM.user_id) {
        console.log("CM already activated, cannot resend:", existingCM.id);
        return new Response(
          JSON.stringify({ error: "Community manager already activated; no invitation needed" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // If not a resend request, reject duplicate
      if (!isResend) {
        console.log("CM exists but not a resend request:", existingCM.id);
        return new Response(
          JSON.stringify({ error: "A community manager with this email already exists" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // RESEND PATH: Update existing CM with new invitation timestamps
      console.log("RESEND PATH: Updating invitation for existing CM:", existingCM.id);
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

      const { data: updatedCM, error: updateError } = await supabaseAdmin
        .from("community_managers")
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: invitationExpiresAt.toISOString(),
          name,
          organization,
          job_title: jobTitle,
        })
        .eq("id", existingCM.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating CM:", updateError);
        throw updateError;
      }

      cm = updatedCM;
      console.log("CM invitation updated for resend:", cm.id);

    } else {
      // NEW CM PATH: Insert CM record with invitation token
      console.log("NEW CM PATH: Creating new CM record");
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7);

      const { data: newCM, error: insertError } = await supabaseAdmin
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

      cm = newCM;
      console.log("CM record created:", cm.id);
    }

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

    console.log("Sending invitation email to:", email, "for CM:", cm.id);

    // Send invitation email
    const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke(
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
      // Don't fail the request if email fails - CM is created/updated
      return new Response(
        JSON.stringify({
          success: true,
          warning: "CM processed but email failed to send",
          cm_id: cm.id,
          emailError: emailError.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Invitation email sent successfully:", emailData);

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

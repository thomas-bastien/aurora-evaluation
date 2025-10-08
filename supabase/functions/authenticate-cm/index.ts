import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      console.error("No token provided in request");
      return new Response("Missing invitation token", { status: 400 });
    }

    // Clean and validate token
    const cleanToken = token.trim();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanToken)) {
      console.error("Invalid token format:", cleanToken);
      return new Response("Invalid token format", { status: 400 });
    }

    console.log("Authenticating CM with token:", cleanToken);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate token and get CM data
    const { data: cm, error: cmError } = await supabaseAdmin
      .from("community_managers")
      .select("*")
      .eq("invitation_token", cleanToken)
      .maybeSingle();

    if (cmError) {
      console.error("Error fetching CM:", cmError);
      return new Response("Database error", { status: 500 });
    }

    if (!cm) {
      console.error("No CM found with token:", cleanToken);
      return new Response("Invalid or expired invitation token", { status: 404 });
    }

    // Check if invitation expired
    const now = new Date();
    const expiresAt = new Date(cm.invitation_expires_at);

    if (now > expiresAt) {
      console.log("Invitation expired, auto-renewing...");
      
      // Auto-renew: extend expiration by 7 days
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error: updateError } = await supabaseAdmin
        .from("community_managers")
        .update({
          invitation_expires_at: newExpiresAt.toISOString(),
          invitation_sent_at: new Date().toISOString()
        })
        .eq("id", cm.id);

      if (updateError) {
        console.error("Error renewing invitation:", updateError);
        return new Response("Failed to renew invitation", { status: 500 });
      }

      // Resend invitation email
      console.log("Resending invitation email...");
      const { error: resendError } = await supabaseAdmin.functions.invoke(
        "send-cm-invitation",
        {
          body: {
            name: cm.name,
            email: cm.email,
            organization: cm.organization,
            jobTitle: cm.job_title,
            permissions: cm.permissions,
            isResend: true
          }
        }
      );

      if (resendError) {
        console.error("Error resending invitation:", resendError);
      }

      return new Response("Invitation expired. We've sent you a new invitation email.", { status: 410 });
    }

    console.log("Valid CM invitation found:", cm.id);

    // Check if user already exists with this email
    const { data: existingUsers, error: userListError } = await supabaseAdmin.auth.admin.listUsers();

    if (userListError) {
      console.error("Error listing users:", userListError);
      return new Response("Authentication error", { status: 500 });
    }

    const existingUser = existingUsers.users.find(u => u.email === cm.email);

    let userId: string;

    if (existingUser) {
      console.log("Existing user found:", existingUser.id);
      userId = existingUser.id;

      // Link CM record to existing user if not already linked
      if (!cm.user_id) {
        const { error: linkError } = await supabaseAdmin
          .from("community_managers")
          .update({ user_id: userId })
          .eq("id", cm.id);

        if (linkError) {
          console.error("Error linking CM to user:", linkError);
          return new Response("Failed to link account", { status: 500 });
        }

        console.log("Linked CM record to existing user");
      }
    } else {
      console.log("Creating new user account");

      // Generate temporary password
      const tempPassword = crypto.randomUUID();

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cm.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cm.name,
          organization: cm.organization,
          job_title: cm.job_title
        }
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        return new Response("Failed to create account", { status: 500 });
      }

      userId = newUser.user.id;
      console.log("Created new user:", userId);

      // Link CM record to new user
      const { error: linkError } = await supabaseAdmin
        .from("community_managers")
        .update({ user_id: userId })
        .eq("id", cm.id);

      if (linkError) {
        console.error("Error linking CM to new user:", linkError);
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({
          user_id: userId,
          full_name: cm.name,
          organization: cm.organization
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }
    }

    // Ensure user_roles entry exists
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "cm"
      }, {
        onConflict: "user_id,role"
      });

    if (roleError) {
      console.error("Error setting user role:", roleError);
    }

    // Determine redirect path
    const redirectPath = existingUser ? "/dashboard" : "/dashboard";

    // Generate magic link for session
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: cm.email,
      options: {
        redirectTo: `${frontendUrl}${redirectPath}`
      }
    });

    if (magicLinkError || !magicLinkData) {
      console.error("Error generating magic link:", magicLinkError);
      return new Response("Failed to generate session", { status: 500 });
    }

    console.log("Magic link generated, redirecting to:", magicLinkData.properties.action_link);

    // Redirect to the magic link which will authenticate and redirect
    return Response.redirect(magicLinkData.properties.action_link, 302);

  } catch (error: any) {
    console.error("Error in authenticate-cm function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

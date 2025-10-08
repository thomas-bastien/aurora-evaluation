import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CMSignupRequest {
  token: string;
  password: string;
  linkedinUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password, linkedinUrl }: CMSignupRequest = await req.json();

    console.log("Processing CM signup with token:", token);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate invitation token
    const { data: cm, error: cmError } = await supabaseAdmin
      .from("community_managers")
      .select("*")
      .eq("invitation_token", token)
      .maybeSingle();

    if (cmError || !cm) {
      console.error("Invalid token or CM not found");
      return new Response(
        JSON.stringify({ error: "Invalid invitation token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if token is already used
    if (cm.user_id) {
      return new Response(
        JSON.stringify({ error: "This invitation has already been used" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(cm.invitation_expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Token validated, creating user account");

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cm.email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: cm.name,
        role: "cm",
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      throw authError;
    }

    console.log("User created:", authData.user.id);

    // Update CM record with user_id and clear token
    const { error: updateCMError } = await supabaseAdmin
      .from("community_managers")
      .update({
        user_id: authData.user.id,
        invitation_token: null, // Clear token after use
        linkedin_url: linkedinUrl || cm.linkedin_url,
      })
      .eq("id", cm.id);

    if (updateCMError) {
      console.error("Error updating CM record:", updateCMError);
      throw updateCMError;
    }

    // Create user role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "cm",
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      throw roleError;
    }

    // Create profile (if not auto-created by trigger)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: authData.user.id,
        full_name: cm.name,
        organization: cm.organization,
        role: "cm",
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't fail if profile creation fails, might be auto-created
    }

    console.log("CM signup completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in complete-cm-signup function:", error);
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

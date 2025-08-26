import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JurorSignupRequest {
  token: string;
  password: string;
  calendlyLink?: string;
  expertise?: string[];
  investmentStages?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password, calendlyLink, expertise, investmentStages }: JurorSignupRequest = await req.json();
    
    console.log("Processing juror signup with token:", token);

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, let's check if the token exists at all
    console.log("Checking for token in database...");
    const { data: tokenCheckData, error: tokenCheckError } = await supabaseAdmin
      .from('jurors')
      .select('*')
      .eq('invitation_token', token)
      .maybeSingle();

    console.log("Token check result:", { tokenCheckData, tokenCheckError });

    if (tokenCheckError) {
      console.error("Database error during token check:", tokenCheckError);
      return new Response(
        JSON.stringify({ error: "Database error during token validation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!tokenCheckData) {
      console.log("No juror found with this token");
      return new Response(
        JSON.stringify({ error: "Invalid invitation token - token not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if already used
    if (tokenCheckData.user_id) {
      console.log("Token already used, user_id:", tokenCheckData.user_id);
      return new Response(
        JSON.stringify({ error: "Invitation token has already been used" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiryDate = new Date(tokenCheckData.invitation_expires_at);
    console.log("Checking expiry:", { now: now.toISOString(), expiry: tokenCheckData.invitation_expires_at, expired: now > expiryDate });

    if (now > expiryDate) {
      console.log("Token has expired");
      return new Response(
        JSON.stringify({ error: "Invitation token has expired" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Token validation successful for juror:", tokenCheckData.email);
    const jurorData = tokenCheckData;

    // Create user with confirmed email
    console.log("Creating user account for:", jurorData.email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: jurorData.email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: jurorData.name,
        role: 'vc'
      }
    });

    console.log("User creation result:", { 
      success: !!authData.user, 
      userId: authData.user?.id, 
      authError: authError?.message 
    });

    if (authError) {
      console.error("Auth user creation failed:", authError);
      return new Response(
        JSON.stringify({ error: `Failed to create user account: ${authError.message}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (authData.user) {
      console.log("Linking juror record to user:", authData.user.id);
      // Update juror record to link with user
      const { error: jurorUpdateError } = await supabaseAdmin
        .from('jurors')
        .update({ 
          user_id: authData.user.id,
          invitation_token: null // Clear the token after use
        })
        .eq('id', jurorData.id);

      if (jurorUpdateError) {
        console.error("Failed to update juror record:", jurorUpdateError);
        return new Response(
          JSON.stringify({ error: `Failed to update juror record: ${jurorUpdateError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Juror record updated successfully");

      // Update profile with additional data
      console.log("Creating/updating profile for user:", authData.user.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          calendly_link: calendlyLink || null,
          expertise: expertise && expertise.length > 0 ? expertise : null,
          investment_stages: investmentStages && investmentStages.length > 0 ? investmentStages : null,
          organization: jurorData.company || null
        })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error("Failed to update profile:", profileError);
        return new Response(
          JSON.stringify({ error: `Failed to update profile: ${profileError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      console.log("Profile updated successfully");

      console.log("Juror signup completed successfully for:", jurorData.email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully! You can now sign in." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.error("User creation succeeded but no user data returned");
    return new Response(
      JSON.stringify({ error: "Failed to create user account - no user data returned" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in complete-juror-signup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
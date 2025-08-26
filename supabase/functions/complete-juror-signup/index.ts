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

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate token and get juror data
    const { data: jurorData, error: jurorError } = await supabaseAdmin
      .from('jurors')
      .select('*')
      .eq('invitation_token', token)
      .gt('invitation_expires_at', new Date().toISOString())
      .is('user_id', null)
      .maybeSingle();

    if (jurorError || !jurorData) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create user with confirmed email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: jurorData.email,
      password: password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: jurorData.name,
        role: 'vc'
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (authData.user) {
      // Update juror record to link with user
      const { error: jurorUpdateError } = await supabaseAdmin
        .from('jurors')
        .update({ 
          user_id: authData.user.id,
          invitation_token: null // Clear the token after use
        })
        .eq('id', jurorData.id);

      if (jurorUpdateError) {
        return new Response(
          JSON.stringify({ error: jurorUpdateError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update profile with additional data
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
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Account created successfully! You can now sign in." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to create user account" }),
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
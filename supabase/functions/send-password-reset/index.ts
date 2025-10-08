import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Password reset requested for: ${email}`);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking user:", userError);
      // Don't reveal if user exists - return success anyway
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with that email, a reset link has been sent",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userExists = userData.users.some(u => u.email === email);

    if (!userExists) {
      console.log(`User not found: ${email}`);
      // Security: Don't reveal user doesn't exist
      return new Response(
        JSON.stringify({
          success: true,
          message: "If an account exists with that email, a reset link has been sent",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/update-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    console.log("Password reset link generated successfully");

    // Get user info for email personalization
    const user = userData.users.find(u => u.email === email);
    const userName = user?.user_metadata?.full_name || email.split('@')[0];

    // Send branded email via send-email function
    const emailResponse = await supabase.functions.invoke('send-email', {
      body: {
        templateCategory: 'password-reset',
        recipientEmail: email,
        recipientType: 'admin', // Could be any user type
        recipientId: user?.id,
        variables: {
          user_name: userName,
          user_email: email,
          reset_link: resetData.properties.action_link,
          expiration_time: '1 hour',
        },
      },
    });

    if (emailResponse.error) {
      console.error("Error sending email:", emailResponse.error);
      throw new Error("Failed to send reset email");
    }

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with that email, a reset link has been sent",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing your request",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        `<html><body><h1>Invalid invitation link</h1><p>No token provided.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Clean up URL encoding artifacts - remove any leading "3D" (URL-encoded "=")
    token = token.replace(/^3D/i, '');
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.error("Invalid token format:", token);
      return new Response(
        `<html><body><h1>Invalid invitation link</h1><p>Token format is invalid.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log("Processing magic link authentication with cleaned token:", token);

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate token
    const { data: jurorData, error: tokenError } = await supabaseAdmin
      .from('jurors')
      .select('*')
      .eq('invitation_token', token)
      .maybeSingle();

    console.log("Token validation result:", { found: !!jurorData, error: tokenError?.message });

    if (tokenError) {
      console.error("Database error during token validation:", tokenError);
      return new Response(
        `<html><body><h1>Database Error</h1><p>Unable to validate invitation.</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    if (!jurorData) {
      return new Response(
        `<html><body><h1>Invalid Invitation</h1><p>This invitation link is not valid.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiryDate = new Date(jurorData.invitation_expires_at);
    
    if (now > expiryDate) {
      console.log("Token expired, auto-regenerating and resending...");
      
      // Auto-regenerate expired token
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);
      
      const { error: updateError } = await supabaseAdmin
        .from('jurors')
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: newExpirationDate.toISOString()
        })
        .eq('id', jurorData.id);

      if (updateError) {
        console.error("Failed to regenerate token:", updateError);
        return new Response(
          `<html><body><h1>Invitation Expired</h1><p>This invitation has expired and we couldn't automatically renew it.</p></body></html>`,
          { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
        );
      }

      // Auto-resend invitation email
      try {
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/resend-juror-invitation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            jurorId: jurorData.id
          })
        });
        
        if (response.ok) {
          console.log("Auto-resent invitation email successfully");
        } else {
          console.error("Failed to auto-resend invitation email");
        }
      } catch (emailError) {
        console.error("Error auto-resending invitation email:", emailError);
      }

      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #667eea;">Invitation Renewed!</h1>
            <p style="font-size: 18px; color: #666;">
              Your invitation had expired, but we've automatically renewed it and sent a fresh invitation to your email.
            </p>
            <p style="color: #999;">
              Please check your email for the new invitation link.
            </p>
          </body>
        </html>`,
        { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === jurorData.email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log("Existing user found:", existingUser.id);
      userId = existingUser.id;
      
      // If juror record isn't linked yet, link it
      if (!jurorData.user_id) {
        await supabaseAdmin
          .from('jurors')
          .update({ 
            user_id: userId,
            invitation_token: null // Clear token after use
          })
          .eq('id', jurorData.id);
        console.log("Linked existing user to juror record");
      }
    } else {
      console.log("Creating new user account");
      isNewUser = true;
      
      // Generate a temporary password for the new user
      const tempPassword = crypto.randomUUID();
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: jurorData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: jurorData.name,
          role: 'vc'
        }
      });

      if (authError || !authData.user) {
        console.error("Failed to create user:", authError);
        return new Response(
          `<html><body><h1>Account Creation Failed</h1><p>Unable to create your account.</p></body></html>`,
          { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
        );
      }

      userId = authData.user.id;

      // Link juror record to new user
      await supabaseAdmin
        .from('jurors')
        .update({ 
          user_id: userId,
          invitation_token: null // Clear token after use
        })
        .eq('id', jurorData.id);

      // Update profile with juror company info
      await supabaseAdmin
        .from('profiles')
        .update({
          organization: jurorData.company || null
        })
        .eq('user_id', userId);

      console.log("New user created and linked to juror record");
    }

    // Determine redirect URL based on user profile completion status
    let redirectPath = '/dashboard';
    
    if (isNewUser) {
      // New users always go to onboarding
      redirectPath = '/juror-onboarding?onboarding=true';
    } else {
      // Check if existing user needs onboarding
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('calendly_link, expertise, investment_stages')
        .eq('user_id', userId)
        .maybeSingle();
        
      const needsOnboarding = profileData && (
        !profileData.calendly_link || 
        !profileData.expertise || 
        profileData.expertise.length === 0 ||
        !profileData.investment_stages ||
        profileData.investment_stages.length === 0
      );
      
      if (needsOnboarding) {
        redirectPath = '/juror-onboarding?onboarding=true';
      }
    }

    // Create a temporary session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: jurorData.email,
      options: {
        redirectTo: `${Deno.env.get('FRONTEND_URL') || req.headers.get('origin')}${redirectPath}`
      }
    });

    if (sessionError || !sessionData.properties?.action_link) {
      console.error("Failed to generate session:", sessionError);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Unable to create session.</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log("Magic link authentication successful, redirecting user");

    // Redirect to the magic link which will authenticate the user
    return new Response(null, {
      status: 302,
      headers: {
        'Location': sessionData.properties.action_link,
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in authenticate-juror function:", error);
    return new Response(
      `<html><body><h1>Authentication Error</h1><p>${error.message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  }
};

serve(handler);
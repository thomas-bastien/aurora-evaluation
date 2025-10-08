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

    token = token.replace(/^3D/i, '');
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      console.error("Invalid token format:", token);
      return new Response(
        `<html><body><h1>Invalid invitation link</h1><p>Token format is invalid.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log("Processing CM authentication with token:", token);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: cmData, error: tokenError } = await supabaseAdmin
      .from('community_managers')
      .select('*')
      .eq('invitation_token', token)
      .maybeSingle();

    if (tokenError || !cmData) {
      return new Response(
        `<html><body><h1>Invalid Invitation</h1><p>This invitation link is not valid.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    const now = new Date();
    const expiryDate = new Date(cmData.invitation_expires_at);
    
    if (now > expiryDate) {
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);
      
      await supabaseAdmin
        .from('community_managers')
        .update({
          invitation_sent_at: new Date().toISOString(),
          invitation_expires_at: newExpirationDate.toISOString()
        })
        .eq('id', cmData.id);

      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #667eea;">Invitation Renewed!</h1>
            <p style="font-size: 18px; color: #666;">
              Your invitation had expired, but we've renewed it. Please check your email for the new invitation link.
            </p>
          </body>
        </html>`,
        { status: 200, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(user => user.email === cmData.email);

    let userId: string;

    if (existingUser) {
      console.log("Existing user found:", existingUser.id);
      userId = existingUser.id;
      
      if (!cmData.user_id) {
        await supabaseAdmin
          .from('community_managers')
          .update({ 
            user_id: userId,
            invitation_token: null
          })
          .eq('id', cmData.id);
        
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ 
            user_id: userId, 
            role: 'cm',
            created_by: userId 
          })
          .select()
          .single();
          
        if (roleError && !roleError.message.includes('duplicate')) {
          console.error("Failed to assign cm role:", roleError);
        }
      }
    } else {
      console.log("Creating new user account");
      
      const tempPassword = crypto.randomUUID();
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cmData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cmData.name,
          role: 'cm'
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

      await supabaseAdmin
        .from('community_managers')
        .update({ 
          user_id: userId,
          invitation_token: null
        })
        .eq('id', cmData.id);

      await supabaseAdmin
        .from('profiles')
        .update({
          organization: cmData.organization || null
        })
        .eq('user_id', userId);
        
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: 'cm',
          created_by: userId 
        })
        .select()
        .single();
        
      if (roleError && !roleError.message.includes('duplicate')) {
        console.error("Failed to assign cm role:", roleError);
      }
    }

    const baseUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || '';
    const redirectUrl = new URL('/dashboard', baseUrl);
    
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: cmData.email,
      options: {
        redirectTo: redirectUrl.toString()
      }
    });

    if (sessionError || !sessionData.properties?.action_link) {
      console.error("Failed to generate session:", sessionError);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Unable to create session.</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log("CM authentication successful, redirecting");

    return new Response(null, {
      status: 302,
      headers: {
        'Location': sessionData.properties.action_link,
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in authenticate-cm function:", error);
    return new Response(
      `<html><body><h1>Authentication Error</h1><p>${error.message}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
    );
  }
};

serve(handler);

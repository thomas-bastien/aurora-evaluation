import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get('token');

    if (!token) {
      throw new Error('No token provided');
    }

    // Clean the token - handle URL encoding issues
    token = token.trim().replace(/\s+/g, '');
    
    console.log('Authenticating admin with token...');

    // Verify admin invitation token
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (adminError || !adminData) {
      console.error('Invalid token:', adminError);
      throw new Error('Invalid invitation token');
    }

    console.log(`Found admin: ${adminData.name} (${adminData.email})`);

    // Check if token is expired
    const now = new Date();
    const expiresAt = adminData.invitation_expires_at ? new Date(adminData.invitation_expires_at) : null;
    
    if (expiresAt && now > expiresAt) {
      console.log('Token expired, auto-renewing...');
      // Auto-renew expired token
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);
      
      await supabaseAdmin
        .from('admins')
        .update({
          invitation_expires_at: newExpirationDate.toISOString()
        })
        .eq('id', adminData.id);

      console.log('Token renewed, proceeding with authentication');
    }

    let userId = adminData.user_id;
    let isNewUser = false;

    // Create or link auth user if needed
    if (!userId) {
      console.log('No linked user_id found, checking if user exists...');
      
      // Check if user with this email already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === adminData.email);
      
      if (existingUser) {
        console.log(`Found existing user for ${adminData.email}, linking...`);
        userId = existingUser.id;
      } else {
        console.log('Creating new auth user...');
        isNewUser = true;
        
        // Create temporary password for new user
        const tempPassword = crypto.randomUUID();
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: adminData.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: adminData.name,
            role: 'admin'
          }
        });

        if (authError) {
          console.error('Failed to create user:', authError);
          throw authError;
        }
        
        userId = authData.user.id;
        console.log(`Created user with ID: ${userId}`);
      }

      // Update profiles table - create if doesn't exist, update role if it does
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userId,
            full_name: adminData.name,
            organization: adminData.organization,
            role: 'admin'
          });

        if (profileError) {
          console.error('Failed to create profile:', profileError);
        }
      } else {
        // Update existing profile to admin role
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: 'admin',
            organization: adminData.organization
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Failed to update profile role:', updateError);
        } else {
          console.log('Updated existing profile to admin role');
        }
      }

      // Assign admin role if not already assigned
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ 
            user_id: userId, 
            role: 'admin',
            created_by: userId 
          });

        if (roleError) {
          console.error('Failed to assign admin role:', roleError);
          throw roleError;
        }
        console.log('Admin role assigned successfully');
      }

      // Link admin record to user and clear token
      const { error: updateError } = await supabaseAdmin
        .from('admins')
        .update({ 
          user_id: userId,
          invitation_token: null
        })
        .eq('id', adminData.id);

      if (updateError) {
        console.error('Failed to update admin record:', updateError);
        throw updateError;
      }

      console.log('Admin user created and linked successfully');
    }

    // Determine redirect path
    let redirectPath = '/dashboard';
    
    // Check if profile needs completion
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('full_name, organization')
      .eq('user_id', userId)
      .maybeSingle();

    // If new user or profile incomplete, send to onboarding
    if (isNewUser || !profileData?.full_name) {
      redirectPath = '/admin-onboarding?onboarding=true';
      console.log('Redirecting to onboarding flow');
    } else {
      console.log('Redirecting to dashboard');
    }

    // Create a temporary session for the user
    const baseUrl = Deno.env.get('FRONTEND_URL') || req.headers.get('origin') || '';
    const redirectUrl = new URL(redirectPath, baseUrl);
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminData.email,
      options: {
        redirectTo: redirectUrl.toString()
      }
    });

    if (sessionError || !sessionData.properties?.action_link) {
      console.error('Failed to generate session:', sessionError);
      return new Response(
        `<html><body><h1>Authentication Failed</h1><p>Unable to create session.</p></body></html>`,
        { status: 500, headers: { "Content-Type": "text/html", ...corsHeaders } }
      );
    }

    console.log('Magic link authentication successful, redirecting user');

    // Redirect to the magic link which will authenticate the user
    return new Response(null, {
      status: 302,
      headers: {
        'Location': sessionData.properties.action_link,
        ...corsHeaders
      }
    });

  } catch (error: any) {
    console.error("Error in authenticate-admin:", error);
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    const errorUrl = `${frontendUrl}/auth?error=${encodeURIComponent(error.message)}`;
    return new Response(null, {
      status: 302,
      headers: { 
        'Location': errorUrl,
        ...corsHeaders
      }
    });
  }
};

serve(handler);

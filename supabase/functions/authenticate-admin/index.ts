import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      throw new Error('No token provided');
    }

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
      console.log('Token expired, renewing...');
      // Auto-renew expired token
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + 7);
      
      await supabaseAdmin
        .from('admins')
        .update({
          invitation_expires_at: newExpirationDate.toISOString()
        })
        .eq('id', adminData.id);
    }

    let userId = adminData.user_id;

    // Create or link auth user
    if (!userId) {
      console.log('Creating new auth user...');
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminData.email,
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

      // Assign admin role
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

      // Update admin record with user_id and clear token
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

    // Generate session
    console.log('Generating magic link session...');
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminData.email
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      throw sessionError;
    }

    // Redirect to dashboard
    const redirectUrl = `${Deno.env.get('FRONTEND_URL')}/dashboard`;
    const finalUrl = sessionData.properties.action_link.replace(/.*#/, `${redirectUrl}#`);
    
    console.log('Redirecting to dashboard...');
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': finalUrl
      }
    });

  } catch (error: any) {
    console.error("Error in authenticate-admin:", error);
    const errorUrl = `${Deno.env.get('FRONTEND_URL')}/auth?error=${encodeURIComponent(error.message)}`;
    return new Response(null, {
      status: 302,
      headers: { 'Location': errorUrl }
    });
  }
};

serve(handler);

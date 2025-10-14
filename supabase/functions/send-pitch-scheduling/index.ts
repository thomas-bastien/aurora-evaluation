import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Test mode configuration from environment
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
const TEST_EMAIL = "delivered@resend.dev"; // Use Resend's test address
const ADMIN_CC_EMAIL = "lucien98@gmail.com"; // Admin monitoring email

// Get appropriate "From" address based on mode
const getFromAddress = (): string => {
  if (TEST_MODE) {
    return Deno.env.get("RESEND_FROM_SANDBOX") || "Aurora Evaluation <onboarding@resend.dev>";
  }
  const prodFrom = Deno.env.get("RESEND_FROM");
  if (!prodFrom) {
    console.error("RESEND_FROM not configured for production mode");
    throw new Error("RESEND_FROM must be set for production email sending");
  }
  return prodFrom;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PitchSchedulingRequest {
  startupId: string;
  startupName: string;
  startupEmail: string;
  assignedJurors: Array<{
    id: string;
    name: string;
    email: string;
    company: string;
    calendlyLink: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('send-pitch-scheduling function called');

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startupId, startupName, startupEmail, assignedJurors }: PitchSchedulingRequest = await req.json();
    
    console.log(`Sending pitch scheduling email to: ${startupName} (${startupEmail}) with ${assignedJurors.length} jurors`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch template by display_order=13; fallback by category
    let template: any = null;
    let templateError: any = null;
    const primary = await supabase
      .from('email_templates')
      .select('*')
      .eq('display_order', 13)
      .eq('is_active', true)
      .maybeSingle();

    if (!primary.error && primary.data) {
      template = primary.data;
    } else {
      const fallback = await supabase
        .from('email_templates')
        .select('*')
        .eq('category', 'pitch_scheduling')
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      templateError = primary.error || fallback.error;
      template = fallback.data || null;
    }

    if (!template) {
      console.error('Failed to find pitch scheduling template. Tip: run ensure-email-templates function to seed required templates.', templateError);
      throw new Error('Email template not found');
    }

    // Generate juror list HTML
    const jurorListHtml = assignedJurors.map(juror => `
      <div style="background: white; border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 10px; border-radius: 6px;">
        <strong style="color: #1f2937; font-size: 16px;">${juror.name}</strong>
        <br/>
        <span style="color: #6b7280; font-size: 14px;">${juror.company || 'Investment Professional'}</span>
        <br/>
        <a href="${juror.calendlyLink}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-size: 14px;">
          📅 Schedule Meeting
        </a>
      </div>
    `).join('');

    // Determine recipients - use multiple TOs instead of CC
    const toEmails = [];
    
    if (TEST_MODE) {
      // In test mode, send to test addresses to simulate the real flow
      toEmails.push(TEST_EMAIL); // Startup's test email
      
      // Add test addresses for each juror to simulate multi-recipient
      assignedJurors.forEach((juror, index) => {
        toEmails.push(`delivered+juror${index}@resend.dev`);
      });
      
      // Optionally add admin for visibility
      if (ADMIN_CC_EMAIL) {
        toEmails.push(ADMIN_CC_EMAIL);
      }
    } else {
      // Production: send to actual emails
      toEmails.push(startupEmail);
      assignedJurors.forEach(juror => {
        if (juror.email) {
          toEmails.push(juror.email);
        }
      });
    }
    
    const fromAddress = getFromAddress();
    
    console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Original recipient=${startupEmail}`);
    console.log(`📧 TO EMAILS ARRAY:`, JSON.stringify(toEmails));
    
    if (TEST_MODE) {
      console.log(`🧪 TEST MODE: Using Resend test addresses`);
      console.log(`   - Startup (would be ${startupEmail}): ${TEST_EMAIL}`);
      console.log(`   - ${assignedJurors.length} juror test addresses`);
      if (ADMIN_CC_EMAIL) {
        console.log(`   - Admin monitoring: ${ADMIN_CC_EMAIL}`);
      }
    }

    // Substitute variables in template
    const subject = (template.subject_template || '')
      .replace(/\{\{startup_name\}\}/g, startupName)
      .replace(/\{\{juror_count\}\}/g, assignedJurors.length.toString());
    const htmlContent = (template.body_template || '')
      .replace(/\{\{startup_name\}\}/g, startupName)
      .replace(/\{\{juror_count\}\}/g, assignedJurors.length.toString())
      .replace(/\{\{jurors_html\}\}/g, jurorListHtml);

    // Send email to all recipients (no CC needed now)
    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: toEmails,
      subject: TEST_MODE ? `[TEST] ${subject}` : subject,
      html: TEST_MODE ? `
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
          <strong>🧪 TEST MODE:</strong> Using Resend test email addresses<br>
          <strong>Actual startup:</strong> ${startupEmail}<br>
          <strong>Actual jurors:</strong> ${assignedJurors.map(j => `${j.name} (${j.email})`).join(', ')}<br>
          ${ADMIN_CC_EMAIL ? `<strong>Admin monitoring:</strong> ${ADMIN_CC_EMAIL}` : ''}
        </div>
        ${htmlContent}
      ` : htmlContent,
    });

    if (emailResponse.error) {
      console.error('Resend API error:', emailResponse.error);
      throw new Error(`Email send failed: ${emailResponse.error.message}`);
    }

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailResponse.data?.id,
      message: `Pitch scheduling email sent to ${startupName}`,
      toRecipients: toEmails.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-pitch-scheduling function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
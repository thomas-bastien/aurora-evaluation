import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
// Using Web Crypto API for hash generation

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Test mode configuration from environment
const TEST_MODE = Deno.env.get("TEST_MODE") === "true";
const TEST_EMAIL = "delivered@resend.dev";

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

interface SendEmailRequest {
  templateId?: string;
  templateCategory?: string;
  communicationType?: string;
  recipientEmail: string;
  recipientType: 'juror' | 'startup' | 'admin';
  recipientId?: string;
  variables?: Record<string, any>;
  subject?: string;
  body?: string;
  preventDuplicates?: boolean;
}

interface EmailTemplate {
  id: string;
  subject_template: string;
  body_template: string;
  variables: string[];
}

// Map template category to valid communication_type values
// Valid types: 'selection', 'rejection', 'under-review', 'general'
const mapCategoryToCommunicationType = (category?: string): string => {
  if (!category) return 'general';
  
  const mapping: Record<string, string> = {
    'juror_invitation': 'under-review',
    'juror-reminder': 'under-review',
    'assignment-notification': 'under-review',
    'founder_selection': 'selection',
    'founder_rejection': 'rejection',
    'pitch-scheduling': 'under-review',
    'screening-results': 'selection',
    'pitching-results': 'selection'
  };
  
  return mapping[category] || 'general';
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SendEmailRequest = await req.json();
    console.log("Processing email request:", { 
      templateId: requestData.templateId,
      templateCategory: requestData.templateCategory,
      recipientEmail: requestData.recipientEmail,
      recipientType: requestData.recipientType
    });

    let template: EmailTemplate | null = null;
    let subject = requestData.subject || "";
    let body = requestData.body || "";

    // Get template if specified
    if (requestData.templateId || requestData.templateCategory) {
      const templateQuery = requestData.templateId 
        ? supabase.from('email_templates').select('*').eq('id', requestData.templateId).eq('is_active', true)
        : supabase.from('email_templates').select('*').eq('category', requestData.templateCategory).eq('is_active', true).order('created_at', { ascending: false }).limit(1);

      const { data: templateData, error: templateError } = await templateQuery.single();
      
      if (templateError) {
        console.error("Template fetch error:", templateError);
        console.log("Using fallback template for category:", requestData.templateCategory);
        
        // Use fallback template instead of returning error
        const fallback = getDefaultContentByCategory(requestData.templateCategory);
        subject = fallback.subject;
        body = fallback.body;
      } else {
        const templateLocal = templateData as EmailTemplate;
        template = templateLocal;
        subject = templateLocal.subject_template;
        body = templateLocal.body_template;
      }

    }

    // Apply variable substitution
    if (requestData.variables && Object.keys(requestData.variables).length > 0) {
      for (const [key, value] of Object.entries(requestData.variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    // Generate content hash for duplicate prevention using Web Crypto API
    const contentString = `${requestData.recipientEmail}:${subject}:${body}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for duplicates if enabled (disabled in TEST_MODE)
    if (requestData.preventDuplicates !== false && !TEST_MODE) {
      const { data: existing, error: duplicateError } = await supabase
        .from('email_communications')
        .select('id, created_at')
        .eq('content_hash', contentHash)
        .eq('recipient_email', requestData.recipientEmail)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (existing && !duplicateError) {
        console.log("Duplicate email prevented:", existing.id);
        return new Response(JSON.stringify({
          message: "Email not sent - duplicate detected",
          duplicateId: existing.id
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Create email communication record
    const { data: communication, error: commError } = await supabase
      .from('email_communications')
      .insert({
        template_id: template?.id,
        recipient_email: requestData.recipientEmail,
        recipient_type: requestData.recipientType,
        recipient_id: requestData.recipientId,
        subject,
        body,
        content_hash: contentHash,
        status: 'pending',
        communication_type: requestData.communicationType || mapCategoryToCommunicationType(requestData.templateCategory),
        metadata: {
          template_category: requestData.templateCategory,
          variables: requestData.variables
        }
      })
      .select()
      .single();

    if (commError) {
      console.error("Error creating communication record:", commError);
      return new Response(JSON.stringify({ error: "Failed to create communication record" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email via Resend
    try {
      // Determine actual recipient (redirect in test mode)
      const actualRecipient = TEST_MODE ? TEST_EMAIL : requestData.recipientEmail;

      if (TEST_MODE) {
        console.log(`🧪 SANDBOX MODE: Redirecting email from ${requestData.recipientEmail} to ${TEST_EMAIL}`);
      }

      const fromAddress = getFromAddress();
      console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Recipient=${actualRecipient}`);

      const emailResponse = await resend.emails.send({
        from: fromAddress,
        to: [actualRecipient],
        subject: TEST_MODE ? `[SANDBOX] ${subject}` : subject,
        html: TEST_MODE ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; margin-bottom: 20px; border-radius: 4px;">
            <strong>🧪 SANDBOX MODE:</strong> This email would normally be sent to: <strong>${requestData.recipientEmail}</strong>
          </div>
          ${body}
        ` : body,
      });

      console.log("Email sent successfully via Resend:", emailResponse);

      // Update communication record with Resend ID and status
      await supabase
        .from('email_communications')
        .update({
          resend_email_id: emailResponse.data?.id,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', communication.id);

      // Create delivery event
      await supabase
        .from('email_delivery_events')
        .insert({
          communication_id: communication.id,
          event_type: 'sent',
          resend_event_id: emailResponse.data?.id,
          raw_payload: { resend_response: emailResponse }
        });

      return new Response(JSON.stringify({
        success: true,
        communicationId: communication.id,
        resendId: emailResponse.data?.id,
        message: "Email sent successfully"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (resendError: any) {
      console.error("Resend API error:", resendError);
      const errMsg = (resendError && resendError.message) ? resendError.message : 'Unknown Resend error';
      
      // Update communication record with error
      await supabase
        .from('email_communications')
        .update({
          status: 'failed',
          error_message: errMsg
        })
        .eq('id', communication.id);

      return new Response(JSON.stringify({ 
        error: "Failed to send email",
        details: errMsg
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

// Professional Aurora-branded email template base
const createProfessionalEmailTemplate = (content: { title: string; body: string; ctaText?: string; ctaLink?: string }) => {
  const { title, body, ctaText, ctaLink } = content;
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <!-- Header with Aurora branding -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">Aurora Tech Awards</h1>
        <div style="height: 3px; width: 60px; background: rgba(255,255,255,0.3); margin: 15px auto; border-radius: 2px;"></div>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 500;">Excellence in Innovation</p>
      </div>
      
      <!-- Main content -->
      <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 600;">${title}</h2>
        
        <div style="color: #475569; line-height: 1.7; font-size: 16px;">
          ${body}
        </div>
        
        ${ctaText && ctaLink ? `
          <div style="margin: 32px 0; text-align: center;">
            <a href="${ctaLink}" style="
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
              transition: all 0.3s ease;
            ">${ctaText}</a>
          </div>
        ` : ''}
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 24px 30px; color: #64748b; font-size: 14px;">
        <p style="margin: 0;">© 2025 Aurora Tech Awards. All rights reserved.</p>
        <div style="margin-top: 8px;">
          <span style="color: #94a3b8;">Powered by Aurora Innovation Platform</span>
        </div>
      </div>
    </div>
  `;
};

// Default content by category with professional Aurora branding
const getDefaultContentByCategory = (category?: string) => {
  const defaults = {
    'juror_invitation': {
      subject: 'Welcome to Aurora Tech Awards - Complete Your Registration',
      body: createProfessionalEmailTemplate({
        title: 'You\'re Invited as a Juror',
        body: `
          <p>Dear <strong>{{juror_name}}</strong>,</p>
          <p>Congratulations! You have been selected to join the prestigious Aurora Tech Awards evaluation panel. Your expertise and insights will help identify the next generation of innovative startups.</p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #334155; margin-top: 0; font-size: 18px;">Next Steps</h3>
            <ul style="color: #475569; margin: 0; padding-left: 20px;">
              <li>Complete your juror profile</li>
              <li>Review evaluation criteria and guidelines</li>
              <li>Begin evaluating assigned startups</li>
            </ul>
          </div>
          
          <p style="color: #dc2626; font-weight: 500;">⚠️ This invitation expires on <strong>{{invitation_expires_at}}</strong></p>
        `,
        ctaText: 'Complete Registration',
        ctaLink: '{{invitation_link}}'
      })
    },
    
    'assignment-notification': {
      subject: 'New Startup Assignments - {{round_name}} Round',
      body: createProfessionalEmailTemplate({
        title: 'New Assignments Available',
        body: `
          <p>Hello <strong>{{juror_name}}</strong>,</p>
          <p>You have been assigned <strong>{{assignment_count}}</strong> new startup(s) for evaluation in the <strong>{{round_name}}</strong> round.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #0ea5e9;">
            <h3 style="color: #0c4a6e; margin-top: 0; font-size: 18px;">Assignment Details</h3>
            <div style="color: #0369a1;">
              {{startup_names}}
            </div>
          </div>
          
          <p>Please log into the platform to review your assignments and begin the evaluation process. Each evaluation typically takes 15-20 minutes to complete.</p>
        `,
        ctaText: 'View Assignments',
        ctaLink: '{{login_link}}'
      })
    },
    
    'juror-reminder': {
      subject: 'Reminder: {{pending_count}} Evaluations Pending - {{round_name}}',
      body: createProfessionalEmailTemplate({
        title: 'Evaluation Reminder',
        body: `
          <p>Hi <strong>{{juror_name}}</strong>,</p>
          <p>We hope this email finds you well! This is a friendly reminder about your pending startup evaluations in the <strong>{{round_name}}</strong> round.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">Your Progress</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; color: #b45309;">
              <div><strong>Completion Rate:</strong> {{completion_rate}}%</div>
              <div><strong>Remaining:</strong> {{pending_count}} evaluations</div>
            </div>
          </div>
          
          <p>Your evaluations are crucial in identifying innovative startups that will shape the future. Thank you for your continued dedication to excellence.</p>
        `,
        ctaText: 'Complete Evaluations',
        ctaLink: '{{login_link}}'
      })
    },
    
    'founder_rejection': {
      subject: 'Aurora Tech Awards Update - {{startup_name}}',
      body: createProfessionalEmailTemplate({
        title: 'Thank You for Your Application',
        body: `
          <p>Dear <strong>{{founder_name}}</strong>,</p>
          <p>Thank you for submitting <strong>{{startup_name}}</strong> to Aurora Tech Awards. We were impressed by your innovation and entrepreneurial spirit.</p>
          
          <p>After careful consideration by our expert evaluation panel, we will not be moving forward to the next round at this time. This decision was difficult given the high quality of applications we received.</p>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #334155; margin-top: 0; font-size: 18px;">Feedback from Our Panel</h3>
            <div style="color: #475569; font-style: italic;">
              {{feedback}}
            </div>
          </div>
          
          <p>We strongly encourage you to apply again in future rounds. Innovation is a journey, and we would love to see how <strong>{{startup_name}}</strong> evolves.</p>
          
          <p>Keep building, keep innovating!</p>
        `,
        ctaText: 'Learn About Future Rounds',
        ctaLink: '{{program_link}}'
      })
    },
    
    'founder_selection': {
      subject: 'Congratulations! {{startup_name}} Selected for Next Round',
      body: createProfessionalEmailTemplate({
        title: 'Congratulations! You\'ve Been Selected',
        body: `
          <p>Dear <strong>{{founder_name}}</strong>,</p>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
            <h3 style="color: white; margin: 0; font-size: 20px;">🎉 Congratulations!</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;"><strong>{{startup_name}}</strong> has been selected to proceed to the next round!</p>
          </div>
          
          <p>We are thrilled to inform you that <strong>{{startup_name}}</strong> has impressed our evaluation panel and will advance in the Aurora Tech Awards.</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #0ea5e9;">
            <h3 style="color: #0c4a6e; margin-top: 0; font-size: 18px;">Next Steps</h3>
            <ul style="color: #0369a1; margin: 0; padding-left: 20px;">
              <li>You will receive pitch scheduling invitations from our VC partners</li>
              <li>Prepare your pitch deck and demo presentation</li>
              <li>Schedule meetings with interested investors</li>
            </ul>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #334155; margin-top: 0; font-size: 18px;">Panel Feedback</h3>
            <div style="color: #475569; font-style: italic;">
              {{feedback}}
            </div>
          </div>
          
          <p>This is an incredible achievement. We look forward to seeing your continued success!</p>
        `,
        ctaText: 'Access Next Round Resources',
        ctaLink: '{{next_round_link}}'
      })
    },
    
    'pitch_scheduling': {
      subject: 'Schedule Your Pitch - {{startup_name}} x {{vc_name}}',
      body: createProfessionalEmailTemplate({
        title: 'Time to Schedule Your Pitch',
        body: `
          <p>Dear <strong>{{founder_name}}</strong>,</p>
          <p>Exciting news! <strong>{{vc_name}}</strong> is interested in learning more about <strong>{{startup_name}}</strong> and would like to schedule a pitch meeting.</p>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #064e3b; margin-top: 0; font-size: 18px;">Meeting Details</h3>
            <div style="color: #065f46;">
              <p><strong>VC Partner:</strong> {{vc_name}}</p>
              <p><strong>Duration:</strong> 30 minutes</p>
              <p><strong>Format:</strong> Virtual pitch presentation</p>
            </div>
          </div>
          
          <p>Please use the calendar link below to select a time that works for your schedule. We recommend preparing a concise pitch deck and being ready to discuss your business model, traction, and funding needs.</p>
        `,
        ctaText: 'Schedule Your Pitch',
        ctaLink: '{{calendly_link}}'
      })
    }
  };
  
  return defaults[category as keyof typeof defaults] || {
    subject: 'Aurora Tech Awards Notification',
    body: createProfessionalEmailTemplate({
      title: 'Platform Notification',
      body: `
        <p>You have a new notification from the Aurora Tech Awards platform.</p>
        <p>Please log in to view the details and take any necessary actions.</p>
      `,
      ctaText: 'View Notification',
      ctaLink: '{{login_link}}'
    })
  };
};

serve(handler);
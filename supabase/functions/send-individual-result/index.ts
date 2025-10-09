import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
// Using Web Crypto API instead of Deno crypto module

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

interface IndividualResultRequest {
  startupId: string;
  startupName: string;
  recipientEmail: string;
  communicationType: 'selected' | 'rejected' | 'under-review' | 'top-100-feedback';
  roundName: string;
  feedbackSummary?: string;
  customMessage?: string;
}

interface EmailTemplate {
  id: string;
  subject_template: string;
  body_template: string;
  variables: string[];
}

/**
 * Escape HTML to prevent XSS attacks
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Builds dynamic HTML sections for all VC evaluations
 * Handles unlimited number of VCs (not limited to 3)
 */
const buildVCFeedbackSections = async (
  startupId: string,
  roundName: string
): Promise<string> => {
  // Determine which table based on round
  const evaluationTable = roundName === 'screening' 
    ? 'screening_evaluations' 
    : 'pitching_evaluations';
  
  console.log(`Building VC feedback sections for startup ${startupId} in ${roundName} round`);
  
  // Fetch ALL submitted evaluations for this startup
  const { data: evaluations, error: evalError } = await supabase
    .from(evaluationTable)
    .select(`
      *,
      juror:evaluator_id (
        id,
        name,
        company,
        fund_focus
      )
    `)
    .eq('startup_id', startupId)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  if (evalError) {
    console.error('Error fetching evaluations:', evalError);
    return '<p><em>Error loading evaluations. Please contact support.</em></p>';
  }

  if (!evaluations || evaluations.length === 0) {
    console.log('No evaluations found for startup:', startupId);
    return '<p><em>No evaluations available yet.</em></p>';
  }

  console.log(`Found ${evaluations.length} evaluations for startup ${startupId}`);

  // Build HTML for each VC evaluation
  let sectionsHTML = '';
  
  evaluations.forEach((eval, index) => {
    const vcNumber = index + 1;
    const vcName = eval.juror?.company || eval.juror?.name || `VC Fund #${vcNumber}`;
    
    // Format strengths array as HTML list
    let strengthsHTML = '<p style="color: #64748b; font-style: italic;"><em>No specific strengths provided.</em></p>';
    if (eval.strengths && Array.isArray(eval.strengths) && eval.strengths.length > 0) {
      strengthsHTML = '<ul style="margin: 10px 0; padding-left: 20px; color: #374151;">';
      eval.strengths.forEach(strength => {
        strengthsHTML += `<li style="margin-bottom: 8px; line-height: 1.6;">${escapeHtml(strength)}</li>`;
      });
      strengthsHTML += '</ul>';
    }
    
    // Extract other fields with fallbacks
    const improvements = eval.improvement_areas 
      ? `<p style="color: #374151; line-height: 1.6;">${escapeHtml(eval.improvement_areas)}</p>`
      : '<p style="color: #64748b; font-style: italic;"><em>No improvement areas specified.</em></p>';
    
    const pitchDevelopment = eval.pitch_development_aspects
      ? `<p style="color: #374151; line-height: 1.6;">${escapeHtml(eval.pitch_development_aspects)}</p>`
      : '<p style="color: #64748b; font-style: italic;"><em>No pitch development feedback provided.</em></p>';
    
    const focusAreas = eval.overall_notes
      ? `<p style="color: #374151; line-height: 1.6;">${escapeHtml(eval.overall_notes)}</p>`
      : '<p style="color: #64748b; font-style: italic;"><em>No specific focus areas mentioned.</em></p>';
    
    const additionalComments = eval.recommendation
      ? `<p style="color: #374151; line-height: 1.6;">${escapeHtml(eval.recommendation)}</p>`
      : '<p style="color: #64748b; font-style: italic;"><em>No additional comments provided.</em></p>';
    
    // Build the section HTML
    sectionsHTML += `
      <div style="margin-bottom: 40px;">
        <h2 style="color: #1e40af; font-size: 22px; margin-bottom: 20px; font-weight: 600;">VC Fund #${vcNumber}: ${escapeHtml(vcName)}</h2>
        
        <h3 style="color: #475569; font-size: 17px; margin-top: 24px; margin-bottom: 12px; font-weight: 600;">Strengths of the startup:</h3>
        ${strengthsHTML}
        
        <h3 style="color: #475569; font-size: 17px; margin-top: 24px; margin-bottom: 12px; font-weight: 600;">Main areas that need improvement:</h3>
        ${improvements}
        
        <h3 style="color: #475569; font-size: 17px; margin-top: 24px; margin-bottom: 12px; font-weight: 600;">Aspects of the pitch that need further development:</h3>
        ${pitchDevelopment}
        
        <h3 style="color: #475569; font-size: 17px; margin-top: 24px; margin-bottom: 12px; font-weight: 600;">Key areas the team should focus on:</h3>
        ${focusAreas}
        
        <h3 style="color: #475569; font-size: 17px; margin-top: 24px; margin-bottom: 12px; font-weight: 600;">Additional comments:</h3>
        ${additionalComments}
      </div>
      
      ${index < evaluations.length - 1 ? '<hr style="margin: 40px 0; border: 0; border-top: 1px solid #e5e7eb;">' : ''}
    `;
  });
  
  console.log(`Successfully built ${evaluations.length} VC feedback sections`);
  return sectionsHTML;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: IndividualResultRequest = await req.json();
    console.log("Processing individual result email:", {
      startupId: requestData.startupId,
      startupName: requestData.startupName,
      communicationType: requestData.communicationType,
      roundName: requestData.roundName,
      recipientEmail: requestData.recipientEmail
    });

    // Map frontend communication types to template categories
    const templateCategoryMap = {
      'selected': 'founder_selection',
      'rejected': 'founder_rejection',
      'under-review': 'founder_under_review',
      'top-100-feedback': 'top-100-feedback'
    };
    
    const templateCategory = templateCategoryMap[requestData.communicationType];
    const internalType = requestData.communicationType === 'selected' ? 'selection' : 
                        requestData.communicationType === 'rejected' ? 'rejection' : 'under-review';

    // Get email template from database
    let template: EmailTemplate | null = null;
    let subject = "";
    let body = "";

    // Fetch template from database
    const { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('category', templateCategory)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (templateError || !templateData) {
      console.error("Template fetch error:", templateError);
      console.log("Using fallback template for category:", templateCategory);
      
      // Use fallback template
      const fallback = getDefaultContentByCategory(templateCategory);
      subject = fallback.subject;
      body = fallback.body;
    } else {
      template = templateData as EmailTemplate;
      subject = template.subject_template;
      body = template.body_template;
    }

    // Prepare variables for substitution
    const variables: Record<string, string> = {
      founder_name: requestData.startupName, // Using startup name as founder name for now
      startup_name: requestData.startupName,
      round_name: requestData.roundName,
      feedback_summary: requestData.feedbackSummary || 'No specific feedback provided',
      custom_message: requestData.customMessage || ''
    };

    // Handle top-100-feedback template with dynamic VC sections
    if (templateCategory === 'top-100-feedback') {
      console.log('Building dynamic VC feedback sections for startup:', requestData.startupId);
      const vcFeedbackSections = await buildVCFeedbackSections(
        requestData.startupId,
        requestData.roundName
      );
      variables['vc_feedback_sections'] = vcFeedbackSections;
      variables['founder_name'] = requestData.startupName;
      console.log('VC feedback sections built successfully');
    }

    // Apply variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Determine recipient email and test mode BEFORE creating communication record
    let actualRecipient = requestData.recipientEmail;
    let isTestEmail = false;

    if (TEST_MODE) {
      // Map communication types to sandbox emails for testing
      const sandboxEmails = {
        'selection': 'delivered+selection@resend.dev',
        'rejection': 'delivered+rejection@resend.dev', 
        'under-review': 'delivered+pending@resend.dev'
      };
      
      actualRecipient = sandboxEmails[internalType] || 'delivered@resend.dev';
      isTestEmail = true;
      
      console.log(`🧪 SANDBOX MODE: Routing email from ${requestData.recipientEmail} to ${actualRecipient}`);
    }

    // Generate content hash for duplicate prevention using Web Crypto API
    const contentString = `${requestData.recipientEmail}:${subject}:${requestData.roundName}:${internalType}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const contentHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check for duplicates - prevent sending same type of result email for same round (skipped in test mode)
    let isDuplicate = false;
    let existing: { id: string; created_at: string } | null = null;
    if (!TEST_MODE) {
      const { data: existingRecord, error: duplicateError } = await supabase
        .from('email_communications')
        .select('id, created_at')
        .eq('recipient_id', requestData.startupId)
        .eq('recipient_type', 'startup')
        .eq('round_name', requestData.roundName)
        .eq('communication_type', internalType)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();
      if (existingRecord && !duplicateError) {
        isDuplicate = true;
        existing = existingRecord;
        console.log("Duplicate result email detected:", existingRecord.id);
        console.log("Duplicate result email prevented (production mode):", existingRecord.id);
        return new Response(JSON.stringify({ 
          message: `${internalType} email already sent for this round`,
          duplicateId: existingRecord.id 
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
        recipient_email: requestData.recipientEmail,
        recipient_type: 'startup',
        recipient_id: requestData.startupId,
        subject,
        body,
        content_hash: contentHash,
        round_name: requestData.roundName,
        communication_type: internalType,
        status: 'pending',
        metadata: {
          startup_name: requestData.startupName,
          feedback_included: !!requestData.feedbackSummary,
          custom_message_included: !!requestData.customMessage,
          test_mode: isTestEmail,
          original_recipient: isTestEmail ? requestData.recipientEmail : null,
          sandbox_recipient: isTestEmail ? actualRecipient : null
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
      const fromAddress = getFromAddress();
      console.log(`📧 EMAIL CONFIG: TEST_MODE=${TEST_MODE}, From=${fromAddress}, Original recipient=${requestData.recipientEmail}, Actual recipient=${actualRecipient}`);
      
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

      console.log("Resend API response:", emailResponse);

      // Check for Resend API errors
      if (emailResponse.error) {
        console.error("Resend API returned error:", emailResponse.error);
        
        // Update communication record with error
        await supabase
          .from('email_communications')
          .update({
            status: 'failed',
            error_message: `Resend API error: ${emailResponse.error.message || 'Unknown error'}`
          })
          .eq('id', communication.id);

        return new Response(JSON.stringify({ 
          error: "Failed to send result email",
          details: emailResponse.error.message || 'Resend API error'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Only update to 'sent' if we have a successful response with ID
      if (!emailResponse.data?.id) {
        console.error("Resend API did not return email ID:", emailResponse);
        
        await supabase
          .from('email_communications')
          .update({
            status: 'failed',
            error_message: 'Resend API did not return email ID'
          })
          .eq('id', communication.id);

        return new Response(JSON.stringify({ 
          error: "Failed to send result email",
          details: "No email ID returned from Resend"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("✅ Result email sent successfully via Resend with ID:", emailResponse.data.id);

      // Update communication record with Resend ID and status
      await supabase
        .from('email_communications')
        .update({
          resend_email_id: emailResponse.data.id,
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
          resend_event_id: emailResponse.data.id,
          raw_payload: { resend_response: emailResponse }
        });

      return new Response(JSON.stringify({
        success: true,
        communicationId: communication.id,
        resendId: emailResponse.data.id,
        message: `${internalType} email sent successfully to ${requestData.startupName}`,
        testMode: isTestEmail,
        actualRecipient: actualRecipient,
        isDuplicate: isDuplicate,
        duplicateInfo: null // Simplified since we're not tracking duplicates in test mode
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (resendError: any) {
      console.error("Resend API exception:", resendError);
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
        error: "Failed to send result email",
        details: errMsg
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in send-individual-result function:", error);
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
              {{feedback_summary}}
            </div>
          </div>
          
          <p>We strongly encourage you to apply again in future rounds. Innovation is a journey, and we would love to see how <strong>{{startup_name}}</strong> evolves.</p>
          
          <p>Keep building, keep innovating!</p>
        `
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
            <h3 style="color: #334155; margin-top: 0; font-size: 18px;">Evaluation Feedback</h3>
            <div style="color: #475569; font-style: italic;">
              {{feedback}}
            </div>
          </div>
          
          <p>This is an exciting milestone for <strong>{{startup_name}}</strong>. We look forward to seeing your continued success!</p>
        `
      })
    },
    
    'founder_under_review': {
      subject: 'Application Update - {{startup_name}} Under Review',
      body: createProfessionalEmailTemplate({
        title: 'Your Application is Under Review',
        body: `
          <p>Dear <strong>{{founder_name}}</strong>,</p>
          <p>Thank you for submitting <strong>{{startup_name}}</strong> to Aurora Tech Awards. Your application is currently under review by our expert evaluation panel.</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0; font-size: 18px;">Review Status</h3>
            <ul style="color: #b45309; margin: 0; padding-left: 20px;">
              <li>Your startup is being evaluated by our expert panel</li>
              <li>We expect to have results soon</li>
              <li>No action is required from your side at this time</li>
            </ul>
          </div>
          
          <p>We appreciate your patience as we complete our thorough evaluation process. We will notify you as soon as the review is complete.</p>
        `
      })
    }
  };

  return defaults[category as keyof typeof defaults] || {
    subject: 'Aurora Tech Awards Update',
    body: createProfessionalEmailTemplate({
      title: 'Update from Aurora Tech Awards',
      body: '<p>Thank you for your participation in Aurora Tech Awards.</p>'
    })
  };
};

serve(handler);
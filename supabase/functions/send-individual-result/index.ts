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
  communicationType: 'selected' | 'rejected' | 'under-review';
  roundName: string;
  feedbackSummary?: string;
  customMessage?: string;
}

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

    // Map frontend communication types to internal types
    const communicationTypeMap = {
      'selected': 'selection',
      'rejected': 'rejection',
      'under-review': 'under-review'
    };
    
    const internalType = communicationTypeMap[requestData.communicationType] || requestData.communicationType;

    // Generate email content based on communication type
    let subject: string;
    let body: string;

    switch (internalType) {
      case 'selection':
        subject = requestData.roundName === 'screening' 
          ? `🎉 Congratulations! ${requestData.startupName} has been selected for the Pitching Round`
          : `🎉 Congratulations! ${requestData.startupName} has been selected as a Finalist`;
        
        body = requestData.roundName === 'screening' 
          ? `<h2>Congratulations!</h2>
             <p>We're excited to inform you that <strong>${requestData.startupName}</strong> has been selected to advance to the Pitching Round of our evaluation process.</p>
             
             <h3>Next Steps:</h3>
             <ul>
               <li>You will receive a calendar invite for your pitch session</li>
               <li>Prepare a 10-minute presentation followed by Q&A</li>
               <li>Review the attached pitch guidelines</li>
             </ul>
             
             ${requestData.feedbackSummary ? `<h3>Feedback Summary:</h3><div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><pre style="white-space: pre-wrap;">${requestData.feedbackSummary}</pre></div>` : ''}
             
             <p>We look forward to seeing your presentation!</p>
             
             <p>Best regards,<br>The Aurora Team</p>`
          : `<h2>Congratulations!</h2>
             <p>We're thrilled to inform you that <strong>${requestData.startupName}</strong> has been selected as a Finalist in our evaluation process.</p>
             
             <h3>What this means:</h3>
             <ul>
               <li>You are among our top selected startups</li>
               <li>Further partnership opportunities may be available</li>
               <li>You will receive detailed feedback from our evaluation panel</li>
             </ul>
             
             ${requestData.feedbackSummary ? `<h3>Feedback Summary:</h3><div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><pre style="white-space: pre-wrap;">${requestData.feedbackSummary}</pre></div>` : ''}
             
             <p>We are excited to continue our relationship with your startup!</p>
             
             <p>Best regards,<br>The Aurora Team</p>`;
        break;

      case 'rejection':
        subject = `Thank you for your participation - ${requestData.startupName}`;
        body = `<h2>Thank you for your participation</h2>
               <p>Thank you for participating in our startup evaluation process. After careful consideration by our evaluation panel, we have decided not to move forward with <strong>${requestData.startupName}</strong> at this time.</p>
               
               ${requestData.feedbackSummary ? `<h3>Your Feedback:</h3><div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><pre style="white-space: pre-wrap;">${requestData.feedbackSummary}</pre></div>` : ''}
               
               <p>While we cannot proceed with your startup in this round, we were impressed by your dedication and innovation. We encourage you to:</p>
               <ul>
                 <li>Continue developing your business based on the feedback provided</li>
                 <li>Consider applying to future programs</li>
                 <li>Stay connected with our community</li>
               </ul>
               
               <p>Best regards,<br>The Aurora Team</p>`;
        break;

      case 'under-review':
        subject = `Your Application Status - ${requestData.startupName} Under Review`;
        body = `<h2>Application Under Review</h2>
               <p>Thank you for participating in our startup evaluation process. <strong>${requestData.startupName}</strong> is currently under review by our evaluation panel.</p>
               
               <h3>Current Status:</h3>
               <ul>
                 <li>Your startup is being evaluated by our expert panel</li>
                 <li>We expect to have results soon</li>
                 <li>No action is required from your side at this time</li>
               </ul>
               
               <p>We appreciate your patience as we complete our thorough evaluation process.</p>
               
               <p>Best regards,<br>The Aurora Team</p>`;
        break;

      default:
        throw new Error(`Invalid communication type: ${requestData.communicationType} (mapped to: ${internalType})`);
    }

    // Add custom message if provided
    if (requestData.customMessage) {
      body = body.replace('<p>Best regards,<br>The Aurora Team</p>', 
        `<h3>Additional Message:</h3><p>${requestData.customMessage}</p><p>Best regards,<br>The Aurora Team</p>`);
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

serve(handler);
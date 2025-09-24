import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  recipientEmail: string;
  subject?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TestEmailRequest = await req.json();
    console.log("Processing test email request:", { 
      recipientEmail: requestData.recipientEmail,
      subject: requestData.subject
    });

    const fromAddress = Deno.env.get("RESEND_FROM") || "Aurora Tech Awards <noreply@resend.dev>";
    const subject = requestData.subject || "Test Email from Aurora Tech Awards";
    const message = requestData.message || "This is a test email to verify the email system is working correctly.";

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [requestData.recipientEmail],
      subject,
      html: `
        <h1>${subject}</h1>
        <p>${message}</p>
        <p>Sent at: ${new Date().toISOString()}</p>
        <p>From: ${fromAddress}</p>
      `,
    });

    console.log("Resend API response:", emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend returned error:", emailResponse.error);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to send test email",
        details: emailResponse.error.message || 'Resend API error',
        resendError: emailResponse.error
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Email sent successfully
    console.log("Test email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify({
      success: true,
      resendId: emailResponse.data?.id,
      message: "Test email sent successfully",
      sentTo: requestData.recipientEmail,
      sentAt: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-test-email function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
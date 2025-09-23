import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendWebhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    [key: string]: any;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    console.log("Received Resend webhook:", {
      headers: Object.keys(headers),
      payloadLength: payload.length
    });

    // Verify webhook signature if secret is configured
    if (resendWebhookSecret) {
      try {
        const webhook = new Webhook(resendWebhookSecret);
        webhook.verify(payload, headers);
      } catch (error) {
        console.error("Webhook verification failed:", error);
        return new Response("Unauthorized", { 
          status: 401,
          headers: corsHeaders 
        });
      }
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    console.log("Processing webhook event:", {
      type: event.type,
      emailId: event.data.email_id,
      to: event.data.to,
      subject: event.data.subject
    });

    // Find the communication record by Resend email ID
    const { data: communication, error: commError } = await supabase
      .from('email_communications')
      .select('id, status')
      .eq('resend_email_id', event.data.email_id)
      .single();

    if (commError || !communication) {
      console.warn("Communication not found for email ID:", event.data.email_id);
      return new Response(JSON.stringify({ 
        message: "Communication not found",
        email_id: event.data.email_id 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Map Resend event types to our event types
    const eventTypeMapping: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delivery_delayed',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.opened': 'opened',
      'email.clicked': 'clicked'
    };

    const mappedEventType = eventTypeMapping[event.type];
    if (!mappedEventType) {
      console.warn("Unknown event type:", event.type);
      return new Response(JSON.stringify({ message: "Unknown event type" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create delivery event record
    await supabase
      .from('email_delivery_events')
      .insert({
        communication_id: communication.id,
        event_type: mappedEventType,
        timestamp: event.created_at,
        resend_event_id: event.data.email_id,
        raw_payload: event
      });

    // Update communication status and timestamps
    const updateData: any = {};
    
    switch (mappedEventType) {
      case 'delivered':
        updateData.status = 'delivered';
        updateData.delivered_at = event.created_at;
        break;
      case 'bounced':
        updateData.status = 'bounced';
        updateData.bounced_at = event.created_at;
        updateData.error_message = event.data.reason || 'Email bounced';
        break;
      case 'complained':
        updateData.status = 'complained';
        updateData.error_message = 'Recipient marked as spam';
        break;
      case 'opened':
        if (communication.status !== 'clicked') { // Don't downgrade from clicked to opened
          updateData.status = 'opened';
        }
        updateData.opened_at = event.created_at;
        break;
      case 'clicked':
        updateData.status = 'clicked';
        updateData.clicked_at = event.created_at;
        if (!communication.opened_at) {
          updateData.opened_at = event.created_at; // Assume opened if clicked
        }
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('email_communications')
        .update(updateData)
        .eq('id', communication.id);

      console.log("Updated communication:", {
        communicationId: communication.id,
        updates: updateData
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processed successfully",
      event_type: mappedEventType
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error processing Resend webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
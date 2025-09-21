import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailWebhookPayload {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  date: string;
}

interface CalendarEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  attendees: string[];
  location?: string;
  description?: string;
  uid: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const emailData: EmailWebhookPayload = await req.json();
    console.log("Received email webhook:", { 
      from: emailData.from, 
      subject: emailData.subject,
      attachmentCount: emailData.attachments?.length || 0
    });

    // Parse .ics attachments
    let calendarEvent: CalendarEvent | null = null;
    
    if (emailData.attachments) {
      for (const attachment of emailData.attachments) {
        if (attachment.filename.endsWith('.ics') || attachment.contentType === 'text/calendar') {
          calendarEvent = parseIcsContent(attachment.content);
          break;
        }
      }
    }

    // If no .ics attachment, try parsing from email body
    if (!calendarEvent && emailData.body.includes('BEGIN:VCALENDAR')) {
      calendarEvent = parseIcsContent(emailData.body);
    }

    if (!calendarEvent) {
      console.log("No calendar event found in email");
      return new Response(JSON.stringify({ success: false, message: "No calendar event found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Parsed calendar event:", calendarEvent);

    // Extract attendee emails
    const attendeeEmails = [
      emailData.from,
      ...emailData.to,
      ...(emailData.cc || []),
      ...calendarEvent.attendees
    ].map(email => email.toLowerCase().trim());

    // Find matching startup and juror
    const { data: startups } = await supabase
      .from('startups')
      .select('id, contact_email, name')
      .in('contact_email', attendeeEmails);

    const { data: jurors } = await supabase
      .from('jurors')
      .select('id, email, name, user_id')
      .in('email', attendeeEmails);

    if (!startups?.length || !jurors?.length) {
      console.log("Could not match attendees to startups/jurors", { 
        attendeeEmails, 
        startupsFound: startups?.length, 
        jurorsFound: jurors?.length 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Could not match attendees to database records" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or update pitch request
    const pitchRequestData = {
      startup_id: startups[0].id,
      vc_id: jurors[0].user_id,
      pitch_date: new Date(calendarEvent.dtstart).toISOString(),
      status: 'scheduled',
      meeting_notes: calendarEvent.description || '',
      calendly_link: calendarEvent.location || '',
      request_date: new Date(emailData.date).toISOString(),
    };

    // Check if request already exists for this event
    const { data: existingRequest } = await supabase
      .from('pitch_requests')
      .select('id')
      .eq('startup_id', pitchRequestData.startup_id)
      .eq('vc_id', pitchRequestData.vc_id)
      .eq('pitch_date', pitchRequestData.pitch_date)
      .single();

    let result;
    if (existingRequest) {
      // Update existing request
      result = await supabase
        .from('pitch_requests')
        .update(pitchRequestData)
        .eq('id', existingRequest.id);
    } else {
      // Create new request
      result = await supabase
        .from('pitch_requests')
        .insert([pitchRequestData]);
    }

    if (result.error) {
      throw result.error;
    }

    console.log("Successfully processed calendar event:", {
      startup: startups[0].name,
      juror: jurors[0].name,
      date: calendarEvent.dtstart,
      action: existingRequest ? 'updated' : 'created'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Pitch request ${existingRequest ? 'updated' : 'created'} successfully`,
      data: {
        startup: startups[0].name,
        juror: jurors[0].name,
        date: calendarEvent.dtstart
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error processing calendar email:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

function parseIcsContent(icsContent: string): CalendarEvent | null {
  try {
    const lines = icsContent.split(/\r\n|\n|\r/);
    const event: Partial<CalendarEvent> = { attendees: [] };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('SUMMARY:')) {
        event.summary = line.substring(8);
      } else if (line.startsWith('DTSTART')) {
        const dateMatch = line.match(/DTSTART[^:]*:(.+)/);
        if (dateMatch) {
          event.dtstart = parseIcsDate(dateMatch[1]);
        }
      } else if (line.startsWith('DTEND')) {
        const dateMatch = line.match(/DTEND[^:]*:(.+)/);
        if (dateMatch) {
          event.dtend = parseIcsDate(dateMatch[1]);
        }
      } else if (line.startsWith('ATTENDEE')) {
        const emailMatch = line.match(/mailto:([^;]+)/i);
        if (emailMatch) {
          event.attendees!.push(emailMatch[1]);
        }
      } else if (line.startsWith('LOCATION:')) {
        event.location = line.substring(9);
      } else if (line.startsWith('DESCRIPTION:')) {
        event.description = line.substring(12);
      } else if (line.startsWith('UID:')) {
        event.uid = line.substring(4);
      }
    }
    
    if (event.summary && event.dtstart && event.uid) {
      return event as CalendarEvent;
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing ICS content:", error);
    return null;
  }
}

function parseIcsDate(dateString: string): string {
  // Handle YYYYMMDDTHHMMSSZ format
  if (dateString.includes('T')) {
    const cleanDate = dateString.replace(/[TZ]/g, '');
    const year = cleanDate.substring(0, 4);
    const month = cleanDate.substring(4, 6);
    const day = cleanDate.substring(6, 8);
    const hour = cleanDate.substring(8, 10) || '00';
    const minute = cleanDate.substring(10, 12) || '00';
    const second = cleanDate.substring(12, 14) || '00';
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
  }
  
  // Handle YYYYMMDD format (all-day events)
  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);
  
  return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
}

serve(handler);
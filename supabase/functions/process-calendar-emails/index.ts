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
    
    const attachments = Array.isArray(emailData.attachments) ? emailData.attachments : [];
    for (const attachment of attachments) {
      const filename = (attachment as any)?.filename ?? '';
      const contentType = (attachment as any)?.contentType ?? '';
      const content = (attachment as any)?.content ?? '';
      const isIcsByName = typeof filename === 'string' && filename.toLowerCase().endsWith('.ics');
      const isIcsByType = typeof contentType === 'string' && contentType.toLowerCase().includes('calendar');
      const isIcsByContent = typeof content === 'string' && content.includes('BEGIN:VCALENDAR');
      if (isIcsByName || isIcsByType || isIcsByContent) {
        console.log('Found ICS candidate attachment:', { filename, contentType, length: (content?.length ?? 0) });
        calendarEvent = parseIcsContent(content);
        if (calendarEvent) break;
      }
    }

    // If no .ics attachment, try parsing from email body
    if (!calendarEvent && (emailData.body?.includes?.('BEGIN:VCALENDAR'))) {
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
    const toList = Array.isArray(emailData.to) ? emailData.to : (emailData.to ? [emailData.to as unknown as string] : []);
    const ccList = Array.isArray(emailData.cc) ? emailData.cc : [];
    const calAttendees = Array.isArray(calendarEvent.attendees) ? calendarEvent.attendees : [];
    const attendeeEmails = [
      emailData.from,
      ...toList,
      ...ccList,
      ...calAttendees
    ]
      .filter((e): e is string => typeof e === 'string' && e)
      .map(e => e.toLowerCase().trim());

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

    // Find existing pitching assignment
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('pitching_assignments')
      .select('id, status')
      .eq('startup_id', startups[0].id)
      .eq('juror_id', jurors[0].id)
      .single();

    if (assignmentError || !existingAssignment) {
      console.log("Could not find matching pitching assignment", { 
        startup_id: startups[0].id, 
        juror_id: jurors[0].id,
        error: assignmentError 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No matching pitching assignment found" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update pitching assignment with meeting details
    const assignmentUpdateData = {
      meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
      status: 'scheduled',
      meeting_notes: calendarEvent.description || '',
      calendly_link: calendarEvent.location || '',
    };

    const result = await supabase
      .from('pitching_assignments')
      .update(assignmentUpdateData)
      .eq('id', existingAssignment.id);

    if (result.error) {
      throw result.error;
    }

    // Always create/update CM calendar invitation for every processed calendar event
    const cmInvitationData = {
      startup_id: startups[0].id,
      juror_id: jurors[0].id,
      pitching_assignment_id: existingAssignment.id,
      calendar_uid: calendarEvent.uid,
      event_summary: calendarEvent.summary,
      event_description: calendarEvent.description,
      event_location: calendarEvent.location,
      event_start_date: new Date(calendarEvent.dtstart).toISOString(),
      event_end_date: calendarEvent.dtend ? new Date(calendarEvent.dtend).toISOString() : null,
      attendee_emails: calendarEvent.attendees || [],
      status: 'scheduled'
    };

    // Upsert CM calendar invitation (insert or update if exists based on calendar_uid)
    const cmResult = await supabase
      .from('cm_calendar_invitations')
      .upsert(cmInvitationData, { 
        onConflict: 'calendar_uid',
        ignoreDuplicates: false 
      });

    if (cmResult.error) {
      console.error("Error creating/updating CM calendar invitation:", cmResult.error);
      // Don't throw error for CM invitation failures to avoid breaking main workflow
    } else {
      console.log("CM calendar invitation created/updated successfully for:", {
        startup: startups[0].name,
        juror: jurors[0].name,
        calendar_uid: calendarEvent.uid
      });
    }

    console.log("Successfully processed calendar event:", {
      startup: startups[0].name,
      juror: jurors[0].name,
      date: calendarEvent.dtstart,
      action: 'updated assignment'
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Pitching assignment updated successfully",
      data: {
        startup: startups[0].name,
        juror: jurors[0].name,
        date: calendarEvent.dtstart,
        status: 'scheduled'
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
    const unfolded = icsContent
      .replace(/\r\n[ \t]/g, '')
      .replace(/\n[ \t]/g, '');
    const lines = unfolded.split(/\r\n|\n|\r/);
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
  try {
    if (!dateString) return '';
    const ds = String(dateString).trim();
    // Handle YYYYMMDDTHHMMSSZ or similar
    if (ds.includes('T')) {
      const cleanDate = ds.replace(/[TZ]/g, '');
      const year = cleanDate.substring(0, 4);
      const month = cleanDate.substring(4, 6);
      const day = cleanDate.substring(6, 8);
      const hour = cleanDate.substring(8, 10) || '00';
      const minute = cleanDate.substring(10, 12) || '00';
      const second = cleanDate.substring(12, 14) || '00';
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`).toISOString();
    }
    // Handle YYYYMMDD format (all-day events)
    const year = ds.substring(0, 4);
    const month = ds.substring(4, 6);
    const day = ds.substring(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
  } catch (_) {
    return '';
  }
}

serve(handler);
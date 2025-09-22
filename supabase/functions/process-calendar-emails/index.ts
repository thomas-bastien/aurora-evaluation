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
  // New field for pre-parsed calendar data from Zapier
  parsed_calendar_event?: {
    summary: string;
    start_time: string;
    end_time: string;
    attendees: string[];
    location?: string;
    description?: string;
    uid?: string;
  };
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
      attachmentCount: emailData.attachments?.length || 0,
      hasParsedEvent: !!emailData.parsed_calendar_event
    });

    // Check for pre-parsed calendar event from Zapier first
    let calendarEvent: CalendarEvent | null = null;
    
    if (emailData.parsed_calendar_event) {
      console.log("Using pre-parsed calendar event from Zapier:", emailData.parsed_calendar_event);
      
      // Convert Zapier format to internal format
      calendarEvent = {
        summary: emailData.parsed_calendar_event.summary,
        dtstart: emailData.parsed_calendar_event.start_time,
        dtend: emailData.parsed_calendar_event.end_time,
        attendees: emailData.parsed_calendar_event.attendees || [],
        location: emailData.parsed_calendar_event.location,
        description: emailData.parsed_calendar_event.description,
        uid: emailData.parsed_calendar_event.uid || `zapier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log("Converted to internal calendar event format:", calendarEvent);
    } else {
      console.log("No pre-parsed calendar event found, attempting ICS parsing...");
      
      // Fallback to existing ICS parsing logic
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
    }

    if (!calendarEvent) {
      console.log("No calendar event found - neither pre-parsed from Zapier nor ICS data in email");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No calendar event found - ensure Zapier is configured to send parsed calendar data or include ICS attachments" 
      }), {
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

    console.log("Found attendees:", {
      attendeeEmails,
      startupsFound: startups?.length || 0,
      jurorsFound: jurors?.length || 0
    });

    let matchingStatus = 'unmatched';
    let matchingErrors: string[] = [];
    let startup = null;
    let juror = null;
    let assignment = null;

    // Always create CM calendar invitation, regardless of matching success
    if (startups?.length && jurors?.length) {
      startup = startups[0];
      juror = jurors[0];
      
      // Try to find existing pitching assignment
      const { data: existingAssignment, error: assignmentError } = await supabase
        .from('pitching_assignments')
        .select('id, status')
        .eq('startup_id', startup.id)
        .eq('juror_id', juror.id)
        .single();

      if (existingAssignment) {
        assignment = existingAssignment;
        matchingStatus = 'auto_matched';
        
        // Update the pitching assignment with meeting details
        const { error: updateError } = await supabase
          .from('pitching_assignments')
          .update({
            meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
            calendly_link: calendarEvent.location,
            meeting_notes: calendarEvent.description,
            status: 'scheduled'
          })
          .eq('id', assignment.id);

        if (updateError) {
          console.error('Error updating pitching assignment:', updateError);
          matchingErrors.push('Failed to update pitching assignment');
          matchingStatus = 'partial_match';
        }
      } else {
        // Auto-create pitching assignment if startup and juror found but no assignment exists
        const { data: newAssignment, error: createError } = await supabase
          .from('pitching_assignments')
          .insert({
            startup_id: startup.id,
            juror_id: juror.id,
            meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
            calendly_link: calendarEvent.location,
            meeting_notes: calendarEvent.description,
            status: 'scheduled'
          })
          .select('id')
          .single();

        if (newAssignment) {
          assignment = newAssignment;
          matchingStatus = 'auto_matched';
          console.log("Auto-created pitching assignment for:", {
            startup: startup.name,
            juror: juror.name
          });
        } else {
          console.error('Error creating pitching assignment:', createError);
          matchingErrors.push('Failed to create pitching assignment');
          matchingStatus = 'partial_match';
        }
      }
    } else {
      // No matching startup/juror found
      if (!startups?.length) matchingErrors.push('No matching startup found in attendees');
      if (!jurors?.length) matchingErrors.push('No matching juror found in attendees');
    }

    // Create or update CM calendar invitation (always, regardless of matching success)
    const cmInvitationData = {
      calendar_uid: calendarEvent.uid,
      startup_id: startup?.id || null,
      juror_id: juror?.id || null,
      pitching_assignment_id: assignment?.id || null,
      event_summary: calendarEvent.summary,
      event_description: calendarEvent.description,
      event_location: calendarEvent.location,
      event_start_date: new Date(calendarEvent.dtstart).toISOString(),
      event_end_date: calendarEvent.dtend ? new Date(calendarEvent.dtend).toISOString() : null,
      attendee_emails: attendeeEmails,
      status: matchingStatus === 'auto_matched' ? 'scheduled' : 'unmatched',
      matching_status: matchingStatus,
      matching_errors: matchingErrors,
      manual_assignment_needed: matchingStatus !== 'auto_matched'
    };

    const cmResult = await supabase
      .from('cm_calendar_invitations')
      .upsert(cmInvitationData, { 
        onConflict: 'calendar_uid',
        ignoreDuplicates: false 
      });

    if (cmResult.error) {
      console.error('Error creating/updating CM calendar invitation:', cmResult.error);
      throw cmResult.error;
    }

    if (matchingStatus === 'auto_matched') {
      console.log("Successfully auto-matched calendar event:", {
        startup: startup.name,
        juror: juror.name,
        date: calendarEvent.dtstart,
        assignment_id: assignment.id
      });
    } else {
      console.log("Calendar event saved but requires manual matching:", {
        calendar_uid: calendarEvent.uid,
        matching_errors: matchingErrors,
        attendee_emails: attendeeEmails
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: matchingStatus === 'auto_matched' ? "Calendar event processed successfully" : "Calendar event saved, manual matching required",
      data: {
        startup: startup?.name || 'Unknown',
        juror: juror?.name || 'Unknown',
        date: calendarEvent.dtstart,
        matching_status: matchingStatus,
        matching_errors: matchingErrors
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
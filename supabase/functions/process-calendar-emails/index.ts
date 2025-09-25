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
  method?: string;
  sequence?: number;
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
      .filter((e): e is string => typeof e === 'string' && Boolean(e))
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

    // Check for existing calendar invitation to detect lifecycle changes
    const { data: existingInvitation } = await supabase
      .from('cm_calendar_invitations')
      .select('*')
      .eq('calendar_uid', calendarEvent.uid)
      .maybeSingle();

  // Detect lifecycle changes
  const eventMethod = calendarEvent.method || 'REQUEST';
  const sequenceNumber = calendarEvent.sequence || 0;
  let lifecycleStatus = 'scheduled'; // Default all new invitations to scheduled
  let matchingStatus = 'pending_cm_review'; // Default matching status for new invitations
    const lifecycleHistory = existingInvitation?.lifecycle_history || [];

    if (existingInvitation) {
      const previousEventDate = existingInvitation.event_start_date;
      const newEventDate = new Date(calendarEvent.dtstart).toISOString();
      
      // Determine lifecycle status based on changes
      if (eventMethod === 'CANCEL') {
        lifecycleStatus = 'cancelled';
        matchingStatus = 'cancelled';
      } else if (previousEventDate !== newEventDate) {
        lifecycleStatus = 'rescheduled';
        matchingStatus = 'rescheduled';
      } else if (sequenceNumber > (existingInvitation.sequence_number || 0)) {
        lifecycleStatus = 'updated';
        matchingStatus = existingInvitation.matching_status || 'unmatched';
      } else {
        lifecycleStatus = existingInvitation.status || 'scheduled';
        matchingStatus = existingInvitation.matching_status || 'unmatched';
      }

      // Add to lifecycle history
      lifecycleHistory.push({
        timestamp: new Date().toISOString(),
        action: eventMethod,
        sequence: sequenceNumber,
        previous_date: previousEventDate,
        new_date: newEventDate,
        status_change: `${existingInvitation.status} -> ${lifecycleStatus}`
      });
    } else {
      // New invitation - all go to scheduled except cancelled
      if (eventMethod === 'CANCEL') {
        lifecycleStatus = 'cancelled';
        matchingStatus = 'cancelled';
      } else {
        lifecycleStatus = 'scheduled';
        matchingStatus = 'pending_cm_review';
      }
      
      lifecycleHistory.push({
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        sequence: sequenceNumber,
        status: lifecycleStatus
      });
    }

    let matchingErrors: string[] = [];
    let startup = null;
    let juror = null;
    let assignment = null;

    // Check for existing pending assignment for this startup-juror pair
    let existingPendingAssignment = null;
    if (startups?.length && jurors?.length) {
      startup = startups[0];
      juror = jurors[0];

      // Look for existing pending assignments
      const { data: pendingAssignment } = await supabase
        .from('pitching_assignments')
        .select('id, status')
        .eq('startup_id', startup.id)
        .eq('juror_id', juror.id)
        .eq('status', 'pending')
        .single();

      if (pendingAssignment) {
        existingPendingAssignment = pendingAssignment;
        console.log("Found existing pending assignment - setting to in_review:", {
          startup: startup.name,
          juror: juror.name,
          assignmentId: pendingAssignment.id
        });
      }
    }

    // Only update matching if this is a new invitation or if we don't have existing matching data
    if (!existingInvitation || (!existingInvitation.startup_id && !existingInvitation.juror_id)) {
      if (startups?.length && jurors?.length) {
        startup = startups[0];
        juror = jurors[0];
        
        if (lifecycleStatus !== 'cancelled') {
          // If there's an existing pending assignment, set status to scheduled
          if (existingPendingAssignment) {
            matchingStatus = 'pending_cm_review';
            lifecycleStatus = 'scheduled';
            
            // Update the existing assignment status to assigned
            const { error: updateError } = await supabase
              .from('pitching_assignments')
              .update({
                meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
                calendly_link: calendarEvent.location,
                meeting_notes: calendarEvent.description,
                status: 'assigned'
              })
              .eq('id', existingPendingAssignment.id);

            if (updateError) {
              console.error('Error updating pending assignment to in_review:', updateError);
              matchingErrors.push('Failed to update pending assignment');
            } else {
              assignment = existingPendingAssignment;
            }
          } else {
            // All new invitations go to scheduled, even if perfect matches are found
            matchingStatus = 'pending_cm_review';
            lifecycleStatus = 'scheduled';
            
            // Try to find existing pitching assignment
            const { data: existingAssignment, error: assignmentError } = await supabase
              .from('pitching_assignments')
              .select('id, status')
              .eq('startup_id', startup.id)
              .eq('juror_id', juror.id)
              .single();

            if (existingAssignment && existingAssignment.status !== 'pending') {
              assignment = existingAssignment;
              
              // Update the pitching assignment with meeting details but keep assigned status
              const { error: updateError } = await supabase
                .from('pitching_assignments')
                .update({
                  meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
                  calendly_link: calendarEvent.location,
                  meeting_notes: calendarEvent.description,
                  status: lifecycleStatus === 'cancelled' ? 'cancelled' : 'assigned'
                })
                .eq('id', assignment.id);

              if (updateError) {
                console.error('Error updating pitching assignment:', updateError);
                matchingErrors.push('Failed to update pitching assignment');
              }
            } else if (lifecycleStatus !== 'cancelled' && !existingAssignment) {
              // Auto-create pitching assignment if startup and juror found but no assignment exists
              const { data: newAssignment, error: createError } = await supabase
                .from('pitching_assignments')
                .insert({
                  startup_id: startup.id,
                  juror_id: juror.id,
                  meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
                  calendly_link: calendarEvent.location,
                  meeting_notes: calendarEvent.description,
                  status: 'assigned'
                })
                .select('id')
                .single();

              if (newAssignment) {
                assignment = newAssignment;
                console.log("Auto-created pitching assignment for review:", {
                  startup: startup.name,
                  juror: juror.name
                });
              } else {
                console.error('Error creating pitching assignment:', createError);
                matchingErrors.push('Failed to create pitching assignment');
              }
            }
          }
        }
      } else {
        // No matching startup/juror found - still goes to scheduled for manual assignment
        if (!startups?.length) matchingErrors.push('No matching startup found in attendees');
        if (!jurors?.length) matchingErrors.push('No matching juror found in attendees');
        matchingStatus = 'pending_cm_review';
        lifecycleStatus = 'scheduled';
      }
    } else {
      // Keep existing matching but update status appropriately  
      startup = { id: existingInvitation.startup_id };
      juror = { id: existingInvitation.juror_id };
      if (existingInvitation.pitching_assignment_id) {
        assignment = { id: existingInvitation.pitching_assignment_id };
      }
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
      status: lifecycleStatus,
      matching_status: matchingStatus,
      matching_errors: matchingErrors,
      manual_assignment_needed: true, // All new invitations require CM review
      event_method: eventMethod,
      sequence_number: sequenceNumber,
      previous_event_date: existingInvitation?.event_start_date || null,
      lifecycle_history: lifecycleHistory
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

    if (matchingStatus === 'pending_cm_review') {
      console.log("Calendar event routed to CM review:", {
        startup: startup?.name || 'Unknown',
        juror: juror?.name || 'Unknown',
        date: calendarEvent.dtstart,
        assignment_id: assignment?.id || 'None'
      });
    } else {
      console.log("Calendar event processed with status:", {
        calendar_uid: calendarEvent.uid,
        status: lifecycleStatus,
        matching_status: matchingStatus,
        attendee_emails: attendeeEmails
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Calendar event routed to CM review - awaiting approval",
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
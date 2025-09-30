import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

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
    console.log("Received email webhook - Raw data inspection:", {
      from: emailData.from,
      subject: emailData.subject,
      attachmentsType: typeof emailData.attachments,
      attachmentsIsArray: Array.isArray(emailData.attachments),
      attachmentsLength: Array.isArray(emailData.attachments) ? emailData.attachments.length : 'N/A',
      attachmentsSample: emailData.attachments ? 
        JSON.stringify(emailData.attachments).substring(0, 500) : 'none',
      allEmailDataKeys: Object.keys(emailData),
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
      
      let icsContent: string | null = null;

      // STRATEGY 1: Inspect raw attachments field
      console.log("Strategy 1: Analyzing raw attachments field...", {
        type: typeof emailData.attachments,
        isArray: Array.isArray(emailData.attachments),
        constructor: emailData.attachments?.constructor?.name
      });

      // Try direct extraction from attachments field
      icsContent = await extractIcsContent(emailData.attachments);

      // STRATEGY 2: If attachments is an array, try each item
      if (!icsContent && Array.isArray(emailData.attachments)) {
        console.log(`Strategy 2: Processing array of ${emailData.attachments.length} items...`);
        
        // Limit to first 50 items to avoid processing 232 items
        const itemsToCheck = Math.min(emailData.attachments.length, 50);
        
        for (let i = 0; i < itemsToCheck; i++) {
          const item = emailData.attachments[i];
          
          // Log first few items for debugging
          if (i < 3) {
            console.log(`  Item ${i} type:`, typeof item, 
              typeof item === 'object' ? `keys: ${Object.keys(item).join(', ')}` : '');
          }
          
          // Try structured object { filename, content, contentType }
          if (item && typeof item === 'object') {
            // Try common property names
            icsContent = await extractIcsContent(item.content) || 
                         await extractIcsContent(item.data) ||
                         await extractIcsContent(item.body) ||
                         await extractIcsContent(item.file) ||
                         await extractIcsContent(item);
            
            if (icsContent) {
              console.log(`Found ICS in attachment item ${i}`);
              break;
            }
          } else {
            // Try item directly (might be string or number array)
            icsContent = await extractIcsContent(item);
            if (icsContent) {
              console.log(`Found ICS in raw item ${i}`);
              break;
            }
          }
        }
      }

      // STRATEGY 3: Check for flat attachment fields
      if (!icsContent) {
        console.log("Strategy 3: Checking flat fields...");
        const flatFields = [
          'attachment_content',
          'ics_file',
          'calendar_attachment',
          'file_content',
          'ics_content',
          'calendar_data',
          'event_data'
        ];
        
        for (const fieldName of flatFields) {
          const field = (emailData as any)[fieldName];
          if (field) {
            console.log(`  Checking field: ${fieldName}`);
            icsContent = await extractIcsContent(field);
            if (icsContent) {
              console.log(`Found ICS in flat field: ${fieldName}`);
              break;
            }
          }
        }
      }

      // STRATEGY 4: Parse from email body (existing logic)
      if (!icsContent && emailData.body?.includes?.('BEGIN:VCALENDAR')) {
        console.log("Strategy 4: Extracting from email body");
        icsContent = await extractIcsContent(emailData.body);
      }

      // STRATEGY 5: Try to extract ICS from HTML body
      if (!icsContent && emailData.body) {
        console.log("Strategy 5: Looking for ICS in HTML/encoded body");
        // Remove HTML tags
        const textOnly = emailData.body.replace(/<[^>]*>/g, ' ');
        if (textOnly.includes('BEGIN:VCALENDAR')) {
          icsContent = await extractIcsContent(textOnly);
        }
      }

      // Parse the ICS content if found
      if (icsContent) {
        console.log("Successfully extracted ICS content, parsing...");
        calendarEvent = parseIcsContent(icsContent);
      } else {
        console.log("No ICS content found after trying all strategies");
      }
    }

    if (!calendarEvent) {
      console.log("No calendar event found - debugging info:", {
        attachmentsProvided: !!emailData.attachments,
        attachmentsType: typeof emailData.attachments,
        bodyLength: emailData.body?.length || 0,
        bodyContainsVCal: emailData.body?.includes('BEGIN:VCALENDAR') || false,
        allFields: Object.keys(emailData)
      });
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No calendar event found",
        debug: {
          attachmentsReceived: !!emailData.attachments,
          attachmentFormat: typeof emailData.attachments,
          suggestion: "Check Zapier configuration to ensure ICS content is included"
        }
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
  let lifecycleStatus = 'in_review'; // Default all new invitations to in_review for CM approval
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
        // For rescheduled events, keep them in review for CM approval
        lifecycleStatus = 'in_review';
        matchingStatus = 'rescheduled';
      } else if (sequenceNumber > (existingInvitation.sequence_number || 0)) {
        // For minor updates, preserve existing status if it's in_review, otherwise keep existing
        lifecycleStatus = existingInvitation.status === 'in_review' ? 'in_review' : (existingInvitation.status || 'in_review');
        matchingStatus = existingInvitation.matching_status || 'pending_cm_review';
      } else {
        // No significant changes, preserve existing status and matching status
        lifecycleStatus = existingInvitation.status || 'in_review';
        matchingStatus = existingInvitation.matching_status || 'pending_cm_review';
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
        lifecycleStatus = 'in_review';
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
    // Don't override status for rescheduled events - they should keep their 'in_review' status
    if (!existingInvitation || ((!existingInvitation.startup_id && !existingInvitation.juror_id) && matchingStatus !== 'rescheduled')) {
      if (startups?.length && jurors?.length) {
        startup = startups[0];
        juror = jurors[0];
        
        if (lifecycleStatus !== 'cancelled') {
          // If there's an existing pending assignment, set status to in_review for CM approval
          if (existingPendingAssignment) {
            matchingStatus = 'pending_cm_review';
            lifecycleStatus = 'in_review';
            
            // Update the existing assignment - preserve status if it's higher level than 'assigned'
            const preservedStatus = existingPendingAssignment.status === 'pending' ? 'assigned' : existingPendingAssignment.status;
            const { error: updateError } = await supabase
              .from('pitching_assignments')
              .update({
                meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
                calendly_link: calendarEvent.location,
                meeting_notes: calendarEvent.description,
                status: preservedStatus
              })
              .eq('id', existingPendingAssignment.id);

            if (updateError) {
              console.error('Error updating pending assignment to in_review:', updateError);
              matchingErrors.push('Failed to update pending assignment');
            } else {
              assignment = existingPendingAssignment;
            }
          } else {
            // All new invitations go to in_review for CM approval, even if perfect matches are found
            matchingStatus = 'pending_cm_review';
            lifecycleStatus = 'in_review';
            
            // Try to find existing pitching assignment
            const { data: existingAssignment, error: assignmentError } = await supabase
              .from('pitching_assignments')
              .select('id, status')
              .eq('startup_id', startup.id)
              .eq('juror_id', juror.id)
              .single();

            if (existingAssignment && existingAssignment.status !== 'pending') {
              assignment = existingAssignment;
              
              // Update the pitching assignment with meeting details but preserve higher-level statuses
              const preservedStatus = shouldPreserveStatus(existingAssignment.status) 
                ? existingAssignment.status 
                : (lifecycleStatus === 'cancelled' ? 'cancelled' : 'assigned');
              
              const { error: updateError } = await supabase
                .from('pitching_assignments')
                .update({
                  meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
                  calendly_link: calendarEvent.location,
                  meeting_notes: calendarEvent.description,
                  status: preservedStatus
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
        // No matching startup/juror found - still goes to in_review for manual assignment
        if (!startups?.length) matchingErrors.push('No matching startup found in attendees');
        if (!jurors?.length) matchingErrors.push('No matching juror found in attendees');
        matchingStatus = 'pending_cm_review';
        lifecycleStatus = 'in_review';
      }
    } else {
      // Keep existing matching data and preserve rescheduled status
      startup = { id: existingInvitation.startup_id };
      juror = { id: existingInvitation.juror_id };
      if (existingInvitation.pitching_assignment_id) {
        assignment = { id: existingInvitation.pitching_assignment_id };
      }
      
      // For rescheduled events, update the associated assignment with new meeting details
      if (matchingStatus === 'rescheduled' && existingInvitation.pitching_assignment_id && lifecycleStatus !== 'cancelled') {
        // First get the current status to preserve it
        const { data: currentAssignment } = await supabase
          .from('pitching_assignments')
          .select('status')
          .eq('id', existingInvitation.pitching_assignment_id)
          .single();
        
        const preservedStatus = currentAssignment && shouldPreserveStatus(currentAssignment.status) 
          ? currentAssignment.status 
          : 'assigned';
        
        const { error: updateError } = await supabase
          .from('pitching_assignments')
          .update({
            meeting_scheduled_date: new Date(calendarEvent.dtstart).toISOString(),
            calendly_link: calendarEvent.location,
            meeting_notes: calendarEvent.description,
            status: preservedStatus
          })
          .eq('id', existingInvitation.pitching_assignment_id);

        if (updateError) {
          console.error('Error updating assignment for rescheduled event:', updateError);
          matchingErrors.push('Failed to update assignment for rescheduled event');
        }
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

// Helper function to determine if a status should be preserved
function shouldPreserveStatus(status: string): boolean {
  // Preserve higher-level statuses that shouldn't be downgraded
  const preservedStatuses = ['completed', 'cancelled', 'scheduled', 'in_review'];
  return preservedStatuses.includes(status);
}

// Flexible content extractor that handles various input formats
async function extractIcsContent(input: any): Promise<string | null> {
  if (!input) return null;
  
  // Strategy 0: URL Detection & Fetching (for Zapier S3 URLs)
  if (typeof input === 'string') {
    // Remove quotes if URL is wrapped
    const cleanInput = input.replace(/^["']|["']$/g, '');
    
    // Check if it's a URL
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      console.log("🔗 Detected URL, fetching content from:", cleanInput.substring(0, 80) + "...");
      
      try {
        const response = await fetch(cleanInput);
        if (!response.ok) {
          console.error("❌ Failed to fetch URL:", response.status, response.statusText);
          return null;
        }
        
        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        console.log("✅ Successfully fetched content, size:", arrayBuffer.byteLength, "bytes");
        
        // Check if it's a ZIP file (by magic bytes or content-type)
        const uint8Array = new Uint8Array(arrayBuffer);
        const isZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B && // PK magic bytes
                      uint8Array[2] === 0x03 && uint8Array[3] === 0x04;
        
        if (isZip || contentType.includes('zip')) {
          console.log("📦 ZIP file detected, decompressing...");
          
          try {
            const zip = await JSZip.loadAsync(arrayBuffer);
            console.log("📂 ZIP contents:", Object.keys(zip.files).join(', '));
            
            // Find .ics file in ZIP
            const icsFile = Object.keys(zip.files).find(name => 
              name.toLowerCase().endsWith('.ics') && !zip.files[name].dir
            );
            
            if (icsFile) {
              console.log("📅 Found ICS file in ZIP:", icsFile);
              const icsContent = await zip.files[icsFile].async('text');
              
              if (icsContent.includes('BEGIN:VCALENDAR')) {
                console.log("✅ Successfully extracted ICS from ZIP");
                return icsContent;
              }
            } else {
              console.warn("⚠️ No .ics file found in ZIP");
            }
          } catch (zipError) {
            console.error("❌ ZIP decompression failed:", zipError);
          }
        } else {
          // Not a ZIP, treat as plain text/ICS
          const text = new TextDecoder().decode(uint8Array);
          if (text.includes('BEGIN:VCALENDAR')) {
            console.log("✅ Found ICS content in fetched file");
            return text;
          }
        }
        
      } catch (fetchError) {
        console.error("❌ Error fetching from URL:", fetchError);
      }
      
      return null; // URL fetch/processing failed
    }
  }
  
  // Strategy 1: Direct string with ICS content
  if (typeof input === 'string') {
    if (input.includes('BEGIN:VCALENDAR')) {
      console.log("Found ICS in direct string");
      return input;
    }
    
    // Try base64 decode (standard)
    try {
      const decoded = atob(input);
      if (decoded.includes('BEGIN:VCALENDAR')) {
        console.log("Found ICS in base64 string");
        return decoded;
      }
    } catch {}
    
    // Try URL-safe base64
    try {
      const urlSafe = input.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(urlSafe);
      if (decoded.includes('BEGIN:VCALENDAR')) {
        console.log("Found ICS in URL-safe base64");
        return decoded;
      }
    } catch {}
  }
  
  // Strategy 2: Array of numbers (byte array from Zapier)
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === 'number') {
    try {
      const text = new TextDecoder().decode(new Uint8Array(input));
      if (text.includes('BEGIN:VCALENDAR')) {
        console.log("Found ICS in byte array");
        return text;
      }
    } catch (e) {
      console.error("Failed to decode byte array:", e);
    }
  }
  
  // Strategy 3: Buffer-like object { type: 'Buffer', data: [...] }
  if (input.type === 'Buffer' && Array.isArray(input.data)) {
    try {
      const text = new TextDecoder().decode(new Uint8Array(input.data));
      if (text.includes('BEGIN:VCALENDAR')) {
        console.log("Found ICS in Buffer object");
        return text;
      }
    } catch (e) {
      console.error("Failed to decode Buffer:", e);
    }
  }
  
  // Strategy 4: Object with common property names
  if (typeof input === 'object') {
    const possibleContentProps = ['content', 'data', 'body', 'file', 'attachment'];
    for (const prop of possibleContentProps) {
      if (input[prop]) {
        const result = await extractIcsContent(input[prop]);
        if (result) return result;
      }
    }
  }
  
  return null;
}

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
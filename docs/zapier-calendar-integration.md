# Calendar Email Processing - Zapier Integration Guide

## Overview

The `process-calendar-emails` edge function now supports two methods for processing calendar invitations:

1. **Pre-parsed Calendar Events** (Recommended for Zapier) - Direct calendar data extraction
2. **ICS File Parsing** (Legacy) - Parsing ICS attachments or email body content

## Zapier Configuration

### Step 1: Create Email Trigger
1. Create a new Zap with an **Email Parser** or **Gmail** trigger
2. Configure it to capture calendar invitation emails

### Step 2: Extract Calendar Data
Add a **Formatter by Zapier** step with these configurations:

#### Transform → Extract Pattern
Extract the following fields from the email:

**Event Title/Summary:**
- Input: Email Subject
- Pattern: `Meeting Scheduled: (.+)` or similar based on your calendar service

**Start Time:**
- Input: Email Body
- Pattern: Extract ISO date format or convert from readable format

**End Time:**
- Input: Email Body  
- Pattern: Extract ISO date format or convert from readable format

**Attendees:**
- Input: Email Body
- Extract email addresses using pattern: `([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})`

### Step 3: Format Data
Add a **Code by Zapier** step to structure the data:

```javascript
// Input variables from previous steps
const eventTitle = inputData.eventTitle;
const startTime = inputData.startTime; // Should be ISO format
const endTime = inputData.endTime;     // Should be ISO format
const attendeesList = inputData.attendees; // Comma-separated emails
const location = inputData.location || '';
const description = inputData.description || '';

// Convert attendees string to array
const attendeesArray = attendeesList ? attendeesList.split(',').map(email => email.trim()) : [];

// Generate unique UID
const uid = `zapier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Format the parsed calendar event
const parsedCalendarEvent = {
  summary: eventTitle,
  start_time: startTime,
  end_time: endTime,
  attendees: attendeesArray,
  location: location,
  description: description,
  uid: uid
};

// Return the formatted data
output = {
  parsed_calendar_event: parsedCalendarEvent,
  from: inputData.fromEmail,
  to: [inputData.toEmail],
  subject: inputData.subject,
  body: inputData.body,
  date: new Date().toISOString()
};
```

### Step 4: Send to Supabase
Add a **Webhooks by Zapier** action:

- **URL:** `https://fadxytngwiporjqchsem.supabase.co/functions/v1/process-calendar-emails`
- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer [YOUR_SUPABASE_ANON_KEY]`
- **Data:** Use the output from the Code step

## Webhook Payload Format

### New Format (Recommended)
```json
{
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "subject": "Meeting Scheduled: DataViz Pro Pitch Session",
  "body": "Meeting details...",
  "date": "2025-01-25T09:00:00.000Z",
  "parsed_calendar_event": {
    "summary": "DataViz Pro Pitch Session",
    "start_time": "2025-01-25T10:00:00.000Z",
    "end_time": "2025-01-25T11:00:00.000Z",
    "attendees": [
      "info@datavizpro.com",
      "sarah.johnson@techventures.com"
    ],
    "location": "Zoom Meeting",
    "description": "Pitch meeting between DataViz Pro and Sarah Johnson",
    "uid": "zapier-1642345678901-abc123def"
  }
}
```

### Legacy Format (Fallback)
```json
{
  "from": "sender@example.com",
  "to": ["recipient@example.com"],
  "subject": "Meeting invitation",
  "body": "BEGIN:VCALENDAR\nVERSION:2.0...",
  "attachments": [
    {
      "filename": "invite.ics",
      "content": "BEGIN:VCALENDAR\nVERSION:2.0...",
      "contentType": "text/calendar"
    }
  ],
  "date": "2025-01-25T09:00:00.000Z"
}
```

## Testing

### Test Pre-parsed Format
```bash
curl -X POST https://fadxytngwiporjqchsem.supabase.co/functions/v1/process-calendar-emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
  -d '{
    "from": "noreply@calendly.com",
    "to": ["info@datavizpro.com"],
    "subject": "Meeting Scheduled: DataViz Pro Pitch Session",
    "body": "Your meeting has been scheduled",
    "date": "2025-01-25T09:00:00.000Z",
    "parsed_calendar_event": {
      "summary": "DataViz Pro Pitch Session",
      "start_time": "2025-01-25T10:00:00.000Z",
      "end_time": "2025-01-25T11:00:00.000Z",
      "attendees": ["info@datavizpro.com", "sarah.johnson@techventures.com"],
      "location": "Zoom Meeting",
      "description": "Pitch meeting between DataViz Pro and Sarah Johnson",
      "uid": "test-meeting-12345"
    }
  }'
```

## Troubleshooting

### Common Issues

1. **No attendees found in database**
   - Ensure startup `contact_email` and juror `email` fields match attendee emails exactly
   - Check for case sensitivity and whitespace

2. **Invalid date formats**
   - Ensure dates are in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
   - Use JavaScript `new Date().toISOString()` to format dates

3. **Missing required fields**
   - `summary`, `start_time`, and either `uid` or auto-generated UID are required
   - `attendees` array should contain valid email addresses

### Debugging

Check the Supabase Edge Function logs for detailed processing information:
- Successful parsing will show "Using pre-parsed calendar event from Zapier"
- Fallback attempts will show "No pre-parsed calendar event found, attempting ICS parsing"
- Matching results will show startup/juror found status

## Benefits of Pre-parsed Format

1. **Reliability** - No dependency on ICS attachment parsing
2. **Performance** - Direct data access without text parsing
3. **Flexibility** - Easy to customize field extraction logic
4. **Debugging** - Clear separation between data extraction and processing
5. **Compatibility** - Maintains backward compatibility with existing ICS parsing
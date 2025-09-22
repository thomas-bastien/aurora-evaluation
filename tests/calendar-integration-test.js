/**
 * Test script for the hybrid calendar email processing functionality
 * Tests both pre-parsed Zapier format and legacy ICS parsing
 */

const SUPABASE_URL = 'https://fadxytngwiporjqchsem.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/process-calendar-emails`;

// Test 1: New pre-parsed format (Zapier)
async function testParsedFormat() {
  console.log('\n=== Testing Pre-parsed Calendar Event Format ===');
  
  const payload = {
    from: "noreply@calendly.com",
    to: ["info@datavizpro.com"],
    subject: "Meeting Scheduled: DataViz Pro Pitch Session",
    body: "Your meeting has been scheduled",
    date: "2025-01-25T09:00:00.000Z",
    parsed_calendar_event: {
      summary: "DataViz Pro Pitch Session",
      start_time: "2025-01-25T10:00:00.000Z",
      end_time: "2025-01-25T11:00:00.000Z",
      attendees: ["info@datavizpro.com", "sarah.johnson@techventures.com"],
      location: "Zoom Meeting",
      description: "Pitch meeting between DataViz Pro and Sarah Johnson",
      uid: "test-parsed-12345"
    }
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ Pre-parsed format test result:', JSON.stringify(result, null, 2));
    return result.success;
  } catch (error) {
    console.error('❌ Pre-parsed format test failed:', error);
    return false;
  }
}

// Test 2: Legacy ICS format
async function testIcsFormat() {
  console.log('\n=== Testing Legacy ICS Format ===');
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:test-ics-12345@calendly.com
DTSTART:20250125T100000Z
DTEND:20250125T110000Z
SUMMARY:DataViz Pro Pitch Session (ICS Test)
DESCRIPTION:Pitch meeting between DataViz Pro and Sarah Johnson (via ICS)
LOCATION:Zoom Meeting
ATTENDEE:MAILTO:info@datavizpro.com
ATTENDEE:MAILTO:sarah.johnson@techventures.com
END:VEVENT
END:VCALENDAR`;

  const payload = {
    from: "noreply@calendly.com",
    to: ["info@datavizpro.com"],
    subject: "Meeting Scheduled via ICS",
    body: icsContent,
    date: "2025-01-25T09:00:00.000Z"
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ ICS format test result:', JSON.stringify(result, null, 2));
    return result.success;
  } catch (error) {
    console.error('❌ ICS format test failed:', error);
    return false;
  }
}

// Test 3: No calendar data (should fail gracefully)
async function testNoCalendarData() {
  console.log('\n=== Testing No Calendar Data ===');
  
  const payload = {
    from: "someone@example.com",
    to: ["recipient@example.com"],
    subject: "Regular email with no calendar data",
    body: "This is just a regular email",
    date: "2025-01-25T09:00:00.000Z"
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('✅ No calendar data test result:', JSON.stringify(result, null, 2));
    return !result.success; // Should fail gracefully
  } catch (error) {
    console.error('❌ No calendar data test failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Calendar Integration Tests');
  console.log(`Target URL: ${EDGE_FUNCTION_URL}`);
  
  const results = {
    parsedFormat: await testParsedFormat(),
    icsFormat: await testIcsFormat(),
    noCalendarData: await testNoCalendarData()
  };

  console.log('\n=== Test Summary ===');
  console.log(`Pre-parsed format: ${results.parsedFormat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`ICS format: ${results.icsFormat ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`No calendar data: ${results.noCalendarData ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

// Export for browser usage
if (typeof window !== 'undefined') {
  window.calendarIntegrationTests = { runTests, testParsedFormat, testIcsFormat, testNoCalendarData };
}
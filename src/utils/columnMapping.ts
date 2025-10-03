// Smart column mapping for flexible Excel/CSV imports

interface ColumnMapping {
  [key: string]: string;
}

/**
 * Maps a column name from Excel/CSV to a juror field name
 * Handles various naming conventions and question-style headers
 */
export function mapJurorColumn(columnName: string): string | null {
  const lower = columnName.toLowerCase();
  
  // Name field
  if (lower.includes('name') && !lower.includes('fund') && !lower.includes('company')) {
    return 'name';
  }
  
  // Email field
  if (lower.includes('email') || lower.includes('e-mail')) {
    return 'email';
  }
  
  // Job title / Position / Role
  if (lower.includes('position') || lower.includes('role') || lower.includes('title')) {
    return 'job_title';
  }
  
  // Company / Fund
  if (lower.includes('fund') || lower.includes('company') || lower.includes('organization') || lower.includes('firm')) {
    return 'company';
  }
  
  // LinkedIn
  if (lower.includes('linkedin')) {
    return 'linkedin_url';
  }
  
  // Calendly / Scheduling
  if (lower.includes('calendly') || lower.includes('scheduling')) {
    return 'calendly_link';
  }
  
  // Preferred stages
  if (lower.includes('stage')) {
    return 'preferred_stages';
  }
  
  // Verticals / Industries
  if (lower.includes('vertical') || lower.includes('industr')) {
    return 'target_verticals';
  }
  
  // Regions
  if (lower.includes('region')) {
    return 'preferred_regions';
  }
  
  // Evaluation limit
  if (lower.includes('evaluate') && lower.includes('willing')) {
    return 'evaluation_limit';
  }
  
  // Meeting limit
  if (lower.includes('meeting') || (lower.includes('pitch') && lower.includes('open'))) {
    return 'meeting_limit';
  }
  
  return null;
}

/**
 * Maps a column name from Excel/CSV to a startup field name
 * Uses specific-first matching to avoid ambiguous mappings
 */
export function mapStartupColumn(columnName: string): string | null {
  const lower = columnName.toLowerCase();
  
  // === HIGHEST PRIORITY: Exact/Specific Matches ===
  
  // "Startup name" or "Startup Name" → name
  if ((lower.includes('startup') && lower.includes('name')) || lower === 'startup name') {
    return 'name';
  }

  // "Startup website" → website (BEFORE generic website)
  if (lower.includes('startup') && lower.includes('website')) {
    return 'website';
  }

  // Company LinkedIn (company page) - BEFORE founder LinkedIn
  if ((lower.includes('company') && lower.includes('linkedin')) || 
      (lower.includes('startup') && lower.includes('linkedin'))) {
    return 'linkedin_url';
  }
  
  // "First name" (without "founder") → founder_first_name
  if (lower === 'first name' || (lower.includes('first') && !lower.includes('founder') && !lower.includes('contact'))) {
    return 'founder_first_name';
  }
  
  // "Last name" (without "founder") → founder_last_name
  if (lower === 'last name' || (lower.includes('last') && !lower.includes('founder') && !lower.includes('contact'))) {
    return 'founder_last_name';
  }
  
  // "Your LinkedIn profile" or personal LinkedIn → founder_linkedin
  if ((lower.includes('your') && lower.includes('linkedin')) || (lower.includes('linkedin') && lower.includes('profile') && !lower.includes('company'))) {
    return 'founder_linkedin';
  }
  
  // Founder first name with "founder" keyword
  if (lower.includes('founder') && (lower.includes('first') || lower.includes('given'))) {
    return 'founder_first_name';
  }
  
  // Founder last name with "founder" keyword
  if (lower.includes('founder') && (lower.includes('last') || lower.includes('family') || lower.includes('surname'))) {
    return 'founder_last_name';
  }
  
  // Founder LinkedIn with "founder" keyword
  if (lower.includes('founder') && lower.includes('linkedin')) {
    return 'founder_linkedin';
  }
  
  // "What is your value proposition?" → description
  if (lower.includes('value') && lower.includes('proposition')) {
    return 'description';
  }
  
  // "Funding Stage" or "Startup stage" → stage
  if ((lower.includes('startup') || lower.includes('funding')) && lower.includes('stage')) {
    return 'stage';
  }
  
  // "What is the capital raising?" or "capital raising" → funding_goal
  if (lower.includes('capital') && (lower.includes('raising') || lower.includes('raise'))) {
    return 'funding_goal';
  }
  
  // "Where is your company registered?" → location
  if ((lower.includes('where') && lower.includes('company')) || (lower.includes('registered') && !lower.includes('when'))) {
    return 'location';
  }
  
  // "Choose region" or "Select region" or just "Region" → region (single text)
  if (lower === 'choose region' || lower === 'select region' || lower === 'region' ||
      ((lower.includes('choose') || lower.includes('select')) && lower.includes('region') && !lower.includes('s'))) {
    return 'region';
  }
  
  // "What industry or industries..." → verticals (array)
  if ((lower.includes('what industry') || lower.includes('industries does your startup')) ||
      (lower.includes('what') && lower.includes('industry') && lower.includes('industries'))) {
    return 'verticals';
  }
  
  // Single "Industry" field (exact match) → verticals (array)
  if (lower === 'industry') {
    return 'verticals';
  }
  
  // "Describe business model" or "Business model" → business_model
  if (lower.includes('business') && lower.includes('model')) {
    return 'business_model';
  }
  
  // "How many people on team?" → team_size
  if (lower.includes('how') && lower.includes('many') && lower.includes('people')) {
    return 'team_size';
  }
  
  // "When company registered" → founded_year
  if (lower.includes('when') && (lower.includes('company') || lower.includes('registered'))) {
    return 'founded_year';
  }
  
  // "Startup website" → website
  if (lower.includes('startup') && lower.includes('website')) {
    return 'website';
  }
  
  // "Pitch+Deck" or "Pitch Deck" → pitch_deck_url
  if (lower === 'pitch+deck' || lower === 'pitch deck' || 
      (lower.includes('pitch') && (lower.includes('deck') || lower.includes('+deck')))) {
    return 'pitch_deck_url';
  }

  // Demo URL
  if (lower.includes('demo') && (lower.includes('url') || lower.includes('link'))) {
    return 'demo_url';
  }
  
  // "Aurora internal score (out of 100)" → internal_score
  if (lower.includes('aurora internal score') || 
      (lower.includes('internal') && lower.includes('score') && lower.includes('100'))) {
    return 'internal_score';
  }

  // "What is the capital you are raising?" → funding_goal
  if (lower.includes('what is the capital you are raising') ||
      (lower.includes('capital') && lower.includes('raising'))) {
    return 'funding_goal';
  }

  // "How many new countries do you plan to enter this year?" → countries_expansion_plan
  // Skip "score" columns that might contain keywords like "countries"
  if ((lower.includes('how many new countries') || 
      (lower.includes('countries') && lower.includes('plan to enter'))) &&
      !lower.includes('score') && !lower.includes('points') && !lower.includes('rating')) {
    return 'countries_expansion_plan';
  }
  
  // === MEDIUM PRIORITY: Field-Specific Matches ===
  
  // Serviceable Obtainable Market (SOM)
  if (lower.includes('serviceable') || lower.includes('obtainable') || lower.includes('som')) {
    return 'serviceable_obtainable_market';
  }
  
  // Full-time team members - expanded to catch more variations
  if ((lower.includes('full') || lower.includes('full-time')) && 
      (lower.includes('team') || (lower.includes('engaged') && lower.includes('company')))) {
    return 'full_time_team_members';
  }
  
  // Paying customers
  if (lower.includes('paying') && lower.includes('customer')) {
    return 'paying_customers_per_year';
  }
  
  // Countries operating
  if (lower.includes('countries') && (lower.includes('operating') || lower.includes('operate') || lower.includes('present'))) {
    return 'countries_operating';
  }
  
  // Countries expansion plan - handle "enter" keyword, but skip score columns
  if (lower.includes('countries') && (lower.includes('expansion') || lower.includes('expand') || lower.includes('plan') || lower.includes('enter')) &&
      !lower.includes('score') && !lower.includes('points') && !lower.includes('rating')) {
    return 'countries_expansion_plan';
  }
  
  // Business risks and mitigation
  if (lower.includes('risk') || lower.includes('mitigation')) {
    return 'business_risks_mitigation';
  }
  
  // === LOWER PRIORITY: Generic Matches ===
  
  // Description / About / Summary
  if (lower.includes('description') || lower.includes('about') || lower.includes('summary')) {
    return 'description';
  }
  
  // Industry / Sector / Vertical (more generic - for multi-select)
  if (lower.includes('industr') || lower.includes('sector') || lower.includes('vertical')) {
    return 'verticals';
  }
  
  // Stage (generic)
  if (lower.includes('stage')) {
    return 'stage';
  }
  
  // Location / Region (generic)
  if (lower.includes('location') || lower.includes('region') || lower.includes('based')) {
    return 'location';
  }
  
  // Founded year (generic)
  if (lower.includes('founded') || lower.includes('year')) {
    return 'founded_year';
  }
  
  // Team size (generic - comes AFTER full_time_team_members check)
  if (lower.includes('team') && lower.includes('size')) {
    return 'team_size';
  }
  
  // Funding goal (generic)
  if (lower.includes('goal') || lower.includes('funding')) {
    return 'funding_goal';
  }
  
  // Funding raised
  if (lower.includes('raised')) {
    return 'funding_raised';
  }
  
  // Website / URL
  if (lower.includes('website') || (lower.includes('url') && !lower.includes('linkedin') && !lower.includes('demo'))) {
    return 'website';
  }
  
  // Contact email
  if (lower.includes('email') || lower.includes('e-mail')) {
    return 'contact_email';
  }
  
  // LinkedIn URL (generic company LinkedIn - fallback)
  if (lower.includes('linkedin') && !lower.includes('founder') && !lower.includes('your')) {
    return 'linkedin_url';
  }

  // Demo URL (generic)
  if (lower.includes('demo')) {
    return 'demo_url';
  }

  // Business model (generic)
  if (lower.includes('business') && lower.includes('model')) {
    return 'business_model';
  }

  // Regions array (generic)
  if (lower.includes('region') && lower.includes('s')) {
    return 'regions';
  }
  
  // === LOWEST PRIORITY: Last Resort ===
  
  // Generic "name" - only if nothing else matched
  if (lower.includes('name') && !lower.includes('first') && !lower.includes('last') && !lower.includes('founder') && !lower.includes('contact')) {
    return 'name';
  }
  
  // Status
  if (lower.includes('status')) {
    return 'status';
  }
  
  return null;
}

/**
 * Parses array-like fields (comma or semicolon separated)
 */
export function parseArrayField(value: any): string[] {
  if (!value) return [];
  const str = String(value);
  return str.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Parses numeric fields safely
 */
export function parseNumericField(value: any): number | undefined {
  if (!value) return undefined;
  const num = parseInt(String(value).replace(/[^0-9]/g, ''));
  return isNaN(num) ? undefined : num;
}

/**
 * Parses year from date string or number
 */
export function parseYearField(value: any): number | undefined {
  if (!value) return undefined;
  
  // If it's already a number (year)
  if (typeof value === 'number' && value > 1900 && value < 2100) {
    return Math.floor(value);
  }
  
  // If it's a string that looks like just a year
  const str = String(value).trim();
  const yearMatch = str.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return parseInt(yearMatch[0]);
  }
  
  // Try to parse as date
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getFullYear();
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return undefined;
}

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
 */
export function mapStartupColumn(columnName: string): string | null {
  const lower = columnName.toLowerCase();
  
  // Name / Company name
  if ((lower.includes('name') || lower.includes('company')) && !lower.includes('founder') && !lower.includes('contact')) {
    return 'name';
  }
  
  // Description / About / Value Proposition
  if (lower.includes('description') || lower.includes('about') || lower.includes('summary') || lower.includes('value proposition')) {
    return 'description';
  }
  
  // Founder first name
  if (lower.includes('founder') && (lower.includes('first') || lower.includes('given'))) {
    return 'founder_first_name';
  }
  
  // Founder last name
  if (lower.includes('founder') && (lower.includes('last') || lower.includes('family') || lower.includes('surname'))) {
    return 'founder_last_name';
  }
  
  // Founder LinkedIn
  if (lower.includes('founder') && lower.includes('linkedin')) {
    return 'founder_linkedin';
  }
  
  // Serviceable Obtainable Market (SOM)
  if (lower.includes('serviceable') || lower.includes('obtainable') || lower.includes('som') || (lower.includes('market') && lower.includes('size'))) {
    return 'serviceable_obtainable_market';
  }
  
  // Full-time team members
  if (lower.includes('full') && lower.includes('time')) {
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
  
  // Countries expansion plan
  if (lower.includes('countries') && (lower.includes('expansion') || lower.includes('expand') || lower.includes('plan'))) {
    return 'countries_expansion_plan';
  }
  
  // Business risks and mitigation
  if (lower.includes('risk') || (lower.includes('business') && lower.includes('mitigation'))) {
    return 'business_risks_mitigation';
  }
  
  // Industry / Sector / Vertical
  if (lower.includes('industry') || lower.includes('sector') || lower.includes('vertical')) {
    return 'industry';
  }
  
  // Stage
  if (lower.includes('stage')) {
    return 'stage';
  }
  
  // Location / Region
  if (lower.includes('location') || lower.includes('region') || lower.includes('based')) {
    return 'location';
  }
  
  // Founded year (also handles "When company registered")
  if (lower.includes('founded') || lower.includes('year') || (lower.includes('when') && lower.includes('registered')) || (lower.includes('company') && lower.includes('registered'))) {
    return 'founded_year';
  }
  
  // Team size
  if (lower.includes('team')) {
    return 'team_size';
  }
  
  // Funding goal
  if (lower.includes('goal')) {
    return 'funding_goal';
  }
  
  // Funding raised
  if (lower.includes('raised')) {
    return 'funding_raised';
  }
  
  // Website / URL
  if (lower.includes('website') || lower.includes('url')) {
    return 'website';
  }
  
  // Contact email
  if (lower.includes('email') || lower.includes('e-mail')) {
    return 'contact_email';
  }
  
  // Contact phone
  if (lower.includes('phone')) {
    return 'contact_phone';
  }
  
  // Founder names
  if (lower.includes('founder')) {
    return 'founder_names';
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

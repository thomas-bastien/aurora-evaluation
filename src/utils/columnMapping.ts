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
  
  // Description / About
  if (lower.includes('description') || lower.includes('about') || lower.includes('summary')) {
    return 'description';
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
  
  // Founded year
  if (lower.includes('founded') || lower.includes('year')) {
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

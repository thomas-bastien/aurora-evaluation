import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface Startup {
  id: string;
  name: string;
  website?: string;
  verticals?: string[];
  description?: string;
  stage?: string;
  country?: string;
  region?: string;
  business_model?: string[];
  founded_year?: number;
  team_size?: number;
  funding_goal?: number;
  funding_raised?: number;
  linkedin_url?: string;
  pitch_deck_url?: string;
  demo_url?: string;
  key_metrics?: any;
  other_vertical_description?: string;
  founder_names?: string[];
  contact_email?: string;
}

interface Juror {
  id: string;
  name: string;
  email: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  calendly_link?: string;
  preferred_regions?: string[];
  target_verticals?: string[];
  preferred_stages?: string[];
}

interface Evaluation {
  id: string;
  startup_id: string;
  startup_name: string;
  evaluator_id: string;
  juror_name: string;
  vc_fund?: string;
  overall_score?: number;
  strengths?: string[];
  improvement_areas?: string;
  overall_notes?: string;
  pitch_development_aspects?: string;
  recommendation?: string;
  wants_pitch_session?: boolean;
  investment_amount?: number;
  guided_feedback?: string[];
  created_at: string;
  round_type: string;
}

// Helper function to escape CSV fields
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';
  
  const str = String(field);
  
  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('\"')) {
    return `\"${str.replace(/\"/g, '\"\"')}\"`;
  }
  
  return str;
}

// Helper function to parse founder names
function parseFounderName(fullName: string): { firstName: string; lastName: string } {
  // Remove common titles
  const cleaned = fullName.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
  
  const parts = cleaned.split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Founder' };
  }
  
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

// Helper function to build startup notes
function buildStartupNotes(startup: Startup): string {
  const notes: string[] = [];
  
  // Additional verticals
  if (startup.verticals && startup.verticals.length > 1) {
    notes.push(`Additional Verticals: ${startup.verticals.slice(1).join(', ')}`);
  }
  
  // Other vertical description
  if (startup.other_vertical_description) {
    notes.push(`Other Vertical: ${startup.other_vertical_description}`);
  }
  
  // Pitch deck
  if (startup.pitch_deck_url) {
    notes.push(`Pitch Deck: ${startup.pitch_deck_url}`);
  }
  
  // Demo URL
  if (startup.demo_url) {
    notes.push(`Demo: ${startup.demo_url}`);
  }
  
  // Key metrics
  if (startup.key_metrics) {
    const metricsText = Object.entries(startup.key_metrics)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    notes.push(`Key Metrics: ${metricsText}`);
  }
  
  return notes.join(' | ');
}

// Helper function to build juror notes
function buildJurorNotes(juror: Juror): string {
  const notes: string[] = [];
  
  if (juror.calendly_link) {
    notes.push(`Calendly: ${juror.calendly_link}`);
  }
  
  if (juror.target_verticals && juror.target_verticals.length > 0) {
    notes.push(`Preferred Verticals: ${juror.target_verticals.join(', ')}`);
  }
  
  if (juror.preferred_regions && juror.preferred_regions.length > 0) {
    notes.push(`Preferred Regions: ${juror.preferred_regions.join(', ')}`);
  }
  
  if (juror.preferred_stages && juror.preferred_stages.length > 0) {
    notes.push(`Preferred Stages: ${juror.preferred_stages.join(', ')}`);
  }
  
  return notes.join(' | ');
}

// Helper function to format evaluation note content
function formatEvaluationNote(evaluation: Evaluation): string {
  const parts: string[] = [];
  
  parts.push(`Round: ${evaluation.round_type}`);
  parts.push(`Juror: ${evaluation.juror_name}`);
  if (evaluation.vc_fund) {
    parts.push(`VC Fund: ${evaluation.vc_fund}`);
  }
  if (evaluation.overall_score) {
    parts.push(`Score: ${evaluation.overall_score}/10`);
  }
  parts.push(`Status: Submitted`);
  parts.push(`Submitted: ${new Date(evaluation.created_at).toISOString().split('T')[0]}`);
  parts.push('');
  
  if (evaluation.strengths && evaluation.strengths.length > 0) {
    parts.push('Strengths:');
    evaluation.strengths.forEach(strength => {
      parts.push(`- ${strength}`);
    });
    parts.push('');
  }
  
  if (evaluation.improvement_areas) {
    parts.push('Improvement Areas:');
    parts.push(evaluation.improvement_areas);
    parts.push('');
  }
  
  if (evaluation.overall_notes) {
    parts.push('Overall Notes:');
    parts.push(evaluation.overall_notes);
    parts.push('');
  }
  
  if (evaluation.pitch_development_aspects) {
    parts.push('Pitch Development:');
    parts.push(evaluation.pitch_development_aspects);
    parts.push('');
  }
  
  if (evaluation.recommendation) {
    parts.push(`Recommendation: ${evaluation.recommendation}`);
  }
  
  if (evaluation.wants_pitch_session !== undefined) {
    parts.push(`Investment Interest: ${evaluation.wants_pitch_session ? 'Yes' : 'No'}`);
  }
  
  if (evaluation.investment_amount) {
    parts.push(`Potential Investment: £${evaluation.investment_amount.toLocaleString()}`);
  }
  
  if (evaluation.guided_feedback && evaluation.guided_feedback.length > 0) {
    parts.push('');
    parts.push('Guided Feedback:');
    evaluation.guided_feedback.forEach(feedback => {
      parts.push(`- ${feedback}`);
    });
  }
  
  return parts.join('\n');
}

export async function generateVCFundsCSV(): Promise<string> {
  const { data: jurors, error } = await supabase
    .from('jurors')
    .select('company, name')
    .not('user_id', 'is', null);

  if (error) throw error;

  // Group by company
  const fundMap = new Map<string, string[]>();
  jurors?.forEach(juror => {
    if (juror.company) {
      if (!fundMap.has(juror.company)) {
        fundMap.set(juror.company, []);
      }
      fundMap.get(juror.company)?.push(juror.name);
    }
  });

  const rows: string[] = [
    'Account Name,Account Type,Industry,Aurora_Tag,Aurora_ID,Number_of_Jurors,Notes'
  ];

  let index = 1;
  fundMap.forEach((jurorNames, company) => {
    const auroraId = `vcf_${String(index).padStart(3, '0')}`;
    const notes = `Active jurors: ${jurorNames.join(', ')}`;
    
    rows.push([
      escapeCSVField(company),
      'Partner',
      'Venture Capital',
      'Aurora VC Partner',
      auroraId,
      jurorNames.length,
      escapeCSVField(notes)
    ].join(','));
    
    index++;
  });

  return rows.join('\n');
}

export async function generateJurorsCSV(): Promise<string> {
  const { data: jurors, error } = await supabase
    .from('jurors')
    .select('*')
    .not('user_id', 'is', null)
    .order('company', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: string[] = [
    'First Name,Last Name,Email,Title,Account Name,LinkedIn,Aurora_Role,Aurora_ID,Notes'
  ];

  jurors?.forEach((juror, index) => {
    const { firstName, lastName } = parseFounderName(juror.name);
    const auroraId = `j_${String(index + 1).padStart(3, '0')}`;
    const notes = buildJurorNotes(juror);
    
    rows.push([
      escapeCSVField(firstName),
      escapeCSVField(lastName),
      escapeCSVField(juror.email),
      escapeCSVField(juror.job_title || ''),
      escapeCSVField(juror.company || ''),
      escapeCSVField(juror.linkedin_url || ''),
      'Juror',
      auroraId,
      escapeCSVField(notes)
    ].join(','));
  });

  return rows.join('\n');
}

export async function generateStartupsCSV(): Promise<string> {
  // Get current cohort settings
  const { data: cohortSettings } = await supabase
    .from('cohort_settings')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get startups from current cohort
  const { data: startups, error } = await supabase
    .from('startups')
    .select('*')
    .gte('created_at', cohortSettings?.created_at || '2000-01-01')
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: string[] = [
    'Account Name,Website,Industry,Description,Stage,Country,Region,Business_Model,Founded_Year,Team_Size,Funding_Goal,Funding_Raised,LinkedIn,Aurora_Screening_Avg_Score,Aurora_Pitching_Avg_Score,Aurora_Overall_Avg_Score,Aurora_Profile_Link,Aurora_ID,Notes'
  ];

  for (let i = 0; i < (startups?.length || 0); i++) {
    const startup = startups![i];
    const auroraId = `s_${String(i + 1).padStart(3, '0')}`;
    
    // Get screening evaluations
    const { data: screeningEvals } = await supabase
      .from('screening_evaluations')
      .select('overall_score')
      .eq('startup_id', startup.id)
      .eq('status', 'submitted');
    
    const screeningAvg = screeningEvals && screeningEvals.length > 0
      ? (screeningEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / screeningEvals.length)
      : null;
    
    // Get pitching evaluations
    const { data: pitchingEvals } = await supabase
      .from('pitching_evaluations')
      .select('overall_score')
      .eq('startup_id', startup.id)
      .eq('status', 'submitted');
    
    const pitchingAvg = pitchingEvals && pitchingEvals.length > 0
      ? (pitchingEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / pitchingEvals.length)
      : null;
    
    // Calculate overall average: (screening_avg + pitching_avg) / 2
    const overallAvg = (screeningAvg && pitchingAvg)
      ? (screeningAvg + pitchingAvg) / 2
      : (screeningAvg || pitchingAvg || null);
    
    const industry = startup.verticals?.[0] || '';
    const notes = buildStartupNotes(startup);
    const profileLink = `https://aurora.app/startups/${startup.id}`;
    
    rows.push([
      escapeCSVField(startup.name),
      escapeCSVField(startup.website || ''),
      escapeCSVField(industry),
      escapeCSVField(startup.description || ''),
      escapeCSVField(startup.stage || ''),
      escapeCSVField(startup.country || ''),
      escapeCSVField((startup.regions || []).join(', ')),
      escapeCSVField(startup.business_model && startup.business_model.length > 0 ? startup.business_model.join(', ') : ''),
      escapeCSVField(startup.founded_year || ''),
      escapeCSVField(startup.team_size || ''),
      escapeCSVField(startup.funding_goal || ''),
      escapeCSVField(startup.funding_raised || ''),
      escapeCSVField(startup.linkedin_url || ''),
      screeningAvg ? screeningAvg.toFixed(2) : '',
      pitchingAvg ? pitchingAvg.toFixed(2) : '',
      overallAvg ? overallAvg.toFixed(2) : '',
      profileLink,
      auroraId,
      escapeCSVField(notes)
    ].join(','));
  }

  return rows.join('\n');
}

export async function generateFoundersCSV(): Promise<string> {
  // Get current cohort settings
  const { data: cohortSettings } = await supabase
    .from('cohort_settings')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: startups, error } = await supabase
    .from('startups')
    .select('id, name, founder_names, contact_email')
    .gte('created_at', cohortSettings?.created_at || '2000-01-01')
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: string[] = [
    'First Name,Last Name,Email,Account Name,Title,Aurora_Startup_ID,Notes'
  ];

  startups?.forEach((startup, startupIndex) => {
    const auroraStartupId = `s_${String(startupIndex + 1).padStart(3, '0')}`;
    const founders = startup.founder_names || ['Unknown Founder'];
    const email = startup.contact_email || '';
    
    founders.forEach((founderName, founderIndex) => {
      const { firstName, lastName } = parseFounderName(founderName);
      const notes = `Founder ${founderIndex + 1} of ${founders.length}`;
      
      rows.push([
        escapeCSVField(firstName),
        escapeCSVField(lastName),
        escapeCSVField(email),
        escapeCSVField(startup.name),
        'Co-Founder',
        auroraStartupId,
        escapeCSVField(notes)
      ].join(','));
    });
  });

  return rows.join('\n');
}

export async function generateDealsCSV(): Promise<string> {
  // Get current cohort settings
  const { data: cohortSettings } = await supabase
    .from('cohort_settings')
    .select('cohort_name, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cohortName = cohortSettings?.cohort_name || 'Aurora Cohort';

  // Get startups with their round statuses
  const { data: startups, error } = await supabase
    .from('startups')
    .select(`
      *,
      startup_round_statuses(status, rounds(name))
    `)
    .gte('created_at', cohortSettings?.created_at || '2000-01-01')
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: string[] = [
    'Deal Name,Account Name,Stage,Amount,Closing Date,Aurora_Deal_ID,Aurora_Startup_ID'
  ];

  startups?.forEach((startup, index) => {
    const auroraId = `s_${String(index + 1).padStart(3, '0')}`;
    const dealName = `${startup.name} - ${cohortName}`;
    
    // Determine stage from startup_round_statuses
    let stage = 'Screening'; // Default
    const statuses = (startup as any).startup_round_statuses || [];
    
    // Find the most progressed status
    const screeningStatus = statuses.find((s: any) => s.rounds?.name === 'screening');
    const pitchingStatus = statuses.find((s: any) => s.rounds?.name === 'pitching');
    
    if (pitchingStatus) {
      if (pitchingStatus.status === 'selected') {
        stage = 'Selected';
      } else if (pitchingStatus.status === 'rejected') {
        stage = 'Rejected';
      } else {
        stage = 'Pitching';
      }
    } else if (screeningStatus) {
      if (screeningStatus.status === 'selected') {
        stage = 'Pitching'; // Selected in screening means moved to pitching
      } else if (screeningStatus.status === 'rejected') {
        stage = 'Rejected';
      } else {
        stage = 'Screening';
      }
    }
    
    rows.push([
      escapeCSVField(dealName),
      escapeCSVField(startup.name),
      escapeCSVField(stage),
      '', // Amount - blank
      '', // Closing Date - blank
      auroraId,
      auroraId
    ].join(','));
  });

  return rows.join('\n');
}

export async function generateDealContactRolesCSV(): Promise<string> {
  // Get current cohort settings
  const { data: cohortSettings } = await supabase
    .from('cohort_settings')
    .select('cohort_name, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cohortName = cohortSettings?.cohort_name || 'Aurora Cohort';

  // Get all startups for mapping
  const { data: startups } = await supabase
    .from('startups')
    .select('id, name')
    .gte('created_at', cohortSettings?.created_at || '2000-01-01')
    .order('name', { ascending: true });

  const startupMap = new Map(startups?.map((s, idx) => [
    s.id,
    { name: s.name, auroraId: `s_${String(idx + 1).padStart(3, '0')}` }
  ]) || []);

  // Get screening assignments
  const { data: screeningAssignments } = await supabase
    .from('screening_assignments')
    .select(`
      id,
      startup_id,
      juror_id,
      jurors(name, email)
    `);

  // Get pitching assignments
  const { data: pitchingAssignments } = await supabase
    .from('pitching_assignments')
    .select(`
      id,
      startup_id,
      juror_id,
      jurors(name, email)
    `);

  const rows: string[] = [
    'Deal Name,Contact Email,Contact Name,Role,Aurora_Deal_ID,Aurora_Juror_ID,Aurora_Assignment_ID'
  ];

  // Process screening assignments
  screeningAssignments?.forEach((assignment) => {
    const startup = startupMap.get(assignment.startup_id);
    const juror = (assignment as any).jurors;
    
    if (startup && juror) {
      const dealName = `${startup.name} - ${cohortName}`;
      const jurorId = `j_${assignment.juror_id.substring(0, 8)}`;
      
      rows.push([
        escapeCSVField(dealName),
        escapeCSVField(juror.email),
        escapeCSVField(juror.name),
        'Screening Evaluator',
        startup.auroraId,
        jurorId,
        `sa_${assignment.id.substring(0, 8)}`
      ].join(','));
    }
  });

  // Process pitching assignments
  pitchingAssignments?.forEach((assignment) => {
    const startup = startupMap.get(assignment.startup_id);
    const juror = (assignment as any).jurors;
    
    if (startup && juror) {
      const dealName = `${startup.name} - ${cohortName}`;
      const jurorId = `j_${assignment.juror_id.substring(0, 8)}`;
      
      rows.push([
        escapeCSVField(dealName),
        escapeCSVField(juror.email),
        escapeCSVField(juror.name),
        'Pitching Evaluator',
        startup.auroraId,
        jurorId,
        `pa_${assignment.id.substring(0, 8)}`
      ].join(','));
    }
  });

  return rows.join('\n');
}

export async function createZohoExportZIP(csvFiles: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  
  Object.entries(csvFiles).forEach(([filename, content]) => {
    zip.file(filename, content);
  });
  
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadZIPFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function getExportPreviewCounts() {
  // Get VC Funds count
  const { data: jurors } = await supabase
    .from('jurors')
    .select('company')
    .not('user_id', 'is', null);
  
  const vcFundsCount = new Set(jurors?.map(j => j.company).filter(Boolean)).size;

  // Get Jurors count
  const jurorsCount = jurors?.length || 0;

  // Get current cohort settings
  const { data: cohortSettings } = await supabase
    .from('cohort_settings')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get Startups count (= Deals count, 1 deal per startup)
  const { count: startupsCount } = await supabase
    .from('startups')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', cohortSettings?.created_at || '2000-01-01');

  // Get Founders count
  const { data: startups } = await supabase
    .from('startups')
    .select('founder_names')
    .gte('created_at', cohortSettings?.created_at || '2000-01-01');
  
  const foundersCount = startups?.reduce((sum, s) => sum + (s.founder_names?.length || 0), 0) || 0;

  // Get Deal Contact Roles count (screening + pitching assignments)
  const { count: screeningAssignmentsCount } = await supabase
    .from('screening_assignments')
    .select('*', { count: 'exact', head: true });

  const { count: pitchingAssignmentsCount } = await supabase
    .from('pitching_assignments')
    .select('*', { count: 'exact', head: true });

  const dealContactRolesCount = (screeningAssignmentsCount || 0) + (pitchingAssignmentsCount || 0);

  return {
    vcFunds: vcFundsCount,
    jurors: jurorsCount,
    startups: startupsCount || 0,
    founders: foundersCount,
    deals: startupsCount || 0,
    dealContactRoles: dealContactRolesCount
  };
}

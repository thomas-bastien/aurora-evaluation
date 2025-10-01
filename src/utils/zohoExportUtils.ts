import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface Startup {
  id: string;
  name: string;
  website?: string;
  contact_phone?: string;
  verticals?: string[];
  description?: string;
  stage?: string;
  country?: string;
  region?: string;
  business_model?: string;
  founded_year?: number;
  team_size?: number;
  funding_goal?: number;
  funding_raised?: number;
  total_investment_received?: number;
  investment_currency?: string;
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

  // Get startups from current cohort with evaluation scores
  const { data: startups, error } = await supabase
    .from('startups')
    .select(`
      *,
      startup_round_statuses!inner(status, round_id, rounds!inner(name))
    `)
    .gte('created_at', cohortSettings?.created_at || '2000-01-01')
    .order('name', { ascending: true });

  if (error) throw error;

  const rows: string[] = [
    'Account Name,Website,Phone,Industry,Description,Stage,Country,Region,Business_Model,Founded_Year,Team_Size,Funding_Goal,Funding_Raised,Total_Investment,Currency,LinkedIn,Aurora_Screening_Score,Aurora_Screening_Status,Aurora_Pitching_Score,Aurora_Pitching_Status,Aurora_Final_Status,Aurora_Profile_Link,Aurora_ID,Notes'
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
      ? (screeningEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / screeningEvals.length).toFixed(2)
      : '';
    
    // Get pitching evaluations
    const { data: pitchingEvals } = await supabase
      .from('pitching_evaluations')
      .select('overall_score')
      .eq('startup_id', startup.id)
      .eq('status', 'submitted');
    
    const pitchingAvg = pitchingEvals && pitchingEvals.length > 0
      ? (pitchingEvals.reduce((sum, e) => sum + (e.overall_score || 0), 0) / pitchingEvals.length).toFixed(2)
      : '';
    
    // Get round statuses
    const screeningStatus = (startup as any).startup_round_statuses?.find((srs: any) => 
      srs.rounds?.name === 'screening'
    )?.status || '';
    
    const pitchingStatus = (startup as any).startup_round_statuses?.find((srs: any) => 
      srs.rounds?.name === 'pitching'
    )?.status || '';
    
    const finalStatus = pitchingStatus || screeningStatus;
    const industry = startup.verticals?.[0] || '';
    const notes = buildStartupNotes(startup);
    const profileLink = `https://aurora.app/startups/${startup.id}`;
    
    rows.push([
      escapeCSVField(startup.name),
      escapeCSVField(startup.website || ''),
      escapeCSVField(startup.contact_phone || ''),
      escapeCSVField(industry),
      escapeCSVField(startup.description || ''),
      escapeCSVField(startup.stage || ''),
      escapeCSVField(startup.country || ''),
      escapeCSVField(startup.region || ''),
      escapeCSVField(startup.business_model || ''),
      escapeCSVField(startup.founded_year || ''),
      escapeCSVField(startup.team_size || ''),
      escapeCSVField(startup.funding_goal || ''),
      escapeCSVField(startup.funding_raised || ''),
      escapeCSVField(startup.total_investment_received || ''),
      escapeCSVField(startup.investment_currency || ''),
      escapeCSVField(startup.linkedin_url || ''),
      screeningAvg,
      escapeCSVField(screeningStatus),
      pitchingAvg,
      escapeCSVField(pitchingStatus),
      escapeCSVField(finalStatus),
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

export async function generateEvaluationResultsCSV(): Promise<string> {
  // Get screening evaluations
  const { data: screeningEvals } = await supabase
    .from('screening_evaluations')
    .select(`
      id,
      startup_id,
      evaluator_id,
      overall_score,
      strengths,
      improvement_areas,
      overall_notes,
      pitch_development_aspects,
      recommendation,
      wants_pitch_session,
      investment_amount,
      guided_feedback,
      created_at,
      startups!inner(name),
      profiles!inner(user_id)
    `)
    .eq('status', 'submitted');

  // Get pitching evaluations
  const { data: pitchingEvals } = await supabase
    .from('pitching_evaluations')
    .select(`
      id,
      startup_id,
      evaluator_id,
      overall_score,
      strengths,
      improvement_areas,
      overall_notes,
      pitch_development_aspects,
      recommendation,
      wants_pitch_session,
      investment_amount,
      guided_feedback,
      created_at,
      startups!inner(name),
      profiles!inner(user_id)
    `)
    .eq('status', 'submitted');

  const rows: string[] = [
    'Related_To_Account,Related_To_Aurora_ID,Note_Title,Note_Content,Created_Time,Aurora_Link,Aurora_ID'
  ];

  // Get juror mapping
  const { data: jurors } = await supabase
    .from('jurors')
    .select('user_id, name, company');

  const jurorMap = new Map(jurors?.map(j => [j.user_id, { name: j.name, company: j.company }]) || []);

  // Process screening evaluations
  screeningEvals?.forEach((screeningEval, index) => {
    const jurorInfo = jurorMap.get(screeningEval.evaluator_id);
    const evaluation: Evaluation = {
      ...screeningEval,
      startup_name: (screeningEval as any).startups.name,
      juror_name: jurorInfo?.name || 'Unknown',
      vc_fund: jurorInfo?.company,
      round_type: 'Screening'
    };
    
    const auroraId = `eval_scr_${String(index + 1).padStart(3, '0')}`;
    const startupIndex = 1; // This would need proper mapping
    const auroraStartupId = `s_${String(startupIndex).padStart(3, '0')}`;
    const title = `Screening Evaluation - ${evaluation.juror_name}${evaluation.vc_fund ? ` (${evaluation.vc_fund})` : ''}`;
    const content = formatEvaluationNote(evaluation);
    const createdTime = new Date(evaluation.created_at).toISOString().replace('T', ' ').split('.')[0];
    const link = `https://aurora.app/evaluations/${evaluation.id}`;
    
    rows.push([
      escapeCSVField(evaluation.startup_name),
      auroraStartupId,
      escapeCSVField(title),
      escapeCSVField(content),
      createdTime,
      link,
      auroraId
    ].join(','));
  });

  // Process pitching evaluations
  pitchingEvals?.forEach((pitchingEval, index) => {
    const jurorInfo = jurorMap.get(pitchingEval.evaluator_id);
    const evaluation: Evaluation = {
      ...pitchingEval,
      startup_name: (pitchingEval as any).startups.name,
      juror_name: jurorInfo?.name || 'Unknown',
      vc_fund: jurorInfo?.company,
      round_type: 'Pitching'
    };
    
    const auroraId = `eval_pit_${String(index + 1).padStart(3, '0')}`;
    const startupIndex = 1; // This would need proper mapping
    const auroraStartupId = `s_${String(startupIndex).padStart(3, '0')}`;
    const title = `Pitching Evaluation - ${evaluation.juror_name}${evaluation.vc_fund ? ` (${evaluation.vc_fund})` : ''}`;
    const content = formatEvaluationNote(evaluation);
    const createdTime = new Date(evaluation.created_at).toISOString().replace('T', ' ').split('.')[0];
    const link = `https://aurora.app/evaluations/${evaluation.id}`;
    
    rows.push([
      escapeCSVField(evaluation.startup_name),
      auroraStartupId,
      escapeCSVField(title),
      escapeCSVField(content),
      createdTime,
      link,
      auroraId
    ].join(','));
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

  // Get Startups count
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

  // Get Screening Evaluations count
  const { count: screeningCount } = await supabase
    .from('screening_evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  // Get Pitching Evaluations count
  const { count: pitchingCount } = await supabase
    .from('pitching_evaluations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  return {
    vcFunds: vcFundsCount,
    jurors: jurorsCount,
    startups: startupsCount || 0,
    founders: foundersCount,
    screeningEvaluations: screeningCount || 0,
    pitchingEvaluations: pitchingCount || 0
  };
}

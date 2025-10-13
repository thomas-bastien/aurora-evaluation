import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import type { RoundInsights } from '@/hooks/useRoundInsights';

export interface StartupAnalytics {
  id: string;
  name: string;
  status: string;
  evaluationsComplete: number;
  totalEvaluations: number;
  averageScore: number | null;
  lastUpdated: string;
}

export interface JurorContribution {
  id: string;
  name: string;
  evaluationsCompleted: number;
  averageScoreGiven: number | null;
  participationRate: number;
  lastActivity: string;
}

export interface PitchAnalytics {
  id: string;
  startupName: string;
  pitchStatus: string;
  meetingDate: string | null;
  vcName: string;
  outcome: string | null;
  notes: string | null;
}

// CSV Export Functions
export function exportEvaluationSummaryCSV(data: StartupAnalytics[], roundName: string): void {
  const headers = [
    'Startup Name',
    'Status',
    'Evaluations Complete',
    'Total Evaluations',
    'Average Score',
    'Last Updated'
  ];

  const rows = data.map(startup => [
    startup.name,
    startup.status,
    startup.evaluationsComplete.toString(),
    startup.totalEvaluations.toString(),
    startup.averageScore?.toFixed(2) || 'N/A',
    new Date(startup.lastUpdated).toLocaleDateString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, `evaluation-summary-${roundName}-${getDateString()}.csv`, 'text/csv');
}

export function exportJurorContributionCSV(data: JurorContribution[], roundName: string): void {
  const headers = [
    'Juror Name',
    'Evaluations Completed',
    'Average Score Given',
    'Participation Rate (%)',
    'Last Activity'
  ];

  const rows = data.map(juror => [
    juror.name,
    juror.evaluationsCompleted.toString(),
    juror.averageScoreGiven?.toFixed(2) || 'N/A',
    `${juror.participationRate}%`,
    new Date(juror.lastActivity).toLocaleDateString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, `juror-contribution-${roundName}-${getDateString()}.csv`, 'text/csv');
}

export function exportPitchAnalyticsCSV(data: PitchAnalytics[], roundName: string): void {
  const headers = [
    'Startup Name',
    'Pitch Status',
    'Meeting Date',
    'VC Name',
    'Outcome',
    'Notes'
  ];

  const rows = data.map(pitch => [
    pitch.startupName,
    pitch.pitchStatus,
    pitch.meetingDate ? new Date(pitch.meetingDate).toLocaleDateString() : 'Not Scheduled',
    pitch.vcName,
    pitch.outcome || 'Pending',
    pitch.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, `pitch-analytics-${roundName}-${getDateString()}.csv`, 'text/csv');
}

// PDF Export Functions
export async function exportEvaluationSummaryPDF(data: StartupAnalytics[], roundName: string, stats: any): Promise<void> {
  const { addAuroraBrandedHeader, addAuroraBrandedFooter, AURORA_COLORS, imageToBase64 } = await import('./pdfBranding');
  const doc = new jsPDF();
  
  // Load logo
  let logoBase64: string | undefined;
  try {
    logoBase64 = await imageToBase64('/images/aurora-logo.png');
  } catch (error) {
    console.warn('Could not load Aurora logo for PDF');
  }
  
  // Add Aurora branded header
  addAuroraBrandedHeader(doc, 'Evaluation Summary Report', roundName, logoBase64);
  
  // Summary Statistics
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text('Summary Statistics', 15, 35);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  doc.text(`Total Startups: ${stats.totalStartups}`, 15, 45);
  doc.text(`Completion Rate: ${stats.completionRate}%`, 15, 52);
  doc.text(`Average Score: ${stats.averageScore.toFixed(2)}`, 15, 59);
  
  // Data Table
  const tableData = data.map(startup => [
    startup.name,
    startup.status,
    startup.evaluationsComplete.toString(),
    startup.totalEvaluations.toString(),
    startup.averageScore?.toFixed(2) || 'N/A',
    new Date(startup.lastUpdated).toLocaleDateString()
  ]);

  autoTable(doc, {
    head: [['Startup Name', 'Status', 'Evaluations Complete', 'Total Evaluations', 'Average Score', 'Last Updated']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 8 },
    headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      addAuroraBrandedFooter(doc, currentPage, pageCount);
    }
  });

  doc.save(`evaluation-summary-${roundName}-${getDateString()}.pdf`);
}

export async function exportJurorContributionPDF(data: JurorContribution[], roundName: string, stats: any): Promise<void> {
  const { addAuroraBrandedHeader, addAuroraBrandedFooter, AURORA_COLORS, imageToBase64 } = await import('./pdfBranding');
  const doc = new jsPDF();
  
  // Load logo
  let logoBase64: string | undefined;
  try {
    logoBase64 = await imageToBase64('/images/aurora-logo.png');
  } catch (error) {
    console.warn('Could not load Aurora logo for PDF');
  }
  
  // Add Aurora branded header
  addAuroraBrandedHeader(doc, 'Juror Contribution Report', roundName, logoBase64);
  
  // Summary Statistics
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text('Summary Statistics', 15, 35);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  doc.text(`Total Jurors: ${data.length}`, 15, 45);
  doc.text(`Average Participation: ${stats.completionRate}%`, 15, 52);
  doc.text(`Average Score Given: ${stats.averageScore.toFixed(2)}`, 15, 59);
  
  // Data Table
  const tableData = data.map(juror => [
    juror.name,
    juror.evaluationsCompleted.toString(),
    juror.averageScoreGiven?.toFixed(2) || 'N/A',
    `${juror.participationRate}%`,
    new Date(juror.lastActivity).toLocaleDateString()
  ]);

  autoTable(doc, {
    head: [['Juror Name', 'Evaluations Completed', 'Average Score Given', 'Participation Rate', 'Last Activity']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 8 },
    headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      addAuroraBrandedFooter(doc, currentPage, pageCount);
    }
  });

  doc.save(`juror-contribution-${roundName}-${getDateString()}.pdf`);
}

export async function exportPitchAnalyticsPDF(data: PitchAnalytics[], roundName: string, stats: any): Promise<void> {
  const { addAuroraBrandedHeader, addAuroraBrandedFooter, AURORA_COLORS, imageToBase64 } = await import('./pdfBranding');
  const doc = new jsPDF();
  
  // Load logo
  let logoBase64: string | undefined;
  try {
    logoBase64 = await imageToBase64('/images/aurora-logo.png');
  } catch (error) {
    console.warn('Could not load Aurora logo for PDF');
  }
  
  // Add Aurora branded header
  addAuroraBrandedHeader(doc, 'Pitch Session Analytics', roundName, logoBase64);
  
  // Summary Statistics
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text('Summary Statistics', 15, 35);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  doc.text(`Total Pitch Sessions: ${data.length}`, 15, 45);
  doc.text(`Completion Rate: ${stats.completionRate}%`, 15, 52);
  doc.text(`Average Score: ${stats.averageScore.toFixed(2)}`, 15, 59);
  
  // Data Table
  const tableData = data.map(pitch => [
    pitch.startupName,
    pitch.pitchStatus,
    pitch.meetingDate ? new Date(pitch.meetingDate).toLocaleDateString() : 'Not Scheduled',
    pitch.vcName,
    pitch.outcome || 'Pending'
  ]);

  autoTable(doc, {
    head: [['Startup Name', 'Pitch Status', 'Meeting Date', 'VC Name', 'Outcome']],
    body: tableData,
    startY: 65,
    styles: { fontSize: 8 },
    headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      addAuroraBrandedFooter(doc, currentPage, pageCount);
    }
  });

  doc.save(`pitch-analytics-${roundName}-${getDateString()}.pdf`);
}

// Data Fetching Functions
export async function fetchJurorContributionData(roundName: string): Promise<JurorContribution[]> {
  const tableName = roundName === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
  
  // Fetch evaluations separately
  const { data: evaluations, error } = await supabase
    .from(tableName)
    .select(`
      evaluator_id,
      overall_score,
      created_at
    `)
    .eq('status', 'submitted');

  if (error) throw error;

  // Get unique evaluator IDs
  const evaluatorIds = [...new Set(evaluations.map((e: any) => e.evaluator_id))];

  // Fetch juror details using correct relationship (evaluator_id -> jurors.user_id)
  const { data: jurors, error: jurorsError } = await supabase
    .from('jurors')
    .select('user_id, name, email')
    .in('user_id', evaluatorIds);

  if (jurorsError) throw jurorsError;

  // Create a lookup map for juror details
  const jurorLookup = jurors.reduce((acc: any, juror: any) => {
    acc[juror.user_id] = juror;
    return acc;
  }, {});

  // Group by juror and calculate metrics
  const jurorMetrics = evaluations.reduce((acc: any, evaluation: any) => {
    const jurorId = evaluation.evaluator_id;
    const jurorInfo = jurorLookup[jurorId];
    
    if (!acc[jurorId]) {
      acc[jurorId] = {
        id: jurorId,
        name: jurorInfo?.name || 'Unknown',
        email: jurorInfo?.email || 'Unknown',
        evaluationsCompleted: 0,
        totalScore: 0,
        lastActivity: evaluation.created_at
      };
    }
    
    acc[jurorId].evaluationsCompleted++;
    if (evaluation.overall_score) {
      acc[jurorId].totalScore += evaluation.overall_score;
    }
    
    if (new Date(evaluation.created_at) > new Date(acc[jurorId].lastActivity)) {
      acc[jurorId].lastActivity = evaluation.created_at;
    }
    
    return acc;
  }, {});

  // Get total assignments for participation rate - need to join with jurors table
  const assignmentTable = roundName === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
  const { data: assignments } = await supabase
    .from(assignmentTable)
    .select(`
      juror_id,
      jurors!inner(user_id)
    `)
    .eq('status', 'assigned');

  const totalAssignmentsByJuror = assignments?.reduce((acc: any, assignment: any) => {
    const userId = assignment.jurors.user_id;
    acc[userId] = (acc[userId] || 0) + 1;
    return acc;
  }, {}) || {};

  return Object.values(jurorMetrics).map((juror: any) => ({
    ...juror,
    averageScoreGiven: juror.evaluationsCompleted > 0 ? juror.totalScore / juror.evaluationsCompleted : null,
    participationRate: totalAssignmentsByJuror[juror.id] ? 
      Math.round((juror.evaluationsCompleted / totalAssignmentsByJuror[juror.id]) * 100) : 0
  }));
}

export async function fetchPitchAnalyticsData(): Promise<PitchAnalytics[]> {
  // Fetch pitching assignments with startup and juror details (same as Pitching Calls tab)
  const { data: assignments, error } = await supabase
    .from('pitching_assignments')
    .select(`
      *,
      startup:startups!inner(name, contact_email),
      juror:jurors!inner(name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Helper function to determine assignment status (matching useMeetingsData logic)
  const determineStatus = (assignment: any): string => {
    if (assignment.meeting_completed_date || assignment.status === 'completed') {
      return 'completed';
    }
    if (assignment.status === 'cancelled') {
      return 'cancelled';
    }
    if (assignment.status === 'in_review') {
      return 'in_review';
    }
    if (assignment.status === 'scheduled' || assignment.meeting_scheduled_date) {
      return 'scheduled';
    }
    return 'pending';
  };

  return assignments.map((assignment: any) => {
    const status = determineStatus(assignment);
    return {
      id: assignment.id,
      startupName: assignment.startup.name || 'Unknown',
      pitchStatus: status,
      meetingDate: assignment.meeting_scheduled_date || assignment.meeting_completed_date,
      vcName: assignment.juror.name || 'Unknown',
      outcome: status === 'completed' ? 'Completed' : 
               status === 'scheduled' ? 'Scheduled' : 
               status === 'cancelled' ? 'Cancelled' : 
               status === 'in_review' ? 'In Review' : 
               'Pending',
      notes: assignment.meeting_notes
    };
  });
}

// Utility Functions
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// AI Insights Export Functions
export function exportAIInsightsCSV(insights: RoundInsights, roundName: string): void {
  const sections: string[][] = [];
  
  // Executive Summary
  sections.push(['EXECUTIVE SUMMARY']);
  insights.executive_summary.forEach(item => {
    sections.push([item]);
  });
  sections.push(['']);
  
  // Cohort Patterns
  sections.push(['COHORT PATTERNS', 'Category', 'Finding', 'Percentage', 'Significance']);
  insights.cohort_patterns.forEach(pattern => {
    sections.push([
      '',
      pattern.category,
      pattern.finding,
      `${pattern.percentage}%`,
      pattern.significance.toUpperCase()
    ]);
  });
  sections.push(['']);
  
  // Outliers
  if (insights.outliers.length > 0) {
    sections.push(['OUTLIERS', 'Startup', 'Type', 'Score', 'Variance', 'Explanation']);
    insights.outliers.forEach(outlier => {
      sections.push([
        '',
        outlier.startup_name,
        outlier.type,
        outlier.average_score,
        outlier.description
      ]);
    });
    sections.push(['']);
  }
  
  // Bias Check
  if (insights.bias_check.length > 0) {
    sections.push(['BIAS CHECK', 'Juror', 'Pattern', 'Significance', 'Description']);
    insights.bias_check.forEach(bias => {
      sections.push([
        '',
        bias.juror_name,
        bias.pattern,
        bias.significance,
        bias.description
      ]);
    });
    sections.push(['']);
  }
  
  // Risk Themes
  if (insights.risk_themes.length > 0) {
    sections.push(['RISK THEMES', 'Theme', 'Frequency', 'Severity', 'Description']);
    insights.risk_themes.forEach(theme => {
      sections.push([
        '',
        theme.theme,
        theme.frequency.toString(),
        theme.severity,
        theme.description
      ]);
    });
  }

  const csvContent = sections
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csvContent, `ai-insights-${roundName}-${getDateString()}.csv`, 'text/csv');
}

export async function exportAIInsightsPDF(insights: RoundInsights, roundName: string): Promise<void> {
  const { addAuroraBrandedHeader, addAuroraBrandedFooter, AURORA_COLORS, imageToBase64 } = await import('./pdfBranding');
  const doc = new jsPDF();
  
  // Load logo
  let logoBase64: string | undefined;
  try {
    logoBase64 = await imageToBase64('/images/aurora-logo.png');
  } catch (error) {
    console.warn('Could not load Aurora logo for PDF');
  }
  
  let yPos = 30;
  let currentPage = 1;
  
  // Add Aurora branded header
  addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
  
  // Executive Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text('Executive Summary', 15, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  insights.executive_summary.forEach((item, index) => {
    const lines = doc.splitTextToSize(`• ${item}`, 170);
    lines.forEach((line: string) => {
      if (yPos > 250) {
        addAuroraBrandedFooter(doc, currentPage, Math.ceil(insights.executive_summary.length / 10));
        doc.addPage();
        currentPage++;
        addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
        yPos = 30;
      }
      doc.text(line, 15, yPos);
      yPos += 5;
    });
  });
  yPos += 10;
  
  // Cohort Patterns
  if (yPos > 230) {
    addAuroraBrandedFooter(doc, currentPage, currentPage + 2);
    doc.addPage();
    currentPage++;
    addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
    yPos = 30;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text('Cohort-Wide Patterns', 15, yPos);
  yPos += 10;
  
  const cohortData = insights.cohort_patterns.map(pattern => [
    pattern.category,
    pattern.finding,
    `${pattern.percentage}%`,
    pattern.significance.toUpperCase()
  ]);
  
  autoTable(doc, {
    head: [['Category', 'Finding', 'Percentage', 'Significance']],
    body: cohortData,
    startY: yPos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: AURORA_COLORS.aqua, textColor: AURORA_COLORS.white }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Outliers
  if (insights.outliers.length > 0) {
    if (yPos > 230) {
      addAuroraBrandedFooter(doc, currentPage, currentPage + 2);
      doc.addPage();
      currentPage++;
      addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
      yPos = 30;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...AURORA_COLORS.black);
    doc.text('Outliers & Anomalies', 15, yPos);
    yPos += 10;
    
    const outlierData = insights.outliers.map(outlier => [
      outlier.startup_name,
      outlier.type,
      outlier.average_score,
      outlier.description
    ]);
    
    autoTable(doc, {
      head: [['Startup', 'Type', 'Avg Score', 'Description']],
      body: outlierData,
      startY: yPos,
      styles: { fontSize: 7 },
      headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
      columnStyles: { 3: { cellWidth: 80 } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Bias Check
  if (insights.bias_check.length > 0) {
    if (yPos > 230) {
      addAuroraBrandedFooter(doc, currentPage, currentPage + 2);
      doc.addPage();
      currentPage++;
      addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
      yPos = 30;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...AURORA_COLORS.black);
    doc.text('Bias & Consistency Check', 15, yPos);
    yPos += 10;
    
    const biasData = insights.bias_check.map(bias => [
      bias.juror_name,
      bias.pattern,
      bias.significance,
      bias.description
    ]);
    
    autoTable(doc, {
      head: [['Juror', 'Pattern', 'Significance', 'Description']],
      body: biasData,
      startY: yPos,
      styles: { fontSize: 7 },
      headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
      columnStyles: { 3: { cellWidth: 80 } }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Risk Themes
  if (insights.risk_themes.length > 0) {
    if (yPos > 230) {
      addAuroraBrandedFooter(doc, currentPage, currentPage + 1);
      doc.addPage();
      currentPage++;
      addAuroraBrandedHeader(doc, 'AI-Generated Insights Report', roundName, logoBase64);
      yPos = 30;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...AURORA_COLORS.black);
    doc.text('Common Risk Themes', 15, yPos);
    yPos += 10;
    
    const riskData = insights.risk_themes.map(theme => [
      theme.theme,
      theme.frequency.toString(),
      theme.severity,
      theme.description
    ]);
    
    autoTable(doc, {
      head: [['Theme', 'Frequency', 'Severity', 'Description']],
      body: riskData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: AURORA_COLORS.primary, textColor: AURORA_COLORS.white },
      columnStyles: { 3: { cellWidth: 80 } }
    });
  }
  
  // Add footer to last page
  const totalPages = doc.getNumberOfPages();
  addAuroraBrandedFooter(doc, totalPages, totalPages);

  doc.save(`ai-insights-${roundName}-${getDateString()}.pdf`);
}
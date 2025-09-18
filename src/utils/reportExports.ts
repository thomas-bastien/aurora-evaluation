import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';

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
export function exportEvaluationSummaryPDF(data: StartupAnalytics[], roundName: string, stats: any): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Evaluation Summary Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Round: ${roundName.charAt(0).toUpperCase() + roundName.slice(1)}`, 20, 35);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
  
  // Summary Statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 20, 65);
  
  doc.setFontSize(10);
  doc.text(`Total Startups: ${stats.totalStartups}`, 20, 80);
  doc.text(`Completion Rate: ${stats.completionRate}%`, 20, 90);
  doc.text(`Average Score: ${stats.averageScore.toFixed(2)}`, 20, 100);
  
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
    startY: 115,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`evaluation-summary-${roundName}-${getDateString()}.pdf`);
}

export function exportJurorContributionPDF(data: JurorContribution[], roundName: string, stats: any): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Juror Contribution Report', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Round: ${roundName.charAt(0).toUpperCase() + roundName.slice(1)}`, 20, 35);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
  
  // Summary Statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 20, 65);
  
  doc.setFontSize(10);
  doc.text(`Total Jurors: ${data.length}`, 20, 80);
  doc.text(`Average Participation: ${stats.completionRate}%`, 20, 90);
  doc.text(`Average Score Given: ${stats.averageScore.toFixed(2)}`, 20, 100);
  
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
    startY: 115,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`juror-contribution-${roundName}-${getDateString()}.pdf`);
}

export function exportPitchAnalyticsPDF(data: PitchAnalytics[], roundName: string, stats: any): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Pitch Session Analytics', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Round: ${roundName.charAt(0).toUpperCase() + roundName.slice(1)}`, 20, 35);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
  
  // Summary Statistics
  doc.setFontSize(14);
  doc.text('Summary Statistics', 20, 65);
  
  doc.setFontSize(10);
  doc.text(`Total Pitch Sessions: ${data.length}`, 20, 80);
  doc.text(`Completion Rate: ${stats.completionRate}%`, 20, 90);
  doc.text(`Average Score: ${stats.averageScore.toFixed(2)}`, 20, 100);
  
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
    startY: 115,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`pitch-analytics-${roundName}-${getDateString()}.pdf`);
}

// Data Fetching Functions
export async function fetchJurorContributionData(roundName: string): Promise<JurorContribution[]> {
  const tableName = roundName === 'screeningRound' ? 'screening_evaluations' : 'pitching_evaluations';
  
  const { data: evaluations, error } = await supabase
    .from(tableName)
    .select(`
      evaluator_id,
      overall_score,
      created_at,
      jurors:evaluator_id (name, email)
    `)
    .eq('status', 'submitted');

  if (error) throw error;

  // Group by juror and calculate metrics
  const jurorMetrics = evaluations.reduce((acc: any, evaluation: any) => {
    const jurorId = evaluation.evaluator_id;
    if (!acc[jurorId]) {
      acc[jurorId] = {
        id: jurorId,
        name: evaluation.jurors?.name || 'Unknown',
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

  // Get total assignments for participation rate
  const assignmentTable = roundName === 'screeningRound' ? 'screening_assignments' : 'pitching_assignments';
  const { data: totalAssignments } = await supabase
    .from(assignmentTable)
    .select('juror_id')
    .eq('status', 'assigned');

  const totalAssignmentsByJuror = totalAssignments?.reduce((acc: any, assignment: any) => {
    acc[assignment.juror_id] = (acc[assignment.juror_id] || 0) + 1;
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
  const { data: pitchRequests, error } = await supabase
    .from('pitch_requests')
    .select(`
      id,
      status,
      pitch_date,
      meeting_notes,
      startups:startup_id (name),
      jurors:vc_id (name)
    `);

  if (error) throw error;

  return pitchRequests.map((pitch: any) => ({
    id: pitch.id,
    startupName: pitch.startups?.name || 'Unknown',
    pitchStatus: pitch.status,
    meetingDate: pitch.pitch_date,
    vcName: pitch.jurors?.name || 'Unknown',
    outcome: pitch.status === 'completed' ? 'Completed' : pitch.status === 'scheduled' ? 'Scheduled' : null,
    notes: pitch.meeting_notes
  }));
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
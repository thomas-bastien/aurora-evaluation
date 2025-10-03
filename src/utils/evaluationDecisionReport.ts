import { supabase } from '@/integrations/supabase/client';
import { formatScore } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EvaluationDecisionRow {
  startup_name: string;
  founder_names: string;
  region: string | null;
  country: string | null;
  vertical: string;
  funding_stage: string | null;
  business_model: string | null;
  internal_score: number | null;
  screening_scores: string;
  screening_avg: number | null;
  pitching_scores: string;
  pitching_avg: number | null;
  vc_pitch_requests: number;
}

interface EvaluationWithJuror {
  overall_score: number;
  juror_company: string;
  status: string;
}

/**
 * Fetches comprehensive evaluation decision data for all startups in the specified round
 */
export async function generateEvaluationDecisionData(
  roundName: 'screening' | 'pitching'
): Promise<EvaluationDecisionRow[]> {
  try {
    // Fetch all startups with their evaluations and assignments
    const { data: startups, error: startupsError } = await supabase
      .from('startups')
      .select(`
        id,
        name,
        founder_names,
        region,
        country,
        verticals,
        stage,
        business_model,
        internal_score
      `);

    if (startupsError) throw startupsError;
    if (!startups) return [];

    // Fetch screening evaluations with juror info
    const { data: screeningEvals, error: screeningError } = await supabase
      .from('screening_evaluations')
      .select(`
        startup_id,
        overall_score,
        status,
        evaluator_id
      `)
      .eq('status', 'submitted');

    if (screeningError) throw screeningError;

    // Fetch pitching evaluations with juror info
    const { data: pitchingEvals, error: pitchingError } = await supabase
      .from('pitching_evaluations')
      .select(`
        startup_id,
        overall_score,
        status,
        wants_pitch_session,
        evaluator_id
      `)
      .eq('status', 'submitted');

    if (pitchingError) throw pitchingError;

    // Fetch all jurors to map evaluator_id to company
    const { data: jurors, error: jurorsError } = await supabase
      .from('jurors')
      .select('user_id, company');

    if (jurorsError) throw jurorsError;

    // Create a map of user_id to company
    const jurorMap = new Map(jurors?.map(j => [j.user_id, j.company || 'Unknown']) || []);

    // Process each startup
    const results: EvaluationDecisionRow[] = [];

    for (const startup of startups) {
      // Get screening evaluations for this startup
      const startupScreeningEvals = (screeningEvals || [])
        .filter(e => e.startup_id === startup.id)
        .map(e => ({
          overall_score: Number(e.overall_score),
          juror_company: jurorMap.get(e.evaluator_id) || 'Unknown',
          status: e.status
        }))
        .filter(e => !isNaN(e.overall_score));

      // Get pitching evaluations for this startup
      const startupPitchingEvals = (pitchingEvals || [])
        .filter(e => e.startup_id === startup.id)
        .map(e => ({
          overall_score: Number(e.overall_score),
          juror_company: jurorMap.get(e.evaluator_id) || 'Unknown',
          status: e.status
        }))
        .filter(e => !isNaN(e.overall_score));

      // Count pitch requests
      const pitchRequests = (pitchingEvals || [])
        .filter(e => e.startup_id === startup.id && e.wants_pitch_session)
        .length;

      // Format compact scores
      const screeningScores = formatCompactScores(startupScreeningEvals);
      const pitchingScores = formatCompactScores(startupPitchingEvals);

      // Calculate averages
      const screeningAvg = startupScreeningEvals.length > 0
        ? startupScreeningEvals.reduce((sum, e) => sum + e.overall_score, 0) / startupScreeningEvals.length
        : null;

      const pitchingAvg = startupPitchingEvals.length > 0
        ? startupPitchingEvals.reduce((sum, e) => sum + e.overall_score, 0) / startupPitchingEvals.length
        : null;

      results.push({
        startup_name: startup.name,
        founder_names: (startup.founder_names || []).join(', '),
        region: startup.region,
        country: startup.country,
        vertical: (startup.verticals || [])[0] || 'N/A',
        funding_stage: startup.stage,
        business_model: Array.isArray(startup.business_model) ? startup.business_model.join(', ') : (startup.business_model || 'N/A'),
        internal_score: startup.internal_score,
        screening_scores: screeningScores,
        screening_avg: screeningAvg,
        pitching_scores: pitchingScores,
        pitching_avg: pitchingAvg,
        vc_pitch_requests: pitchRequests
      });
    }

    // Sort by screening average (descending), then pitching average
    return results.sort((a, b) => {
      const aScreening = a.screening_avg || 0;
      const bScreening = b.screening_avg || 0;
      if (aScreening !== bScreening) return bScreening - aScreening;
      
      const aPitching = a.pitching_avg || 0;
      const bPitching = b.pitching_avg || 0;
      return bPitching - aPitching;
    });

  } catch (error) {
    console.error('Error generating evaluation decision data:', error);
    throw error;
  }
}

/**
 * Formats evaluation scores in compact format: "8.5 (TechVentures), 7.8 (Accel)"
 */
function formatCompactScores(evaluations: EvaluationWithJuror[]): string {
  if (evaluations.length === 0) return 'N/A';
  
  // Sort by score descending
  const sorted = [...evaluations].sort((a, b) => b.overall_score - a.overall_score);
  
  return sorted
    .map(e => `${formatScore(e.overall_score)} (${e.juror_company})`)
    .join(', ');
}

/**
 * Exports evaluation decision report as CSV (standard version without internal_score)
 */
export function exportEvaluationDecisionCSV(
  data: EvaluationDecisionRow[],
  roundName: string
): void {
  const headers = [
    'Startup Name',
    'Founder Name',
    'Region',
    'Country',
    'Vertical',
    'Funding Stage',
    'Business Model',
    'Screening Scores',
    'Screening Avg',
    'Pitching Scores',
    'Pitching Avg',
    'VC Pitch Requests'
  ];

  const rows = data.map(row => [
    row.startup_name,
    row.founder_names,
    row.region || 'N/A',
    row.country || 'N/A',
    row.vertical,
    row.funding_stage || 'N/A',
    row.business_model || 'N/A',
    row.screening_scores,
    row.screening_avg !== null ? formatScore(row.screening_avg) : 'N/A',
    row.pitching_scores,
    row.pitching_avg !== null ? formatScore(row.pitching_avg) : 'N/A',
    row.vc_pitch_requests.toString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(
    csvContent,
    `evaluation-decision-report-${roundName}-${getDateString()}.csv`,
    'text/csv'
  );
}

/**
 * Exports evaluation decision report as CSV (full version with internal_score)
 */
export function exportEvaluationDecisionCSVFull(
  data: EvaluationDecisionRow[],
  roundName: string
): void {
  const headers = [
    'Startup Name',
    'Founder Name',
    'Region',
    'Country',
    'Vertical',
    'Funding Stage',
    'Business Model',
    'Internal Score',
    'Screening Scores',
    'Screening Avg',
    'Pitching Scores',
    'Pitching Avg',
    'VC Pitch Requests'
  ];

  const rows = data.map(row => [
    row.startup_name,
    row.founder_names,
    row.region || 'N/A',
    row.country || 'N/A',
    row.vertical,
    row.funding_stage || 'N/A',
    row.business_model || 'N/A',
    row.internal_score !== null ? formatScore(row.internal_score) : 'N/A',
    row.screening_scores,
    row.screening_avg !== null ? formatScore(row.screening_avg) : 'N/A',
    row.pitching_scores,
    row.pitching_avg !== null ? formatScore(row.pitching_avg) : 'N/A',
    row.vc_pitch_requests.toString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadFile(
    csvContent,
    `evaluation-decision-report-FULL-${roundName}-${getDateString()}.csv`,
    'text/csv'
  );
}

/**
 * Exports evaluation decision report as PDF (landscape, color-coded)
 */
export function exportEvaluationDecisionPDF(
  data: EvaluationDecisionRow[],
  roundName: string
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Evaluation Decision Report - ${roundName}`, 14, 15);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 22);
  doc.text(`Total Startups: ${data.length}`, 14, 27);

  // Watermark
  doc.setFontSize(40);
  doc.setTextColor(200, 200, 200);
  doc.text('CONFIDENTIAL', 148, 105, { 
    align: 'center', 
    angle: 45 
  });

  // Table
  autoTable(doc, {
    startY: 32,
    head: [[
      'Startup',
      'Founders',
      'Region',
      'Country',
      'Vertical',
      'Stage',
      'Model',
      'Int.',
      'Screening Scores',
      'Scr. Avg',
      'Pitching Scores',
      'Pitch Avg',
      'Requests'
    ]],
    body: data.map(row => [
      row.startup_name,
      row.founder_names || 'N/A',
      row.region || 'N/A',
      row.country || 'N/A',
      row.vertical,
      row.funding_stage || 'N/A',
      row.business_model || 'N/A',
      row.internal_score !== null ? formatScore(row.internal_score) : 'N/A',
      row.screening_scores,
      row.screening_avg !== null ? formatScore(row.screening_avg) : 'N/A',
      row.pitching_scores,
      row.pitching_avg !== null ? formatScore(row.pitching_avg) : 'N/A',
      row.vc_pitch_requests.toString()
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 15 },
      3: { cellWidth: 15 },
      4: { cellWidth: 18 },
      5: { cellWidth: 15 },
      6: { cellWidth: 18 },
      7: { cellWidth: 10 },
      8: { cellWidth: 28 },
      9: { cellWidth: 12 },
      10: { cellWidth: 28 },
      11: { cellWidth: 12 },
      12: { cellWidth: 12 }
    },
    didParseCell: (data) => {
      // Color code score columns
      if (data.column.index === 9 || data.column.index === 11) {
        const text = data.cell.text[0];
        if (text && text !== 'N/A') {
          const score = parseFloat(text);
          if (!isNaN(score)) {
            if (score >= 8.0) {
              data.cell.styles.textColor = [22, 163, 74]; // green
            } else if (score >= 6.0) {
              data.cell.styles.textColor = [202, 138, 4]; // yellow
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // red
            }
          }
        } else if (text === 'N/A') {
          data.cell.styles.textColor = [220, 38, 38]; // red for N/A
          data.cell.styles.fontStyle = 'italic';
        }
      }
    },
    margin: { top: 32, bottom: 15 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${currentPage} of ${pageCount} | Confidential - Aurora Internal Use Only`,
        148,
        200,
        { align: 'center' }
      );
    }
  });

  doc.save(`evaluation-decision-report-${roundName}-${getDateString()}.pdf`);
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper function to get current date string in YYYY-MM-DD format
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

import { 
  Document, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel, 
  ImageRun, 
  BorderStyle, 
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign
} from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

interface VCFeedbackSection {
  vcNumber: number;
  companyName: string;
  evaluatorName: string;
  strengths: string[];
  improvements: string;
  pitchDevelopment: string;
  focusAreas: string;
  additionalComments: string;
}

interface StartupReportData {
  startup: {
    id: string;
    name: string;
    founder_first_name: string;
    founder_last_name: string;
    contact_email: string;
  };
  vcFeedback: {
    plain_text_feedback: string;
    evaluation_count: number;
  } | null;
  evaluations: VCFeedbackSection[];
}

/**
 * Parse VC feedback plain text into structured sections
 */
function parseVCFeedbackSections(plainText: string): VCFeedbackSection[] {
  // Split by the separator line (60+ equals signs)
  const sections = plainText.split(/={60,}/);
  
  return sections
    .filter(section => section.trim().length > 0)
    .map((section, index) => {
      // Extract VC info
      const vcMatch = section.match(/VC fund #(\d+) - (.+?)(?:\n|$)/);
      const evaluatorMatch = section.match(/Evaluator: (.+?)(?:\n|$)/);
      
      // Extract each subsection
      const strengthsMatch = section.match(
        /Strengths of the startup:\s*\n([\s\S]*?)(?=\n\s*\n(?:Main areas|$))/i
      );
      const improvementsMatch = section.match(
        /Main areas that need improvement:\s*\n([\s\S]*?)(?=\n\s*\n(?:Aspects|$))/i
      );
      const pitchMatch = section.match(
        /Aspects of the pitch that need further development:\s*\n([\s\S]*?)(?=\n\s*\n(?:Key areas|$))/i
      );
      const focusMatch = section.match(
        /Key areas the team should focus on:\s*\n([\s\S]*?)(?=\n\s*\n(?:Additional|$))/i
      );
      const commentsMatch = section.match(
        /Additional comments:\s*\n([\s\S]*?)$/i
      );
      
      // Parse strengths into array (split by bullet points)
      const strengthsText = strengthsMatch?.[1] || '';
      const strengths = strengthsText
        .split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.replace('•', '').trim())
        .filter(s => s.length > 0);
      
      return {
        vcNumber: vcMatch ? parseInt(vcMatch[1]) : index + 1,
        companyName: vcMatch?.[2]?.trim() || 'Unknown Company',
        evaluatorName: evaluatorMatch?.[1]?.trim() || 'Unknown',
        strengths: strengths.length > 0 ? strengths : ['Not provided'],
        improvements: improvementsMatch?.[1]?.trim() || 'Not provided',
        pitchDevelopment: pitchMatch?.[1]?.trim() || 'Not provided',
        focusAreas: focusMatch?.[1]?.trim() || 'Not provided',
        additionalComments: commentsMatch?.[1]?.trim() || 'No additional comments provided'
      };
    })
    .filter(section => section.companyName !== 'Unknown Company');
}

/**
 * Fetch startup data and approved VC feedback for report generation
 */
export async function fetchStartupReportData(
  startupId: string,
  roundName: 'screening' | 'pitching'
): Promise<StartupReportData> {
  // Fetch startup profile
  const { data: startup, error: startupError } = await supabase
    .from('startups')
    .select('id, name, founder_first_name, founder_last_name, contact_email')
    .eq('id', startupId)
    .single();

  if (startupError) throw new Error(`Failed to fetch startup: ${startupError.message}`);

  // Fetch approved VC feedback details
  const { data: vcFeedback, error: feedbackError } = await supabase
    .from('startup_vc_feedback_details')
    .select('plain_text_feedback, evaluation_count, is_approved')
    .eq('startup_id', startupId)
    .eq('round_name', roundName)
    .eq('is_approved', true)
    .maybeSingle();

  // Parse feedback if available
  const evaluations = vcFeedback?.plain_text_feedback 
    ? parseVCFeedbackSections(vcFeedback.plain_text_feedback)
    : [];

  return {
    startup,
    vcFeedback: vcFeedback || null,
    evaluations
  };
}

/**
 * Fetch image from URL and convert to Uint8Array for docx embedding
 */
async function fetchImageAsBase64(imagePath: string): Promise<Uint8Array> {
  try {
    const response = await fetch(imagePath);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
}

/**
 * Create intro paragraphs matching the template
 */
function createIntroParagraphs(): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: "Congratulations once again on being selected for the Aurora Tech Awards Top 100!",
          size: 22 // 11pt
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "You've already proven yourself as one of the most promising founders in emerging markets, and we're excited to continue supporting you on your journey.",
          size: 22
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "As part of our process, we've partnered with leading VCs who helped us identify the founders with the highest potential to move forward. Their feedback goes beyond selection—it's a rare opportunity to access the expertise of investors who are typically out of reach, providing valuable, actionable insights to shape your startup's path.",
          size: 22
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Below, you'll find detailed feedback from each VC fund. We encourage you to use these insights to build on your strengths and tackle key opportunities.",
          size: 22
        })
      ],
      spacing: { after: 400 }
    })
  ];
}

/**
 * Helper function to format strengths array for table display
 */
function formatStrengths(strengths: string[]): string {
  return strengths.map(s => `• ${s}`).join('\n');
}

/**
 * Helper function to create a feedback table row
 */
function createFeedbackRow(label: string, content: string): TableRow {
  return new TableRow({
    children: [
      // Left cell: Label (bold)
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                bold: true,
                size: 22
              })
            ]
          })
        ],
        width: { size: 40, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.TOP,
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
      }),
      
      // Right cell: Content
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: 22
              })
            ]
          })
        ],
        width: { size: 60, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.TOP,
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
      })
    ]
  });
}

/**
 * Create VC feedback section with table-based layout matching template
 */
function createVCFeedbackSection(vc: VCFeedbackSection): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // VC heading in BLUE color
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Feedback from VC #${vc.vcNumber}`,
          bold: true,
          size: 28, // 14pt
          color: '4169E1' // Blue color matching template
        })
      ],
      spacing: { before: 400, after: 200 }
    })
  );

  // Create table with feedback in structured format
  const feedbackTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '000000' }
    },
    rows: [
      // Row 1: Strengths
      createFeedbackRow('Strengths of the startup:', formatStrengths(vc.strengths)),
      
      // Row 2: Improvements
      createFeedbackRow('Main areas that need improvement:', vc.improvements),
      
      // Row 3: Pitch Development
      createFeedbackRow('Aspects of the pitch that need further development:', vc.pitchDevelopment),
      
      // Row 4: Focus Areas
      createFeedbackRow('Key areas the team should focus on:', vc.focusAreas),
      
      // Row 5: Additional Comments
      createFeedbackRow('Additional comments:', vc.additionalComments)
    ]
  });

  elements.push(feedbackTable);

  return elements;
}

/**
 * Create closing paragraphs with blue separator
 */
function createClosingParagraphs(): Paragraph[] {
  return [
    // Blue separator before closing
    new Paragraph({
      border: {
        top: {
          color: '4169E1',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12
        }
      },
      spacing: { before: 400, after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "These insights are designed to help you refine your strategy and accelerate your growth — we genuinely hope they provide value to your journey.",
          size: 22
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "At Aurora, our mission is to make this platform as valuable as possible for female founders in emerging markets. If you have any suggestions on how we can improve or better support you, we're all ears.",
          size: 22
        })
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Best regards,",
          size: 22
        })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "The Aurora Tech Awards Team",
          bold: true,
          size: 22
        })
      ]
    })
  ];
}

/**
 * Generate document blob from startup data (reusable for single and bulk generation)
 */
async function generateDocumentBlob(
  data: StartupReportData,
  cachedLogos?: { aurora: Uint8Array | null; indrive: Uint8Array | null }
): Promise<Blob> {
  // Load logo images (use cached if available)
  let auroraLogo: Uint8Array | null = cachedLogos?.aurora ?? null;
  let indriveLogo: Uint8Array | null = cachedLogos?.indrive ?? null;

  if (!cachedLogos) {
    try {
      auroraLogo = await fetchImageAsBase64('/images/aurora-tech-award-logo.jpg');
    } catch (error) {
      console.warn('Failed to load Aurora logo:', error);
    }

    try {
      indriveLogo = await fetchImageAsBase64('/images/indrive-branding.jpg');
    } catch (error) {
      console.warn('Failed to load inDrive branding:', error);
    }
  }

  // Build document sections
  const children: (Paragraph | Table)[] = [];

  // Header with logos (if available)
  if (auroraLogo || indriveLogo) {
    const headerChildren: (ImageRun | TextRun)[] = [];

    if (auroraLogo) {
      headerChildren.push(
        new ImageRun({
          type: 'jpg',
          data: auroraLogo,
          transformation: {
            width: 180,
            height: 50
          }
        })
      );
    }

    if (auroraLogo && indriveLogo) {
      headerChildren.push(new TextRun({ text: '\t\t\t\t\t\t' }));
    }

    if (indriveLogo) {
      headerChildren.push(
        new ImageRun({
          type: 'jpg',
          data: indriveLogo,
          transformation: {
            width: 180,
            height: 50
          }
        })
      );
    }

    children.push(
      new Paragraph({
        children: headerChildren,
        spacing: { after: 200 }
      })
    );
  }

  // Blue separator line (thicker to match template)
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: '4169E1',
          space: 1,
          style: BorderStyle.SINGLE,
          size: 24
        }
      },
      spacing: { after: 400 }
    })
  );

  // Greeting
  const founderName = data.startup.founder_first_name || 'Founder';
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Dear ${founderName},`,
          size: 22
        })
      ],
      spacing: { after: 200 }
    })
  );

  // Intro paragraphs
  children.push(...createIntroParagraphs());

  // VC Feedback sections with separators between them
  data.evaluations.forEach((vc, index) => {
    // Add separator before each VC section (except first)
    if (index > 0) {
      children.push(
        new Paragraph({
          border: {
            top: {
              color: '4169E1',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 12
            }
          },
          spacing: { before: 400, after: 400 }
        })
      );
    }
    
    children.push(...createVCFeedbackSection(vc));
  });

  // Closing paragraphs
  children.push(...createClosingParagraphs());

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch in twips
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children
    }]
  });

  // Return blob
  return await Packer.toBlob(doc);
}

/**
 * Generate Word document for startup report and download
 */
export async function generateStartupReportDocx(
  startupId: string,
  roundName: 'screening' | 'pitching'
): Promise<void> {
  const data = await fetchStartupReportData(startupId, roundName);

  if (!data.vcFeedback || data.evaluations.length === 0) {
    throw new Error('No approved VC feedback available for this startup');
  }

  const blob = await generateDocumentBlob(data);
  const fileName = `${data.startup.name.replace(/\s+/g, '-')}-VC-Feedback-Letter.docx`;
  saveAs(blob, fileName);
}

/**
 * Generate Word documents for multiple startups and return as blobs
 */
export async function generateMultipleReports(
  startupIds: string[],
  roundName: 'screening' | 'pitching',
  onProgress?: (current: number, total: number, startupName: string) => void
): Promise<Array<{ fileName: string; blob: Blob; startupName: string }>> {
  const results: Array<{ fileName: string; blob: Blob; startupName: string }> = [];
  
  // Load logos once for all reports
  let cachedLogos = { aurora: null as Uint8Array | null, indrive: null as Uint8Array | null };
  try {
    cachedLogos.aurora = await fetchImageAsBase64('/images/aurora-tech-award-logo.jpg');
  } catch (error) {
    console.warn('Failed to load Aurora logo:', error);
  }
  try {
    cachedLogos.indrive = await fetchImageAsBase64('/images/indrive-branding.jpg');
  } catch (error) {
    console.warn('Failed to load inDrive branding:', error);
  }
  
  for (let i = 0; i < startupIds.length; i++) {
    const startupId = startupIds[i];
    
    try {
      // Fetch data
      const data = await fetchStartupReportData(startupId, roundName);
      
      if (!data.vcFeedback || data.evaluations.length === 0) {
        console.warn(`Skipping ${data.startup.name} - no approved feedback`);
        continue;
      }
      
      // Generate document with cached logos
      const blob = await generateDocumentBlob(data, cachedLogos);
      const fileName = `${data.startup.name.replace(/\s+/g, '-')}-VC-Feedback-Letter.docx`;
      
      results.push({
        fileName,
        blob,
        startupName: data.startup.name
      });
      
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, startupIds.length, data.startup.name);
      }
      
    } catch (error) {
      console.error(`Failed to generate report for startup ${startupId}:`, error);
      // Continue with next startup instead of failing entire batch
    }
  }
  
  return results;
}

/**
 * Generate all reports for approved startups and download as ZIP
 */
export async function generateAndDownloadAllReports(
  startupIds: string[],
  roundName: 'screening' | 'pitching',
  format: 'docx' | 'pdf' = 'docx',
  onProgress?: (current: number, total: number, startupName: string) => void
): Promise<void> {
  if (startupIds.length === 0) {
    throw new Error('No startups to generate reports for');
  }

  let reports: Array<{ fileName: string; blob: Blob; startupName: string }> = [];

  // Generate all documents in selected format
  if (format === 'docx') {
    reports = await generateMultipleReports(startupIds, roundName, onProgress);
  } else {
    // Dynamic import for PDF to avoid loading heavy dependencies if not needed
    const { generateMultiplePdfReports } = await import('./individualStartupReportPdf');
    reports = await generateMultiplePdfReports(startupIds, roundName, onProgress);
  }

  if (reports.length === 0) {
    throw new Error('No reports were generated successfully');
  }

  // Create ZIP file
  const zip = new JSZip();
  
  reports.forEach(({ fileName, blob }) => {
    zip.file(fileName, blob);
  });

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // Download ZIP
  const roundLabel = roundName === 'screening' ? 'Screening' : 'Pitching';
  const timestamp = new Date().toISOString().split('T')[0];
  const formatLabel = format.toUpperCase();
  const zipFileName = `Aurora-VC-Feedback-Letters-${roundLabel}-${formatLabel}-${timestamp}.zip`;
  
  saveAs(zipBlob, zipFileName);
}

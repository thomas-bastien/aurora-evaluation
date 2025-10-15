import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addAuroraBrandedHeader, addAuroraBrandedFooter } from './pdfBranding';
import { fetchStartupReportData } from './individualStartupReportDocx';

/**
 * Generate PDF version of startup feedback letter
 */
export async function generateStartupReportPdf(
  startupId: string,
  roundName: 'screening' | 'pitching'
): Promise<void> {
  const data = await fetchStartupReportData(startupId, roundName);

  if (!data.vcFeedback || data.evaluations.length === 0) {
    throw new Error('No approved VC feedback available for this startup');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72; // 1 inch margins
  const contentWidth = pageWidth - (margin * 2);
  let yPos = 120;

  // Add header with branding
  await addAuroraBrandedHeader(doc, 'VC Feedback Letter', roundName);

  // Greeting
  const founderName = data.startup.founder_first_name || 'Founder';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dear ${founderName},`, margin, yPos);
  yPos += 20;

  // Intro paragraphs
  const introParagraphs = [
    "Congratulations once again on being selected for the Aurora Tech Awards Top 100! You've already proven yourself as one of the most promising founders in emerging markets, and we're excited to continue supporting you on your journey.",
    "As part of our process, we've partnered with leading VCs who helped us identify the founders with the highest potential to move forward. Their feedback goes beyond selection—it's a rare opportunity to access the expertise of investors who are typically out of reach, providing valuable, actionable insights to shape your startup's path.",
    "Below, you'll find detailed feedback from each VC fund. We encourage you to use these insights to build on your strengths and tackle key opportunities."
  ];

  doc.setFontSize(11);
  introParagraphs.forEach(paragraph => {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = 72;
      }
      doc.text(line, margin, yPos);
      yPos += 14;
    });
    yPos += 10;
  });

  yPos += 10;

  // VC Feedback sections
  data.evaluations.forEach((vc, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 200) {
      doc.addPage();
      yPos = 72;
    }

    // Add separator line before each VC (except first)
    if (index > 0) {
      doc.setDrawColor(65, 105, 225); // Blue color
      doc.setLineWidth(2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 20;
    }

    // VC heading in blue
    doc.setTextColor(65, 105, 225); // Blue color
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Feedback from VC #${vc.vcNumber}`, margin, yPos);
    yPos += 20;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Create table with feedback
    const tableData = [
      ['Strengths of the startup:', vc.strengths.map(s => `• ${s}`).join('\n')],
      ['Main areas that need improvement:', vc.improvements],
      ['Aspects of the pitch that need further development:', vc.pitchDevelopment],
      ['Key areas the team should focus on:', vc.focusAreas],
      ['Additional comments:', vc.additionalComments]
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { 
          cellWidth: contentWidth * 0.4, 
          fontStyle: 'bold',
          valign: 'top'
        },
        1: { 
          cellWidth: contentWidth * 0.6,
          valign: 'top'
        }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;
  });

  // Closing section with separator
  if (yPos > pageHeight - 150) {
    doc.addPage();
    yPos = 72;
  }

  // Blue separator line before closing
  doc.setDrawColor(65, 105, 225);
  doc.setLineWidth(2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 20;

  // Closing paragraphs
  const closingParagraphs = [
    "These insights are designed to help you refine your strategy and accelerate your growth — we genuinely hope they provide value to your journey.",
    "At Aurora, our mission is to make this platform as valuable as possible for female founders in emerging markets. If you have any suggestions on how we can improve or better support you, we're all ears."
  ];

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  closingParagraphs.forEach(paragraph => {
    const lines = doc.splitTextToSize(paragraph, contentWidth);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 100) {
        doc.addPage();
        yPos = 72;
      }
      doc.text(line, margin, yPos);
      yPos += 14;
    });
    yPos += 10;
  });

  yPos += 20;

  // Signature
  doc.text('Best regards,', margin, yPos);
  yPos += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('The Aurora Tech Awards Team', margin, yPos);

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addAuroraBrandedFooter(doc, i, totalPages);
  }

  // Save PDF
  const fileName = `${data.startup.name.replace(/\s+/g, '-')}-VC-Feedback-Letter.pdf`;
  doc.save(fileName);
}

/**
 * Generate multiple PDF reports and return as blobs
 */
export async function generateMultiplePdfReports(
  startupIds: string[],
  roundName: 'screening' | 'pitching',
  onProgress?: (current: number, total: number, startupName: string) => void
): Promise<Array<{ fileName: string; blob: Blob; startupName: string }>> {
  const results: Array<{ fileName: string; blob: Blob; startupName: string }> = [];

  for (let i = 0; i < startupIds.length; i++) {
    const startupId = startupIds[i];

    try {
      const data = await fetchStartupReportData(startupId, roundName);

      if (!data.vcFeedback || data.evaluations.length === 0) {
        console.warn(`Skipping ${data.startup.name} - no approved feedback`);
        continue;
      }

      // Generate PDF using same logic as single report
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 72;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = 120;

      await addAuroraBrandedHeader(doc, 'VC Feedback Letter', roundName);

      const founderName = data.startup.founder_first_name || 'Founder';
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dear ${founderName},`, margin, yPos);
      yPos += 20;

      const introParagraphs = [
        "Congratulations once again on being selected for the Aurora Tech Awards Top 100! You've already proven yourself as one of the most promising founders in emerging markets, and we're excited to continue supporting you on your journey.",
        "As part of our process, we've partnered with leading VCs who helped us identify the founders with the highest potential to move forward. Their feedback goes beyond selection—it's a rare opportunity to access the expertise of investors who are typically out of reach, providing valuable, actionable insights to shape your startup's path.",
        "Below, you'll find detailed feedback from each VC fund. We encourage you to use these insights to build on your strengths and tackle key opportunities."
      ];

      doc.setFontSize(11);
      introParagraphs.forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph, contentWidth);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = 72;
          }
          doc.text(line, margin, yPos);
          yPos += 14;
        });
        yPos += 10;
      });

      yPos += 10;

      data.evaluations.forEach((vc, index) => {
        if (yPos > pageHeight - 200) {
          doc.addPage();
          yPos = 72;
        }

        if (index > 0) {
          doc.setDrawColor(65, 105, 225);
          doc.setLineWidth(2);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 20;
        }

        doc.setTextColor(65, 105, 225);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Feedback from VC #${vc.vcNumber}`, margin, yPos);
        yPos += 20;
        doc.setTextColor(0, 0, 0);

        const tableData = [
          ['Strengths of the startup:', vc.strengths.map(s => `• ${s}`).join('\n')],
          ['Main areas that need improvement:', vc.improvements],
          ['Aspects of the pitch that need further development:', vc.pitchDevelopment],
          ['Key areas the team should focus on:', vc.focusAreas],
          ['Additional comments:', vc.additionalComments]
        ];

        autoTable(doc, {
          startY: yPos,
          head: [],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 10,
            cellPadding: 8,
            lineColor: [0, 0, 0],
            lineWidth: 0.5
          },
          columnStyles: {
            0: {
              cellWidth: contentWidth * 0.4,
              fontStyle: 'bold',
              valign: 'top'
            },
            1: {
              cellWidth: contentWidth * 0.6,
              valign: 'top'
            }
          },
          margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 20;
      });

      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = 72;
      }

      doc.setDrawColor(65, 105, 225);
      doc.setLineWidth(2);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 20;

      const closingParagraphs = [
        "These insights are designed to help you refine your strategy and accelerate your growth — we genuinely hope they provide value to your journey.",
        "At Aurora, our mission is to make this platform as valuable as possible for female founders in emerging markets. If you have any suggestions on how we can improve or better support you, we're all ears."
      ];

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      closingParagraphs.forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph, contentWidth);
        lines.forEach((line: string) => {
          if (yPos > pageHeight - 100) {
            doc.addPage();
            yPos = 72;
          }
          doc.text(line, margin, yPos);
          yPos += 14;
        });
        yPos += 10;
      });

      yPos += 20;
      doc.text('Best regards,', margin, yPos);
      yPos += 16;
      doc.setFont('helvetica', 'bold');
      doc.text('The Aurora Tech Awards Team', margin, yPos);

      const totalPages = doc.getNumberOfPages();
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        addAuroraBrandedFooter(doc, j, totalPages);
      }

      const blob = doc.output('blob');
      const fileName = `${data.startup.name.replace(/\s+/g, '-')}-VC-Feedback-Letter.pdf`;

      results.push({
        fileName,
        blob,
        startupName: data.startup.name
      });

      if (onProgress) {
        onProgress(i + 1, startupIds.length, data.startup.name);
      }

    } catch (error) {
      console.error(`Failed to generate PDF report for startup ${startupId}:`, error);
    }
  }

  return results;
}

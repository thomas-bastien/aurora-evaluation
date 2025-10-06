import jsPDF from 'jspdf';

/**
 * Aurora Tech Award PDF Branding Utilities
 * Centralizes brand colors, logo handling, and header/footer generators
 * Following Aurora brand guidelines v2.0
 */

// Aurora Brand Colors (RGB values for jsPDF)
export const AURORA_COLORS = {
  primary: [103, 127, 255] as [number, number, number],      // #677FFF - Aurora Blue
  yellowGreen: [214, 255, 102] as [number, number, number],  // #D6FF66
  black: [20, 20, 20] as [number, number, number],           // #141414
  aqua: [0, 214, 187] as [number, number, number],           // #00D6BB
  cyan: [95, 234, 255] as [number, number, number],          // #5FEAFF
  driveGreen: [193, 241, 29] as [number, number, number],    // #C1F11D
  white: [255, 255, 255] as [number, number, number],        // #FFFFFF
  textGray: [100, 100, 100] as [number, number, number],
  
  // Score colors (keeping existing logic)
  scoreGreen: [22, 163, 74] as [number, number, number],
  scoreYellow: [202, 138, 4] as [number, number, number],
  scoreRed: [220, 38, 38] as [number, number, number],
};

/**
 * Convert image to base64 data URL
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = imagePath;
  });
}

/**
 * Add Aurora branded header to PDF
 * @param doc - jsPDF document instance
 * @param title - Report title
 * @param roundName - Round name (e.g., "Screening Round")
 * @param logoBase64 - Optional base64 logo data URL
 */
export function addAuroraBrandedHeader(
  doc: jsPDF,
  title: string,
  roundName: string,
  logoBase64?: string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Add logo if provided
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, 10, 40, 10);
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  }
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AURORA_COLORS.black);
  doc.text(title, logoBase64 ? 60 : 15, 15);
  
  // "by inDrive" descriptor
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  doc.text('by inDrive', logoBase64 ? 60 : 15, 19);
  
  // Round name and date (right aligned)
  doc.setFontSize(10);
  doc.setTextColor(...AURORA_COLORS.textGray);
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  const roundText = `Round: ${roundName} | Generated: ${dateStr}`;
  const textWidth = doc.getTextWidth(roundText);
  doc.text(roundText, pageWidth - textWidth - 15, 15);
  
  // Divider line
  doc.setDrawColor(...AURORA_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, 25, pageWidth - 15, 25);
}

/**
 * Add Aurora branded footer to PDF
 * @param doc - jsPDF document instance
 * @param pageNum - Current page number
 * @param totalPages - Total number of pages
 */
export function addAuroraBrandedFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer divider line
  doc.setDrawColor(...AURORA_COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  
  // Page number (left)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AURORA_COLORS.textGray);
  doc.text(`Page ${pageNum} of ${totalPages}`, 15, pageHeight - 12);
  
  // Aurora branding (center)
  const brandText = 'Aurora Tech Award by inDrive';
  const brandWidth = doc.getTextWidth(brandText);
  doc.setFont('helvetica', 'bold');
  doc.text(brandText, (pageWidth - brandWidth) / 2, pageHeight - 12);
  
  // Confidential notice (right)
  const confidentialText = 'Confidential - Internal Use';
  const confWidth = doc.getTextWidth(confidentialText);
  doc.setFont('helvetica', 'italic');
  doc.text(confidentialText, pageWidth - confWidth - 15, pageHeight - 12);
}

/**
 * Add watermark to PDF page
 * @param doc - jsPDF document instance
 * @param text - Watermark text
 */
export function addAuroraWatermark(doc: jsPDF, text: string = 'CONFIDENTIAL'): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.saveGraphicsState();
  // Use light color for watermark effect
  doc.setTextColor(103, 127, 255, 0.1);
  doc.setFontSize(60);
  doc.setFont('helvetica', 'bold');
  
  // Center and rotate watermark
  const textWidth = doc.getTextWidth(text);
  doc.text(
    text,
    (pageWidth - textWidth) / 2,
    pageHeight / 2,
    { 
      angle: 45
    }
  );
  
  doc.restoreGraphicsState();
}

/**
 * Get score color based on value
 * @param score - Numeric score value
 * @param maxScore - Maximum possible score
 * @returns RGB color array
 */
export function getScoreColor(score: number, maxScore: number = 10): [number, number, number] {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 70) return AURORA_COLORS.scoreGreen;
  if (percentage >= 50) return AURORA_COLORS.scoreYellow;
  return AURORA_COLORS.scoreRed;
}

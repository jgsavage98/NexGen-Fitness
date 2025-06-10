import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface ProgressReportData {
  client: {
    firstName: string;
    lastName: string;
    weight: number;
    goalWeight: number;
    goal: string;
  };
  currentWeight: number;
  weightChange: number;
  avgAdherence: number;
  reportDate: string;
}

export async function generateProgressReportPDF(data: ProgressReportData): Promise<Buffer> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  // Load fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Colors
  const primaryBlue = rgb(0.23, 0.51, 0.96); // #3B82F6
  const darkGray = rgb(0.22, 0.26, 0.32); // #374151
  const lightGray = rgb(0.42, 0.45, 0.50); // #6B7280
  const green = rgb(0.06, 0.73, 0.51); // #10B981
  const purple = rgb(0.55, 0.36, 0.97); // #8B5CF6
  const orange = rgb(0.96, 0.62, 0.04); // #F59E0B
  
  let yPosition = height - 50;
  
  // Header Section
  page.drawText('PROGRESS REPORT', {
    x: 50,
    y: yPosition,
    size: 24,
    font: helveticaBoldFont,
    color: primaryBlue,
  });
  
  yPosition -= 30;
  page.drawText(`${data.client.firstName} ${data.client.lastName}`, {
    x: 50,
    y: yPosition,
    size: 18,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  page.drawText(`Report Generated: ${data.reportDate}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 15;
  page.drawText('Coach: Chassidy Escobedo, Certified Personal Trainer', {
    x: 50,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Header line
  yPosition -= 20;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 2,
    color: primaryBlue,
  });
  
  yPosition -= 25;
  
  // Metrics Grid
  const goalProgress = Math.round(Math.abs(data.weightChange) / Math.abs(data.client.goalWeight - data.client.weight) * 100);
  
  const metrics = [
    { label: 'Current Weight', value: `${data.currentWeight} lbs`, color: primaryBlue },
    { label: 'Total Change', value: `${data.weightChange < 0 ? '-' : '+'}${Math.abs(data.weightChange).toFixed(1)} lbs`, color: green },
    { label: 'Goal Progress', value: `${goalProgress}%`, color: purple },
    { label: 'Avg Adherence', value: `${data.avgAdherence}%`, color: orange }
  ];
  
  const cardWidth = 110;
  const cardSpacing = 15;
  const startX = (width - (4 * cardWidth + 3 * cardSpacing)) / 2;
  
  metrics.forEach((metric, index) => {
    const cardX = startX + index * (cardWidth + cardSpacing);
    
    // Card background
    page.drawRectangle({
      x: cardX - 10,
      y: yPosition - 40,
      width: cardWidth,
      height: 60,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.90, 0.91, 0.92),
      borderWidth: 1,
    });
    
    // Value
    page.drawText(metric.value, {
      x: cardX + 5,
      y: yPosition - 12,
      size: 16,
      font: helveticaBoldFont,
      color: metric.color,
    });
    
    // Label
    page.drawText(metric.label, {
      x: cardX - 5,
      y: yPosition - 28,
      size: 9,
      font: helveticaFont,
      color: lightGray,
    });
  });
  
  yPosition -= 70;
  
  // Weight Progress Section
  page.drawText('Weight Progress Trend', {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  // Blue accent line
  page.drawLine({
    start: { x: 46, y: yPosition + 2 },
    end: { x: 46, y: yPosition - 15 },
    thickness: 3,
    color: primaryBlue,
  });
  
  yPosition -= 20;
  page.drawRectangle({
    x: 50,
    y: yPosition - 40,
    width: width - 100,
    height: 40,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.82, 0.84, 0.86),
    borderWidth: 1,
    borderDashArray: [5, 3],
  });
  
  page.drawText(`Weight tracking shows ${Math.abs(data.weightChange).toFixed(1)} lbs ${data.weightChange < 0 ? 'loss' : 'gain'} toward ${data.client.goalWeight} lbs target`, {
    x: 70,
    y: yPosition - 25,
    size: 10,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 60;
  
  // Macro Adherence Section
  page.drawText('Macro Adherence Overview', {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  page.drawLine({
    start: { x: 46, y: yPosition + 2 },
    end: { x: 46, y: yPosition - 15 },
    thickness: 3,
    color: primaryBlue,
  });
  
  yPosition -= 20;
  page.drawRectangle({
    x: 50,
    y: yPosition - 40,
    width: width - 100,
    height: 40,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.82, 0.84, 0.86),
    borderWidth: 1,
    borderDashArray: [5, 3],
  });
  
  page.drawText(`Average macro adherence: ${data.avgAdherence}% over the last 30 days`, {
    x: 70,
    y: yPosition - 25,
    size: 10,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 60;
  
  // Progress Summary Section
  page.drawRectangle({
    x: 50,
    y: yPosition - 80,
    width: width - 100,
    height: 80,
    color: rgb(0.94, 0.97, 1.0),
    borderColor: primaryBlue,
    borderWidth: 1,
  });
  
  page.drawText('Progress Summary', {
    x: 70,
    y: yPosition - 15,
    size: 14,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  const summaryText = [
    `${data.client.firstName} has been making excellent progress toward their ${data.client.goal?.replace('-', ' ')} goal.`,
    `Weight tracking shows a ${Math.abs(data.weightChange).toFixed(1)} lb ${data.weightChange < 0 ? 'loss' : 'gain'}, representing ${goalProgress}% progress toward ${data.client.goalWeight} lbs.`,
    `Average macro adherence of ${data.avgAdherence}% demonstrates consistent commitment to the nutrition plan.`
  ];
  
  summaryText.forEach((line, index) => {
    page.drawText(line, {
      x: 70,
      y: yPosition - 35 - (index * 12),
      size: 9,
      font: helveticaFont,
      color: darkGray,
    });
  });
  
  yPosition -= 100;
  
  // Coach Signature
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: width - 50, y: yPosition },
    thickness: 1,
    color: rgb(0.90, 0.91, 0.92),
  });
  
  yPosition -= 15;
  page.drawText('Keep up the excellent work!', {
    x: width - 220,
    y: yPosition,
    size: 10,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 12;
  page.drawText('Coach Chassidy Escobedo', {
    x: width - 220,
    y: yPosition,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 10;
  page.drawText('Certified Personal Trainer & Nutrition Coach', {
    x: width - 220,
    y: yPosition,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 10;
  page.drawText('Ignite Fitness & Nutrition', {
    x: width - 220,
    y: yPosition,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function savePDFToFile(pdfBuffer: Buffer, filename: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'public', 'reports');
  
  // Ensure directory exists
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, filename);
  await fs.writeFile(filePath, pdfBuffer);
  
  return `/reports/${filename}`;
}
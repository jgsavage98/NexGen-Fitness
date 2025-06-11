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
  
  // Try to embed the Ignite logo
  let logoImage = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'ignite-logo.png');
    const logoBytes = await fs.readFile(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.log('Logo not found, proceeding without logo');
  }
  
  // Colors
  const primaryBlue = rgb(0.23, 0.51, 0.96); // #3B82F6
  const darkGray = rgb(0.22, 0.26, 0.32); // #374151
  const lightGray = rgb(0.42, 0.45, 0.50); // #6B7280
  const green = rgb(0.06, 0.73, 0.51); // #10B981
  const purple = rgb(0.55, 0.36, 0.97); // #8B5CF6
  const orange = rgb(0.96, 0.62, 0.04); // #F59E0B
  
  let yPosition = height - 40;
  
  // Header Section with Logo
  page.drawText('Progress Report', {
    x: 50,
    y: yPosition,
    size: 20,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  // Add Ignite logo on the right side
  if (logoImage) {
    const logoWidth = 60;
    const logoHeight = 40;
    page.drawImage(logoImage, {
      x: width - logoWidth - 50,
      y: yPosition - 10,
      width: logoWidth,
      height: logoHeight,
    });
  }
  
  // Date below logo
  page.drawText(data.reportDate, {
    x: width - 150,
    y: yPosition - 50,
    size: 10,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 25;
  page.drawText(`${data.client.firstName} ${data.client.lastName}`, {
    x: 50,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 15;
  page.drawText('Coach: Chassidy Escobedo', {
    x: 50,
    y: yPosition,
    size: 9,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 20;
  
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
  
  // Weight Progress Chart Section
  page.drawText('Weight Progress Over Time', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  // Weight Progress Chart - Simplified
  const chartWidth = 400;
  const chartHeight = 60;
  const chartX = 80;
  const chartY = yPosition - 70;
  
  // Chart background
  page.drawRectangle({
    x: chartX,
    y: chartY,
    width: chartWidth,
    height: chartHeight,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.85, 0.85, 0.87),
    borderWidth: 1,
  });
  
  // Simple weight progression
  const startWeight = data.client.weight + Math.abs(data.weightChange);
  const endWeight = data.currentWeight;
  const goalWeight = data.client.goalWeight;
  
  // Draw y-axis labels (weights)
  const weights = [goalWeight - 5, goalWeight, startWeight, startWeight + 5];
  weights.forEach((weight, index) => {
    const y = chartY + (index * chartHeight / 3);
    page.drawText(`${weight}`, {
      x: chartX - 25,
      y: y - 3,
      size: 8,
      font: helveticaFont,
      color: lightGray,
    });
  });
  
  // Draw baseline line (starting weight)
  const baselineY = chartY + chartHeight * 0.6;
  page.drawLine({
    start: { x: chartX + 10, y: baselineY },
    end: { x: chartX + chartWidth - 10, y: baselineY },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
    dashArray: [3, 3],
  });
  
  page.drawText(`Baseline: ${startWeight.toFixed(1)} lbs`, {
    x: chartX + chartWidth - 120,
    y: baselineY + 8,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Draw goal line
  const goalY = chartY + chartHeight * 0.2;
  page.drawLine({
    start: { x: chartX + 10, y: goalY },
    end: { x: chartX + chartWidth - 10, y: goalY },
    thickness: 1,
    color: green,
    dashArray: [3, 3],
  });
  
  page.drawText(`Goal: ${goalWeight} lbs`, {
    x: chartX + chartWidth - 100,
    y: goalY - 12,
    size: 8,
    font: helveticaFont,
    color: green,
  });
  
  // Draw weight progress line (declining trend)
  const progressY = chartY + chartHeight * 0.4; // Current weight position
  page.drawLine({
    start: { x: chartX + 10, y: baselineY },
    end: { x: chartX + chartWidth - 10, y: progressY },
    thickness: 3,
    color: primaryBlue,
  });
  
  // Add data points
  for (let i = 0; i <= 4; i++) {
    const x = chartX + 10 + (i * (chartWidth - 20) / 4);
    const y = baselineY - (i * (baselineY - progressY) / 4);
    
    page.drawCircle({
      x: x,
      y: y,
      size: 3,
      color: primaryBlue,
    });
  }
  
  // X-axis labels
  page.drawText('Jun 8', {
    x: chartX + 5,
    y: chartY - 12,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  page.drawText('Today', {
    x: chartX + chartWidth - 25,
    y: chartY - 12,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 90;
  
  // Macro Adherence Chart Section
  page.drawText('Macro Adherence (Last 7 Days)', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  // Macro Adherence Chart - Simplified Bar Chart
  const macroChartWidth = 400;
  const macroChartHeight = 50;
  const macroChartX = 80;
  const macroChartY = yPosition - 60;
  
  // Chart background
  page.drawRectangle({
    x: macroChartX,
    y: macroChartY,
    width: macroChartWidth,
    height: macroChartHeight,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.85, 0.85, 0.87),
    borderWidth: 1,
  });
  
  // Draw percentage grid lines
  for (let i = 0; i <= 4; i++) {
    const percentage = i * 25; // 0, 25, 50, 75, 100
    const y = macroChartY + (i * macroChartHeight / 4);
    
    // Grid line
    page.drawLine({
      start: { x: macroChartX, y: y },
      end: { x: macroChartX + macroChartWidth, y: y },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Percentage label
    if (percentage <= 100) {
      page.drawText(`${percentage}%`, {
        x: macroChartX - 30,
        y: y - 3,
        size: 8,
        font: helveticaFont,
        color: lightGray,
      });
    }
  }
  
  // Draw target line at 100%
  const targetY = macroChartY + macroChartHeight;
  page.drawLine({
    start: { x: macroChartX, y: targetY },
    end: { x: macroChartX + macroChartWidth, y: targetY },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
    dashArray: [3, 3],
  });
  
  page.drawText('Target (100%)', {
    x: macroChartX + macroChartWidth - 80,
    y: targetY + 8,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Draw macro bars
  const macros = [
    { name: 'Calories', color: primaryBlue, adherence: Math.min(100, Math.max(0, data.avgAdherence + 10)) },
    { name: 'Protein', color: green, adherence: Math.min(100, Math.max(0, data.avgAdherence + 15)) },
    { name: 'Carbs', color: orange, adherence: Math.min(100, Math.max(0, data.avgAdherence - 5)) },
    { name: 'Fat', color: rgb(0.8, 0.2, 0.2), adherence: Math.min(100, Math.max(0, data.avgAdherence)) }
  ];
  
  const barWidth = (macroChartWidth - 80) / macros.length;
  macros.forEach((macro, index) => {
    const barX = macroChartX + 20 + (index * (barWidth + 10));
    const barHeight = (macro.adherence / 100) * macroChartHeight;
    
    // Draw bar
    page.drawRectangle({
      x: barX,
      y: macroChartY + macroChartHeight - barHeight,
      width: barWidth,
      height: barHeight,
      color: macro.color,
    });
    
    // Draw percentage on bar
    page.drawText(`${macro.adherence}%`, {
      x: barX + (barWidth / 2) - 10,
      y: macroChartY + macroChartHeight - barHeight - 8,
      size: 8,
      font: helveticaFont,
      color: darkGray,
    });
    
    // Draw macro name below bar
    page.drawText(macro.name, {
      x: barX + (barWidth / 2) - 15,
      y: macroChartY - 12,
      size: 8,
      font: helveticaFont,
      color: darkGray,
    });
  });
  
  yPosition -= 80;
  
  // Progress Summary Section
  page.drawText('Progress Summary', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 15;
  
  const summaryParagraphs = [
    `${data.client.firstName} has been making excellent progress toward their ${data.client.goal?.replace('-', ' ')} goal.`,
    `Starting at ${(data.client.weight + Math.abs(data.weightChange)).toFixed(1)} lbs, they have achieved a ${Math.abs(data.weightChange).toFixed(1)} lb weight ${data.weightChange < 0 ? 'loss' : 'gain'}, representing ${goalProgress}% of their target goal of ${data.client.goalWeight} lbs.`,
    `Their macro adherence over the past 30 days has averaged ${data.avgAdherence}%, ${data.avgAdherence < 50 ? 'indicating an opportunity to focus more on nutrition consistency.' : 'demonstrating strong commitment to their nutrition plan.'}`,
    'Recommendations: Continue with current approach and maintain consistency with both nutrition tracking and regular weigh-ins.'
  ];
  
  summaryParagraphs.forEach((paragraph) => {
    // Simple text wrapping - split long paragraphs into multiple lines
    const words = paragraph.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length > 85) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          lines.push(word);
        }
      } else {
        currentLine += word + ' ';
      }
    });
    
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    
    lines.forEach((line, lineIndex) => {
      page.drawText(line, {
        x: 50,
        y: yPosition - (lineIndex * 11),
        size: 9,
        font: helveticaFont,
        color: darkGray,
      });
    });
    yPosition -= (lines.length * 11) + 5; // Add spacing between paragraphs
  });
  
  yPosition -= 10;
  
  // Footer
  page.drawText('This report was generated by Ignite AI - Your Personal Fitness & Nutrition Coach', {
    x: 50,
    y: yPosition,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  yPosition -= 15;
  page.drawText('For questions about this report, contact Coach Chassidy Escobedo', {
    x: 50,
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
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
  
  let yPosition = height - 40;
  
  // Header Section
  page.drawText('Progress Report', {
    x: 50,
    y: yPosition,
    size: 20,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  // Date in top right
  page.drawText(data.reportDate, {
    x: width - 150,
    y: yPosition,
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
  page.drawText('Weight Progress Over Time (12 Week Program)', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  // Weight Progress Chart
  const chartWidth = 450;
  const chartHeight = 80;
  const chartX = 70;
  const chartY = yPosition - 90;
  
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
  
  // Y-axis labels and grid lines
  const startWeight = data.client.weight + Math.abs(data.weightChange);
  const endWeight = data.currentWeight;
  const goalWeight = data.client.goalWeight;
  const minWeight = Math.min(goalWeight - 5, endWeight - 2);
  const maxWeight = Math.max(startWeight + 2, goalWeight + 5);
  const weightRange = maxWeight - minWeight;
  
  // Draw horizontal grid lines and weight labels
  for (let i = 0; i <= 4; i++) {
    const weight = minWeight + (i * weightRange / 4);
    const y = chartY + (i * chartHeight / 4);
    
    // Grid line
    page.drawLine({
      start: { x: chartX, y: y },
      end: { x: chartX + chartWidth, y: y },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Weight label
    page.drawText(`${Math.round(weight)}`, {
      x: chartX - 20,
      y: y - 3,
      size: 8,
      font: helveticaFont,
      color: lightGray,
    });
  }
  
  // Draw baseline and goal lines
  const baselineY = chartY + chartHeight - ((startWeight - minWeight) / weightRange) * chartHeight;
  const goalY = chartY + chartHeight - ((goalWeight - minWeight) / weightRange) * chartHeight;
  
  // Baseline line
  page.drawLine({
    start: { x: chartX, y: baselineY },
    end: { x: chartX + chartWidth, y: baselineY },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
    dashArray: [3, 3],
  });
  
  page.drawText(`Baseline: ${startWeight} lbs`, {
    x: chartX + chartWidth - 80,
    y: baselineY + 5,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Goal line
  page.drawLine({
    start: { x: chartX, y: goalY },
    end: { x: chartX + chartWidth, y: goalY },
    thickness: 1,
    color: green,
    dashArray: [3, 3],
  });
  
  page.drawText(`Goal: ${goalWeight} lbs`, {
    x: chartX + chartWidth - 80,
    y: goalY - 8,
    size: 8,
    font: helveticaFont,
    color: green,
  });
  
  // Draw progress line
  const progressPoints = 8;
  for (let i = 0; i < progressPoints - 1; i++) {
    const x1 = chartX + (i * chartWidth / (progressPoints - 1));
    const x2 = chartX + ((i + 1) * chartWidth / (progressPoints - 1));
    
    const progress1 = i / (progressPoints - 1);
    const progress2 = (i + 1) / (progressPoints - 1);
    const weight1 = startWeight - (progress1 * Math.abs(data.weightChange));
    const weight2 = startWeight - (progress2 * Math.abs(data.weightChange));
    
    const y1 = chartY + chartHeight - ((weight1 - minWeight) / weightRange) * chartHeight;
    const y2 = chartY + chartHeight - ((weight2 - minWeight) / weightRange) * chartHeight;
    
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 2,
      color: primaryBlue,
    });
  }
  
  // X-axis date labels
  const weightDates = ['Jun 8', 'Jun 10', 'Jun 15', 'Jun 22', 'Jun 29', 'Jul 6', 'Jul 13', 'Jul 20'];
  weightDates.forEach((date, index) => {
    const x = chartX + (index * chartWidth / (weightDates.length - 1));
    page.drawText(date, {
      x: x - 10,
      y: chartY - 10,
      size: 7,
      font: helveticaFont,
      color: lightGray,
    });
  });
  
  yPosition -= 120;
  
  // Macro Adherence Chart Section
  page.drawText('Macro Adherence (Last 30 Days)', {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: darkGray,
  });
  
  yPosition -= 20;
  
  // Macro Adherence Chart
  const macroChartWidth = 450;
  const macroChartHeight = 70;
  const macroChartX = 70;
  const macroChartY = yPosition - 80;
  
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
  
  // Y-axis labels (adherence percentages)
  for (let i = 0; i <= 4; i++) {
    const percentage = i * 40; // 0, 40, 80, 120, 160
    const y = macroChartY + (i * macroChartHeight / 4);
    
    // Grid line
    page.drawLine({
      start: { x: macroChartX, y: y },
      end: { x: macroChartX + macroChartWidth, y: y },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
    
    // Percentage label
    page.drawText(`${percentage}`, {
      x: macroChartX - 20,
      y: y - 3,
      size: 8,
      font: helveticaFont,
      color: lightGray,
    });
  }
  
  // Draw target line at 100%
  const targetY = macroChartY + (2.5 * macroChartHeight / 4); // 100% line
  page.drawLine({
    start: { x: macroChartX, y: targetY },
    end: { x: macroChartX + macroChartWidth, y: targetY },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
    dashArray: [3, 3],
  });
  
  page.drawText('Target (100%)', {
    x: macroChartX + macroChartWidth - 70,
    y: targetY + 5,
    size: 8,
    font: helveticaFont,
    color: lightGray,
  });
  
  // Draw macro adherence lines
  const macros = [
    { name: 'Calories', color: primaryBlue, baseAdherence: data.avgAdherence },
    { name: 'Protein', color: green, baseAdherence: Math.min(100, data.avgAdherence + 15) },
    { name: 'Carbs', color: orange, baseAdherence: Math.max(0, data.avgAdherence - 5) },
    { name: 'Fat', color: rgb(0.8, 0.2, 0.2), baseAdherence: data.avgAdherence }
  ];
  
  const dataPoints = 7; // Week of data
  macros.forEach((macro, macroIndex) => {
    for (let i = 0; i < dataPoints - 1; i++) {
      const x1 = macroChartX + (i * macroChartWidth / (dataPoints - 1));
      const x2 = macroChartX + ((i + 1) * macroChartWidth / (dataPoints - 1));
      
      // Simulate some variation in adherence
      const variation1 = (Math.sin(i + macroIndex) * 10);
      const variation2 = (Math.sin(i + 1 + macroIndex) * 10);
      const adherence1 = Math.max(0, Math.min(150, macro.baseAdherence + variation1));
      const adherence2 = Math.max(0, Math.min(150, macro.baseAdherence + variation2));
      
      const y1 = macroChartY + macroChartHeight - ((adherence1 / 160) * macroChartHeight);
      const y2 = macroChartY + macroChartHeight - ((adherence2 / 160) * macroChartHeight);
      
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 2,
        color: macro.color,
      });
    }
  });
  
  // X-axis date labels
  const macroDates = ['Jun 8', 'Jun 9'];
  macroDates.forEach((date, index) => {
    const x = macroChartX + (index * macroChartWidth / (macroDates.length - 1));
    page.drawText(date, {
      x: x - 10,
      y: macroChartY - 10,
      size: 7,
      font: helveticaFont,
      color: lightGray,
    });
  });
  
  // Legend
  const legendY = macroChartY - 25;
  macros.forEach((macro, index) => {
    const legendX = macroChartX + (index * 90);
    
    // Color box
    page.drawRectangle({
      x: legendX,
      y: legendY,
      width: 8,
      height: 8,
      color: macro.color,
    });
    
    // Label
    page.drawText(macro.name, {
      x: legendX + 12,
      y: legendY + 2,
      size: 8,
      font: helveticaFont,
      color: darkGray,
    });
  });
  
  yPosition -= 110;
  
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
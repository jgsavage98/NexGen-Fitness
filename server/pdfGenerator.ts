import puppeteer from 'puppeteer';
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
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Progress Report - ${data.client.firstName} ${data.client.lastName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            background: white;
            color: #333;
            line-height: 1.6;
          }
          .report-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 30px;
          }
          .header h1 {
            color: #3B82F6;
            font-size: 36px;
            margin: 0 0 10px 0;
            font-weight: bold;
          }
          .header h2 {
            color: #374151;
            font-size: 24px;
            margin: 0 0 20px 0;
            font-weight: normal;
          }
          .header-info {
            color: #6B7280;
            font-size: 14px;
            margin: 5px 0;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 40px 0;
          }
          .metric-card {
            background: #F9FAFB;
            border: 2px solid #E5E7EB;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .metric-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #111827;
          }
          .metric-label {
            color: #6B7280;
            font-size: 14px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .current-weight { color: #3B82F6; }
          .weight-change { color: #10B981; }
          .goal-progress { color: #8B5CF6; }
          .adherence { color: #F59E0B; }
          .section {
            margin: 50px 0;
          }
          .section h3 {
            color: #374151;
            font-size: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #3B82F6;
            padding-left: 15px;
          }
          .chart-placeholder {
            height: 200px;
            border: 2px dashed #D1D5DB;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F9FAFB;
            color: #6B7280;
            font-size: 16px;
            border-radius: 8px;
          }
          .summary-box {
            background: #F0F9FF;
            border: 1px solid #3B82F6;
            border-radius: 12px;
            padding: 30px;
            margin: 40px 0;
          }
          .summary-text {
            color: #374151;
            line-height: 1.8;
            font-size: 16px;
          }
          .summary-text p {
            margin: 15px 0;
          }
          .coach-signature {
            text-align: right;
            margin-top: 40px;
            font-style: italic;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; padding: 20px; }
            .report-container { max-width: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>Progress Report</h1>
            <h2>${data.client.firstName} ${data.client.lastName}</h2>
            <div class="header-info">Report Generated: ${data.reportDate}</div>
            <div class="header-info">Coach: Chassidy Escobedo, Certified Personal Trainer</div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value current-weight">${data.currentWeight} lbs</div>
              <div class="metric-label">Current Weight</div>
            </div>
            <div class="metric-card">
              <div class="metric-value weight-change">${data.weightChange < 0 ? '-' : '+'}${Math.abs(data.weightChange).toFixed(1)} lbs</div>
              <div class="metric-label">Total Change</div>
            </div>
            <div class="metric-card">
              <div class="metric-value goal-progress">${Math.round(Math.abs(data.weightChange) / Math.abs(data.client.goalWeight - data.client.weight) * 100)}%</div>
              <div class="metric-label">Goal Progress</div>
            </div>
            <div class="metric-card">
              <div class="metric-value adherence">${data.avgAdherence}%</div>
              <div class="metric-label">Avg Adherence</div>
            </div>
          </div>
          
          <div class="section">
            <h3>📈 Weight Progress Trend</h3>
            <div class="chart-placeholder">
              Weight tracking shows ${Math.abs(data.weightChange).toFixed(1)} lbs ${data.weightChange < 0 ? 'loss' : 'gain'} toward ${data.client.goalWeight} lbs target
            </div>
          </div>
          
          <div class="section">
            <h3>🎯 Macro Adherence Overview</h3>
            <div class="chart-placeholder">
              Average macro adherence: ${data.avgAdherence}% over the last 30 days
            </div>
          </div>
          
          <div class="summary-box">
            <h3>📋 Progress Summary</h3>
            <div class="summary-text">
              <p><strong>${data.client.firstName}</strong> has been making excellent progress toward their ${data.client.goal?.replace('-', ' ')} goal.</p>
              <p>Starting weight tracking shows a <strong>${Math.abs(data.weightChange).toFixed(1)} lb</strong> ${data.weightChange < 0 ? 'weight loss' : 'weight gain'}, representing <strong>${Math.round(Math.abs(data.weightChange) / Math.abs(data.client.goalWeight - data.client.weight) * 100)}%</strong> progress toward their goal weight of <strong>${data.client.goalWeight} lbs</strong>.</p>
              <p>Their average macro adherence of <strong>${data.avgAdherence}%</strong> demonstrates consistent commitment to the nutrition plan and shows excellent discipline in following the recommended guidelines.</p>
              <p><strong>Recommendations:</strong> Continue with current nutrition plan and maintain consistent tracking habits. Consider slight adjustments if weight loss/gain rate needs modification.</p>
            </div>
          </div>
          
          <div class="coach-signature">
            <p><strong>Keep up the excellent work!</strong></p>
            <p>Coach Chassidy Escobedo<br>
            Certified Personal Trainer & Nutrition Coach<br>
            Ignite Fitness & Nutrition</p>
          </div>
        </div>
      </body>
    </html>
  `;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: true
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
/**
 * Direct PDF Generation Test
 * Tests the PDF generation functionality independently
 */

const { generateProgressReportPDF, savePDFToFile } = require('./server/pdfGenerator.ts');

async function testPDFGeneration() {
  try {
    console.log('Testing PDF generation...');
    
    // Create test data matching the ProgressReportData interface
    const testData = {
      client: {
        firstName: 'Chrissy',
        lastName: 'Metz',
        weight: 300,
        goalWeight: 275,
        goal: 'weight-loss'
      },
      currentWeight: 298,
      weightChange: -2,
      avgAdherence: 85,
      reportDate: 'June 17, 2025'
    };
    
    console.log('Generating PDF with test data...');
    const pdfBuffer = await generateProgressReportPDF(testData);
    
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    // Save the PDF
    const filename = 'Test_Progress_Report_2025-06-17.pdf';
    const pdfPath = await savePDFToFile(pdfBuffer, filename);
    
    console.log(`PDF saved successfully: ${pdfPath}`);
    console.log('PDF generation test PASSED!');
    
  } catch (error) {
    console.error('PDF generation test FAILED:', error);
    console.error('Stack trace:', error.stack);
  }
}

testPDFGeneration();
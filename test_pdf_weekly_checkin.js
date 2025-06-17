/**
 * Test PDF Generation in Weekly Check-in System
 * Tests the new PDF progress report generation and attachment functionality
 */

async function testPDFWeeklyCheckin() {
  const BASE_URL = 'http://localhost:5000';
  
  try {
    console.log('🧪 Testing PDF generation in weekly check-in system...');
    
    // Test manual weekly check-in trigger for Chrissy (bypassing weekly limit for testing)
    const testResponse = await fetch(`${BASE_URL}/api/trainer/weekly-checkin/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer Y29hY2hfY2hhc3NpZHk6MTc1MDE2NjgxOTU5OQ=='
      },
      body: JSON.stringify({ 
        clientId: 'zlo8i80eycj',
        forceGenerate: true // Test parameter to bypass weekly limit
      })
    });
    
    const result = await testResponse.json();
    console.log('✅ Weekly check-in trigger response:', result);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if PDF file was generated
    const fs = require('fs');
    const path = require('path');
    
    // Look for generated PDF files
    const publicDir = path.join(process.cwd(), 'public');
    const files = fs.existsSync(publicDir) ? fs.readdirSync(publicDir) : [];
    const pdfFiles = files.filter(file => file.includes('Chrissy') && file.endsWith('.pdf'));
    
    console.log('📄 Generated PDF files:', pdfFiles);
    
    // Check recent individual chat messages for PDF attachment reference
    const chatResponse = await fetch(`${BASE_URL}/api/trainer/individual-chat-messages/zlo8i80eycj`, {
      headers: {
        'Authorization': 'Bearer Y29hY2hfY2hhc3NpZHk6MTc1MDE2NjgxOTU5OQ=='
      }
    });
    
    const chatData = await chatResponse.json();
    const recentMessages = chatData.slice(0, 3); // Check last 3 messages
    
    console.log('💬 Recent chat messages with PDF references:');
    recentMessages.forEach((msg, idx) => {
      if (msg.message && msg.message.includes('progress report')) {
        console.log(`${idx + 1}. ${msg.message.substring(0, 150)}...`);
        console.log(`   Metadata:`, msg.metadata);
      }
    });
    
    // Verify PDF attachment functionality
    const hasProgressReport = recentMessages.some(msg => 
      msg.message && msg.message.includes('progress report')
    );
    
    const hasPDFMetadata = recentMessages.some(msg => 
      msg.metadata && (msg.metadata.pdfReportPath || msg.metadata.pdfFilename)
    );
    
    console.log('\n📊 PDF Integration Test Results:');
    console.log('✓ Weekly check-in system active:', !!result.message);
    console.log('✓ PDF files generated:', pdfFiles.length > 0);
    console.log('✓ Progress report in message:', hasProgressReport);
    console.log('✓ PDF metadata stored:', hasPDFMetadata);
    
    if (pdfFiles.length > 0 && hasProgressReport) {
      console.log('🎉 PDF generation integration SUCCESSFUL!');
      console.log(`📄 Latest PDF: ${pdfFiles[pdfFiles.length - 1]}`);
    } else {
      console.log('❌ PDF generation integration needs attention');
    }
    
  } catch (error) {
    console.error('❌ PDF weekly check-in test failed:', error.message);
  }
}

// Run the test
testPDFWeeklyCheckin();
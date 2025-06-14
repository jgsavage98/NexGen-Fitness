import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the README.md file
const readmePath = path.join(__dirname, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// Create HTML version for easier viewing/printing
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Fitness Coaching App Documentation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; }
        code { 
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }
        .emoji { color: #3498db; }
        ul { padding-left: 20px; }
        li { margin-bottom: 5px; }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            font-style: italic;
            color: #666;
        }
        .feature-list {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
${readmeContent
  .replace(/^# /gm, '<h1>')
  .replace(/^## /gm, '</div><h2>')
  .replace(/^### /gm, '</div><h3>')
  .replace(/^\- \*\*/gm, '<li><strong>')
  .replace(/\*\* \- /g, '</strong> - ')
  .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/🚀|📱|🏗️|🛠️|🤖|🚦|📊|🔧|📈|🤝/g, '<span class="emoji">$&</span>')
  .replace(/\n\n/g, '</p><p>')
  .replace(/^(?!<[h|p|l|d|u])/gm, '<p>')
  .replace(/$(?![<\/])/gm, '</p>')
}
</body>
</html>`;

// Write HTML file
const htmlPath = path.join(__dirname, 'documentation.html');
fs.writeFileSync(htmlPath, htmlContent);

console.log('Documentation exported to:');
console.log('- README.md (Markdown format)');
console.log('- documentation.html (HTML format for browser viewing/printing)');
console.log('\nTo download:');
console.log('1. Right-click on either file in the file explorer');
console.log('2. Select "Download" to save to your computer');
console.log('3. The HTML version can be opened in any browser and printed to PDF');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'frontend/src/index.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Update CSS variables
content = content.replace(/background-color: #212A31;/g, 'background-color: #FFFAF3;');
content = content.replace(/color: #D3D9D4;/g, 'color: #3E362E;');

// Update glass classes
content = content.replace(/background: rgba\(62, 54, 46, 0\.45\);/g, 'background: rgba(255, 242, 219, 0.7);');
content = content.replace(/border: 1px solid rgba\(172, 137, 104, 0\.12\);/g, 'border: 1px solid rgba(255, 229, 191, 0.8);');

content = content.replace(/background: rgba\(26, 23, 20, 0\.85\);/g, 'background: rgba(255, 250, 243, 0.85);');
content = content.replace(/border-bottom: 1px solid rgba\(172, 137, 104, 0\.1\);/g, 'border-bottom: 1px solid rgba(255, 229, 191, 0.8);');

// hover glass
content = content.replace(/background: rgba\(62, 54, 46, 0\.7\);/g, 'background: rgba(255, 242, 219, 0.95);');
content = content.replace(/border-color: rgba\(134, 93, 54, 0\.3\);/g, 'border-color: rgba(255, 229, 191, 1);');
content = content.replace(/box-shadow: 0 12px 24px -10px rgba\(134, 93, 54, 0\.3\);/g, 'box-shadow: 0 12px 24px -10px rgba(255, 229, 191, 0.8);');

// Premium gradients
content = content.replace(/radial-gradient\(circle at top left, rgba\(134, 93, 54, 0\.12\), transparent 45%\)/g, 'radial-gradient(circle at top left, rgba(255, 229, 191, 0.6), transparent 45%)');
content = content.replace(/radial-gradient\(circle at bottom right, rgba\(172, 137, 104, 0\.1\), transparent 45%\)/g, 'radial-gradient(circle at bottom right, rgba(255, 242, 219, 0.8), transparent 45%)');
content = content.replace(/#212A31/g, '#FFFAF3'); // catch-all for bg in index.css

// Scrollbar
content = content.replace(/background: rgba\(26, 23, 20, 0\.5\);/g, 'background: rgba(255, 242, 219, 0.5);');
content = content.replace(/background: rgba\(134, 93, 54, 0\.25\);/g, 'background: rgba(255, 229, 191, 0.8);');
content = content.replace(/background: rgba\(134, 93, 54, 0\.45\);/g, 'background: rgba(255, 229, 191, 1);');

// Text gradients
content = content.replace(/background: linear-gradient\(135deg, #748D92 0%, #124E66 100%\);/g, 'background: linear-gradient(135deg, #A69080 0%, #3E362E 100%);');

// Specific animation colors
content = content.replace(/rgba\(134, 93, 54, /g, 'rgba(255, 229, 191, ');
content = content.replace(/rgba\(172, 137, 104, /g, 'rgba(255, 242, 219, ');

// Any other specific fixes for index.css colors if needed...

fs.writeFileSync(cssPath, content, 'utf8');
console.log('index.css updated successfully.');

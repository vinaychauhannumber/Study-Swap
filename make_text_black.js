const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

const replacements = [
  { regex: /text-\[#3E362E\]/g, replacement: 'text-black' },
  { regex: /text-\[#A69080\]/g, replacement: 'text-black/70' }, // muted text
  { regex: /color: #3E362E/g, replacement: 'color: black' },
  { regex: /fill-\[#3E362E\]/g, replacement: 'fill-black' },
  { regex: /from-\[#3E362E\]/g, replacement: 'from-black' },
  { regex: /bg-\[#3E362E\]/g, replacement: 'bg-black' },
  { regex: /border-\[#3E362E\]/g, replacement: 'border-black' },
  { regex: /shadow-\[#3E362E\]/g, replacement: 'shadow-black' },
  // specific index.css text gradients
  { regex: /#3E362E 100%/g, replacement: 'black 100%' },
  { regex: /#A69080 0%/g, replacement: 'rgba(0,0,0,0.7) 0%' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);

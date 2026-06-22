const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // Fix dark gradients
      content = content.replace(/bg-gradient-to-b from-\[#0f142b\] to-\[#070915\]/g, 'bg-[#FFF2DB]');
      content = content.replace(/bg-\[#0c1024\]\/80/g, 'bg-[#FFFAF3]');
      
      // Fix teal buttons
      content = content.replace(/bg-gradient-to-r from-black to-teal-600 hover:from-black hover:to-teal-500/g, 'bg-[#FFE5BF] hover:bg-[#FFE5BF]/80');
      
      // Fix typo
      content = content.replace(/text-black\/70\/80/g, 'text-black/70');

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed proposal box in', file);
      }
    }
  }
}

processDirectory(srcDir);

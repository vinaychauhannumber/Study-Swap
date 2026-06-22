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
      
      // Change bg-black to bg-[#FFE5BF]
      content = content.replace(/bg-black\/30/g, 'bg-[#FFE5BF]/30');
      content = content.replace(/bg-black\/60/g, 'bg-black/20'); // For modals overlay
      content = content.replace(/bg-black\/10/g, 'bg-[#FFE5BF]/50');
      content = content.replace(/bg-black/g, 'bg-[#FFE5BF]');
      
      // Change border-black to border-[#FFE5BF] if needed
      content = content.replace(/border-black\/30/g, 'border-[#FFE5BF]/80');

      // Specifically in BrowseTasks to remove opacity that hides text
      if (fullPath.endsWith('BrowseTasks.jsx')) {
        content = content.replace(/border-\[#FFE5BF\]\/40 opacity-60/g, 'border-[#FFE5BF]/80 bg-[#FFF2DB]/50');
        content = content.replace(/bg-\[#FFFAF3\]\/30/g, 'bg-[#FFFAF3]/40 backdrop-blur-[1px]');
        // Fix placeholder color
        content = content.replace(/placeholder="Search assignments, reports, graphic designs, slide topics..."/g, 'placeholder="Search assignments, reports, graphic designs, slide topics..." className="placeholder-black/40"');
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', file);
      }
    }
  }
}

processDirectory(srcDir);

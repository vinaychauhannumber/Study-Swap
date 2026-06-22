const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

const replacements = [
  { regex: /from-\[#124E66\]/g, replacement: 'from-[#3E362E]' },
  { regex: /hover:from-\[#124E66\]/g, replacement: 'hover:from-[#1A1714]' },
  { regex: /fill-\[#124E66\]/g, replacement: 'fill-[#3E362E]' },
  { regex: /fill-\[#748D92\]/g, replacement: 'fill-[#A69080]' },
  { regex: /bg-\[#748D92\]/g, replacement: 'bg-[#A69080]' },
  { regex: /text-\[#2E3944\]/g, replacement: 'text-[#FFE5BF]' },
  { regex: /text-\[#D3D9D4\]/g, replacement: 'text-[#3E362E]' }, // catch any remaining
  { regex: /text-white/g, replacement: 'text-[#3E362E]' }
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
      }
    }
  }
}

processDirectory(srcDir);
